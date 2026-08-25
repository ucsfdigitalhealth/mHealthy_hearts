import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

// cdk-nag (AwsSolutionsChecks) reports best-practice findings as ERRORS that
// block `cdk synth`. `cdk.Validations.of(<construct>).acknowledge(...)` records a
// documented, audited suppression for one rule on that construct (and its
// children). We ONLY acknowledge findings that are intentional for this 1-2 user
// research app, with the reason inline. Real gaps get fixed in code instead.
function acknowledge(scope: Construct, id: string, reason: string) {
  cdk.Validations.of(scope).acknowledge({ id, reason });
}

// DatabaseStack is the protected "data vault": the network (VPC), the database
// (RDS), and the app secrets. It is intentionally separated from ServiceStack
// (the compute) so you can pause/destroy the compute anytime WITHOUT touching
// the data or the secrets. terminationProtection (set in bin/mhe-infra.ts) +
// RDS deletionProtection + removalPolicy SNAPSHOT make destroying this vault a
// deliberate, multi-step act that still leaves a final snapshot.
export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecret: secretsmanager.ISecret;
  // App secrets live in the vault so destroying compute (ServiceStack) keeps
  // them - no re-entering Fitbit/Omron credentials every time you pause.
  public readonly jwtSecret: secretsmanager.ISecret;
  public readonly fitbitClientId: secretsmanager.ISecret;
  public readonly fitbitClientSecret: secretsmanager.ISecret;
  public readonly omronClientId: secretsmanager.ISecret;
  public readonly omronClientSecret: secretsmanager.ISecret;
  public readonly redirectUri: secretsmanager.ISecret;
  // Public, non-secret URLs that are only known after the first deploy (the
  // CloudFront domain is generated at deploy time). Stored as secrets so the
  // value never has to be hardcoded into the CDK template/git, and so a compute
  // pause/destroy keeps them (same vault benefit as the OAuth credentials).
  public readonly baseUrl: secretsmanager.ISecret;
  public readonly frontendUrl: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---- B2: VPC (the network) ----
    // Two availability zones (AZs). Two kinds of subnet:
    //   - PUBLIC:           has a route to the internet (via the internet gateway).
    //                       The ALB and the Fargate tasks live here.
    //   - PRIVATE_ISOLATED: NO route to the internet at all. RDS lives here, so it
    //                       cannot be reached from the outside world.
    // natGateways: 0 -> no NAT gateway ($0 spent on it). Tasks get a public IP for
    // any outbound calls (Fitbit/Omron) instead.
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // VPC Flow Logs -> CloudWatch Logs. Cheap at this traffic level (1-2 users)
    // and gives network-traffic visibility for security/operational debugging.
    // Also satisfies cdk-nag AwsSolutions-VPC7.
    this.vpc.addFlowLog('FlowLog', {
      trafficType: ec2.FlowLogTrafficType.ALL,
    });

    // ---- B3: RDS MySQL (the database) ----
    // Security group for the DB. The ingress rule (port 3306) is added from
    // ServiceStack's task security group, so ONLY the app tasks can reach it.
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSg', {
      vpc: this.vpc,
      description: 'RDS MySQL - ingress only from ECS tasks',
    });

    // Smallest/cheapest managed MySQL: t4g.micro (Graviton), single-AZ, 20GB.
    const db = new rds.DatabaseInstance(this, 'Db', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_46,
      }),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      multiAz: false,
      publiclyAccessible: false,
      storageEncrypted: true,
      credentials: rds.Credentials.fromGeneratedSecret('app_user'), // secret -> Secrets Manager
      databaseName: 'mhearts',
      securityGroups: [this.dbSecurityGroup],
      // Data-vault protections: the DB cannot be deleted by accident.
      //  - deletionProtection: CloudFormation refuses to destroy it until you
      //    explicitly flip this to false. Combined with stack
      //    terminationProtection (set in bin/mhe-infra.ts), destroying the data
      //    layer is a deliberate, multi-step act.
      //  - removalPolicy SNAPSHOT: when you DO intentionally destroy it, AWS
      //    takes a final snapshot first, so the data survives in a snapshot.
      //  - backupRetention: 7 days of automated backups + point-in-time restore
      //    for in-window recovery (e.g. an accidentally deleted row).
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      backupRetention: cdk.Duration.days(7),
    });

    // The generated secret holds username/password/host/port as JSON in Secrets
    // Manager. ServiceStack injects each field into the task as an env var.
    this.dbSecret = db.secret!;
    this.dbSecret.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // ---- cdk-nag acknowledgments (intentional for this research deployment) ----
    // DB credentials: no automatic rotation yet. Acknowledged on the DB instance
    // (ancestor of the generated secret) since db.secret is an ISecret reference.
    acknowledge(db, 'AwsSolutions-SMG4',
      'Generated DB credentials; automatic rotation (RDS Lambda rotator) is a Phase C follow-up, not blocking for a 1-2 user research deployment.');
    // Single-AZ: intentional cost tradeoff. Multi-AZ roughly doubles DB cost.
    acknowledge(db, 'AwsSolutions-RDS3',
      'Single-AZ is an intentional cost tradeoff for a 1-2 user research app. Enable Multi-AZ as a reliability follow-up before production.');
    // Default port 3306: the DB is private (isolated subnet, not publicly
    // reachable) and gated by a SG ingress from the ECS tasks only, so changing
    // the port would be security-through-obscurity with no real benefit.
    acknowledge(db, 'AwsSolutions-RDS11',
      'RDS is private (isolated subnet, not publicly accessible) and reachable only via a security-group ingress from the ECS tasks. A non-default port would be security-through-obscurity only; access is already network-restricted.');

    // ---- App secrets (in the vault, so destroying compute keeps them) ----
    // These live HERE, not in ServiceStack, so `cdk destroy` of the compute stack
    // leaves them intact - you don't re-enter the Fitbit/Omron credentials every
    // time you pause. JWT_SECRET is auto-generated; the OAuth credentials and
    // REDIRECT_URI are created EMPTY and filled in the Secrets Manager console
    // after the first deploy. removalPolicy DESTROY means a FULL teardown
    // (destroying THIS vault stack) loses them and you re-enter on restore.
    this.jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      generateSecretString: { excludePunctuation: true, passwordLength: 64 },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.fitbitClientId = new secretsmanager.Secret(this, 'FitbitClientId', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.fitbitClientSecret = new secretsmanager.Secret(this, 'FitbitClientSecret', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.omronClientId = new secretsmanager.Secret(this, 'OmronClientId', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.omronClientSecret = new secretsmanager.Secret(this, 'OmronClientSecret', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.redirectUri = new secretsmanager.Secret(this, 'RedirectUri', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // BASE_URL: the public CloudFront URL. The Fitbit OAuth flow builds its
    // redirect URI from this (`${BASE_URL}/api/fitbitAuth/fitbit/callback`).
    // FRONTEND_URL: the React Native app's origin, used for CORS. Both are
    // created EMPTY and filled in the Secrets Manager console after the first
    // deploy, once the CloudFront domain is known.
    this.baseUrl = new secretsmanager.Secret(this, 'BaseUrl', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.frontendUrl = new secretsmanager.Secret(this, 'FrontendUrl', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // cdk-nag flags every secret without automatic rotation (AwsSolutions-SMG4).
    // None of these are suitable for AWS automatic rotation:
    //   - JWT_SECRET: rotating it would invalidate every outstanding token.
    //   - OAuth client id: a public identifier, not a secret.
    //   - OAuth client secrets: rotation is governed by Fitbit/Omron, not AWS.
    //   - REDIRECT_URI: a URI string, not a credential.
    acknowledge(this.jwtSecret, 'AwsSolutions-SMG4',
      'JWT signing secret; automatic rotation would invalidate all outstanding tokens. Rotated manually on demand.');
    acknowledge(this.fitbitClientId, 'AwsSolutions-SMG4',
      'Fitbit OAuth client identifier (public, non-secret). Not an automatic-rotation candidate.');
    acknowledge(this.fitbitClientSecret, 'AwsSolutions-SMG4',
      'Fitbit OAuth client secret; rotation is governed by the Fitbit developer portal, not AWS automatic rotation.');
    acknowledge(this.omronClientId, 'AwsSolutions-SMG4',
      'Omron OAuth client identifier (public, non-secret). Not an automatic-rotation candidate.');
    acknowledge(this.omronClientSecret, 'AwsSolutions-SMG4',
      'Omron OAuth client secret; rotation is governed by the Omron developer portal, not AWS automatic rotation.');
    acknowledge(this.redirectUri, 'AwsSolutions-SMG4',
      'A redirect URI string, not a credential; rotation does not apply.');
    acknowledge(this.baseUrl, 'AwsSolutions-SMG4',
      'A public URL string (CloudFront domain), not a credential; rotation does not apply.');
    acknowledge(this.frontendUrl, 'AwsSolutions-SMG4',
      'A public URL string (frontend origin for CORS), not a credential; rotation does not apply.');

    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: db.dbInstanceEndpointAddress,
      description: 'RDS MySQL endpoint (private, inside the VPC)',
    });
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'Secrets Manager secret with the DB credentials',
    });
  }
}