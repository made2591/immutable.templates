import cdk = require('@aws-cdk/cdk');

import apigateway = require('@aws-cdk/aws-apigateway');
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");

import { Stage } from '../lib/stage-env/stage-env';

import { BucketEncryption } from "@aws-cdk/aws-s3";
import { PolicyStatementEffect } from '@aws-cdk/aws-iam';

interface UploadFormStackProps extends cdk.StackProps {
  stage: Stage;
}

export interface UploadFormStack extends cdk.Stack {
  uploadApiAuthorizer: apigateway.RestApi;
  contentBucketRef: s3.BucketProps;
  s3AuthLambda: lambda.Function;
}

export class UploadFormStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: UploadFormStackProps) {
    super(scope, id, props);

    // create content s3 bucket
    const contentBucket = new s3.Bucket(this, props.stage.toString() + "-logging", {
      encryption: BucketEncryption.S3Managed,
      publicReadAccess: false
    })
    this.contentBucketRef = contentBucket.export();

    // create lambda policy statement for s3
    var lambdaS3PolicyStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    lambdaS3PolicyStatement.addActions(
      's3:PutObject'
    )
    lambdaS3PolicyStatement.addResources(
      contentBucket.bucketArn + "/*"
    );

    // create s3 authorizer lambda
    this.s3AuthLambda = new lambda.Function(this, props.stage.toString() + "-s3-auth", {
      runtime: lambda.Runtime.NodeJS810,
      handler: 'index.handler',
      code: lambda.Code.asset("lib/s3-authorizer"),
      environment: {
        "S3_BUCKET": contentBucket.bucketName,
      },
      initialPolicy: [lambdaS3PolicyStatement]
    })

    // give to apigateway permission to invoke the lambda
    new lambda.CfnPermission(this, props.stage.toString() + "-apigtw-lambda-permission", {
      functionName: this.s3AuthLambda.functionArn,
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com"
    })

    // defines an API Gateway REST API resource backed by our s3 uploader function.
    this.uploadApiAuthorizer = new apigateway.LambdaRestApi(this, props.stage.toString() + "-apigtw", {
      handler: this.s3AuthLambda
    });

  }
}
