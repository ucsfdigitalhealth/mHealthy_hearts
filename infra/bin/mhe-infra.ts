#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Validations } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { DatabaseStack } from '../lib/database-stack';
import { ServiceStack } from '../lib/service-stack';

// Entry point of the CDK app. `cdk synth` / `cdk deploy` run this file, which
// builds the tree of stacks that CDK then turns into CloudFormation.
const app = new cdk.App();

// Run the AWS Solutions best-practices pack so `cdk synth` reports any standards
// violations (encryption, IAM, secrets, etc.) as annotations.
Validations.of(app).addPlugins(new AwsSolutionsChecks(app));

// `env` tells CDK which AWS account + region to deploy into.
// CDK_DEFAULT_ACCOUNT / CDK_DEFAULT_REGION are injected automatically by the
// CDK CLI from your AWS credentials, so you never hardcode account numbers here.
// During `cdk synth` without credentials these are undefined, which is fine for
// synthesizing the template (Phase B). Real values come at deploy time (Phase C).
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// DatabaseStack creates the VPC + RDS first; ServiceStack runs tasks inside that
// VPC and reaches the RDS, so it consumes the resources DatabaseStack exposes.
const databaseStack = new DatabaseStack(app, 'MheDatabaseStack', { env });

new ServiceStack(app, 'MheServiceStack', {
  env,
  vpc: databaseStack.vpc,
  dbSecurityGroup: databaseStack.dbSecurityGroup,
  dbSecret: databaseStack.dbSecret,
});