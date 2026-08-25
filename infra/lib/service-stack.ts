import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import { Construct } from 'constructs';

// cdk-nag (AwsSolutionsChecks) reports best-practice findings as ERRORS that
// block `cdk synth`. `cdk.Validations.of(<construct>).acknowledge(...)` records a
// documented, audited suppression for one rule on that construct (and its
// children). We ONLY acknowledge findings that are intentional for this 1-2 user
// research app, with the reason inline. Real gaps get fixed in code instead.
function acknowledge(scope: Construct, id: string, reason: string) {
  cdk.Validations.of(scope).acknowledge({ id, reason });
}

interface ServiceStackProps extends cdk.StackProps {
  /** VPC created by DatabaseStack (tasks + ALB live in its public subnets). */
  readonly vpc: ec2.IVpc;
  /** DB security group from DatabaseStack; we add an ingress rule from our tasks. */
  readonly dbSecurityGroup: ec2.ISecurityGroup;
  /** RDS generated secret (username/password/host/port) from DatabaseStack. */
  readonly dbSecret: secretsmanager.ISecret;
  // App secrets are owned by DatabaseStack (the data vault) so they survive
  // destroy/pause of this compute stack. ServiceStack only reads them.
  readonly jwtSecret: secretsmanager.ISecret;
  readonly fitbitClientId: secretsmanager.ISecret;
  readonly fitbitClientSecret: secretsmanager.ISecret;
  readonly omronClientId: secretsmanager.ISecret;
  readonly omronClientSecret: secretsmanager.ISecret;
  readonly redirectUri: secretsmanager.ISecret;
  readonly baseUrl: secretsmanager.ISecret;
  readonly frontendUrl: secretsmanager.ISecret;
}

