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

// DatabaseStack owns the slow-moving infrastructure: the network (VPC) and the
// database (RDS). Isolating it from ServiceStack means iterating on the app
// does NOT rebuild the database (RDS takes ~5-10 min to create/destroy).
export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecret: secretsmanager.ISecret;

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
      deletionProtection: false,
      // DEV ONLY: `cdk destroy` will delete the database AND all its data.
      // Change to RemovalPolicy.SNAPSHOT (or RETAIN) before this is real.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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
    // Deletion protection off + DESTROY removal policy: DEV SANDBOX ONLY, so
    // `cdk destroy` can tear the stack down. Flip both (and add stack
    // terminationProtection) before this is real production.
    acknowledge(db, 'AwsSolutions-RDS10',
      'DEV ONLY: deletion protection intentionally off so cdk destroy can tear down the sandbox. Re-enable deletionProtection, switch removalPolicy to SNAPSHOT, and set stack terminationProtection before production.');
    // Default port 3306: the DB is private (isolated subnet, not publicly
    // reachable) and gated by a SG ingress from the ECS tasks only, so changing
    // the port would be security-through-obscurity with no real benefit.
    acknowledge(db, 'AwsSolutions-RDS11',
      'RDS is private (isolated subnet, not publicly accessible) and reachable only via a security-group ingress from the ECS tasks. A non-default port would be security-through-obscurity only; access is already network-restricted.');

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