// ServiceStack owns the fast-moving, STATELESS infrastructure: the container
// image, the compute that runs it, the load balancer, the HTTPS edge, and the
// IAM wiring. It holds NO data - so it can be destroyed/paused freely while the
// DatabaseStack (data + secrets) stays alive. Every code change to the Express
// app redeploys through here.
export class ServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    // ---- B4: ECR + ECS + Fargate (compute) ----
    // fromAsset builds the Dockerfile at <repo>/backend and pushes the image to
    // an ECR repo that CDK manages. No manual `docker build`/`push` required.
    const appImage = ecs.ContainerImage.fromAsset(
      path.resolve(__dirname, '../../backend')
    );

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      // CloudWatch Container Insights v2: cheap at this scale, useful for
      // debugging ECS task health. Also satisfies cdk-nag AwsSolutions-ECS4.
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // Task security group: inbound only from the ALB (port 3000); outbound to
    // the internet (Fitbit/Omron OAuth + token APIs) via the task's public IP.
    const taskSg = new ec2.SecurityGroup(this, 'TaskSg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    // ONLY the app tasks may reach RDS on port 3306. This ingress rule lives in
    // THIS stack (ServiceStack) and references the DB SG (in DatabaseStack) plus
    // the task SG (local) in ONE direction only. If we instead called
    // dbSecurityGroup.connections.allowFrom(taskSg), the rule would land in
    // DatabaseStack and reference the task SG from ServiceStack, creating a
    // cross-stack dependency cycle (DatabaseStack -> ServiceStack -> DatabaseStack).
    new ec2.CfnSecurityGroupIngress(this, 'DbIngressFromTasks', {
      ipProtocol: 'tcp',
      fromPort: 3306,
      toPort: 3306,
      groupId: props.dbSecurityGroup.securityGroupId,
      sourceSecurityGroupId: taskSg.securityGroupId,
    });

    // ---- App secrets come from DatabaseStack (the data vault) ----
    // They are created in DatabaseStack so destroying THIS compute stack keeps
    // them (no re-entering OAuth credentials on pause/resume). See the container
    // `secrets:` mapping below for how they're injected into the task.

    // Smallest Fargate task: 0.25 vCPU / 0.5 GB. Fine for 1-2 users.
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    // Plain env vars + secrets injected from Secrets Manager. CDK automatically
    // grants the task execution role permission to read each secret.
    const container = taskDef.addContainer('App', {
      image: appImage,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'app' }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        DB_NAME: 'mhearts',
        DB_SSL: 'true', // db.js enables verified TLS against the shipped RDS CA bundle
      },
      secrets: {
        DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
        DB_USER: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
        DB_HOST: ecs.Secret.fromSecretsManager(props.dbSecret, 'host'),
        DB_PORT: ecs.Secret.fromSecretsManager(props.dbSecret, 'port'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(props.jwtSecret),
        FITBIT_CLIENT_ID: ecs.Secret.fromSecretsManager(props.fitbitClientId),
        FITBIT_CLIENT_SECRET: ecs.Secret.fromSecretsManager(props.fitbitClientSecret),
        OMRON_CLIENT_ID: ecs.Secret.fromSecretsManager(props.omronClientId),
        OMRON_CLIENT_SECRET: ecs.Secret.fromSecretsManager(props.omronClientSecret),
        REDIRECT_URI: ecs.Secret.fromSecretsManager(props.redirectUri),
        BASE_URL: ecs.Secret.fromSecretsManager(props.baseUrl),
        FRONTEND_URL: ecs.Secret.fromSecretsManager(props.frontendUrl),
      },
    });
    container.addPortMappings({ containerPort: 3000 });

    // One task, in a public subnet, with a public IP for outbound (no NAT).
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [taskSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      // Roll back quickly if a new task fails to start (default would hang ~3h).
      circuitBreaker: { rollback: true },
    });

    // Keep at least 1 task healthy during deploys (desiredCount=1), so a rolling
    // deployment never drops capacity to zero. Fixes the cdk-nag/CDK
    // minHealthyPercent warning via the L1 escape hatch.
    const cfnService = service.node.defaultChild as ecs.CfnService;
    cfnService.addPropertyOverride('DeploymentConfiguration.MinimumHealthyPercent', 100);
    cfnService.addPropertyOverride('DeploymentConfiguration.MaximumPercent', 200);

    // Plain env vars (NODE_ENV, PORT, DB_NAME, DB_SSL) are non-sensitive config;
    // all sensitive values come from Secrets Manager. Acknowledged, not a leak.
    acknowledge(taskDef, 'AwsSolutions-ECS2',
      'Directly-specified env vars (NODE_ENV, PORT, DB_NAME, DB_SSL) are non-sensitive configuration. All sensitive values (DB credentials, JWT secret, OAuth secrets) are injected from Secrets Manager.');
    // The execution role's policy includes a Resource::* wildcard. This is
    // required by AWS for ecr:GetAuthorizationToken (must be on Resource '*')
    // and is generated by CDK's grant-based least-privilege for ECR pull +
    // Secrets Manager read. Scoped by CDK, not a broad credential.
    acknowledge(taskDef, 'AwsSolutions-IAM5[Resource::*]',
      'Wildcard is required by AWS for ecr:GetAuthorizationToken (Resource ::*) and is produced by CDK grant-based least-privilege for ECR pull + Secrets Manager read. Not a broad permission.');

    // ---- B5: ALB (load balancer) ----
    const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    // Lock the ALB down so ONLY CloudFront can reach it on port 80. We use the
    // AWS-managed CloudFront prefix list (com.amazonaws.global.cloudfront.
    // origin-facing), which AWS keeps current as CloudFront's egress IP ranges
    // change. This stops anyone from bypassing CloudFront (HTTPS, WAF, etc.) and
    // hitting the ALB directly over plain HTTP. `fromLookup` resolves the
    // prefix list's region-specific ID at synth time and caches it in
    // cdk.context.json (requires AWS credentials on the first synth).
    const cloudfrontPrefixList = ec2.PrefixList.fromLookup(this, 'CloudFrontPrefixList', {
      prefixListName: 'com.amazonaws.global.cloudfront.origin-facing',
    });
    albSg.addIngressRule(
      ec2.Peer.prefixList(cloudfrontPrefixList.prefixListId),
      ec2.Port.tcp(80),
      'Allow HTTP from CloudFront only',
    );

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: albSg,
    });
    // ALB access logs to S3 deferred (Phase C) for this research deployment.
    acknowledge(alb, 'AwsSolutions-ELB2',
      'ALB access logging to S3 is deferred (Phase C) for this 1-2 user research deployment; enable with a logging bucket when operational access visibility is needed.');

    // Let the ALB reach the tasks on the app port.
    taskSg.connections.allowFrom(
      albSg,
      ec2.Port.tcp(3000),
      'Allow ALB to reach ECS tasks',
    );

    const listener = alb.addListener('HttpListener', { port: 80, open: false });
    listener.addTargets('AppTarget', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // ---- B6: CloudFront (HTTPS edge) ----
    // CloudFront terminates HTTPS on its *.cloudfront.net URL (free, no domain
    // needed) and forwards to the ALB over HTTP. No caching + forward all viewer
    // headers/cookies/query so Authorization + cookies reach the app correctly.
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(alb, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
      // NOTE on TLS (cdk-nag AwsSolutions-CFR4): the AwsSolutions pack considers
      // ANY distribution using the default CloudFront certificate non-compliant,
      // regardless of MinimumProtocolVersion (AWS fixes the default cert at TLSv1
      // and ignores MinimumProtocolVersion without a custom certificate). The only
      // way to fully satisfy CFR4 is a custom ACM certificate + custom domain,
      // which we intentionally skipped ("no domain needed"). CloudFront's default
      // cert negotiates TLSv1.2+ with real viewers. Acknowledged below as an
      // accepted tradeoff of the no-domain design.
      enabled: true,
    });
    acknowledge(distribution, 'AwsSolutions-CFR4',
      'Using the default CloudFront certificate (no custom domain, per the chosen design). The AwsSolutions CFR4 rule marks any default-cert distribution non-compliant regardless of MinimumProtocolVersion; the only remedy is a custom ACM certificate + custom domain. CloudFront negotiates TLSv1.2+ with viewers in practice. Revisit if a custom domain is added.');
    // Advisory warnings (cdk-nag WARN level): neither geo restriction nor WAF is
    // warranted for a 1-2 user research API. Acknowledged with that rationale.
    acknowledge(distribution, 'AwsSolutions-CFR1',
      'No geo restrictions needed for a 1-2 user research deployment with a known small user base.');
    acknowledge(distribution, 'AwsSolutions-CFR2',
      'WAF not required for a 1-2 user research API behind JWT auth; revisit if exposed to broader public traffic.');
    // CloudFront access logging to S3 deferred (Phase C).
    acknowledge(distribution, 'AwsSolutions-CFR3',
      'CloudFront access logging to S3 is deferred (Phase C) for this 1-2 user research deployment; enable with a logging bucket when edge access visibility is needed.');
    // The origin is HTTP_ONLY (CloudFront -> ALB over HTTP within AWS), so no TLS
    // is negotiated to the origin. The SSLv3/TLSv1 origin-cipher check (CFR5)
    // does not apply to an HTTP-only origin.
    acknowledge(distribution, 'AwsSolutions-CFR5',
      'Origin uses HTTP_ONLY (CloudFront to ALB over HTTP within AWS); no TLS is negotiated to the origin, so the SSLv3/TLSv1 origin cipher check does not apply.');

    // ---- B7 (part 2): outputs ----
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Public HTTPS URL - use as the OAuth redirect URI base',
    });
    new cdk.CfnOutput(this, 'AlbDns', {
      value: alb.loadBalancerDnsName,
      description: 'ALB DNS (CloudFront origin)',
    });
  }
}