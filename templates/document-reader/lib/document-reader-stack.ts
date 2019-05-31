import cdk = require('@aws-cdk/cdk');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");

import { ProducerConsumerStack, ProducerConsumerStackProps } from "../../producer-consumer/lib/producer-consumer-stack";

import { AttributeType } from '@aws-cdk/aws-dynamodb';
import { PolicyStatementEffect } from '@aws-cdk/aws-iam';

interface DocumentReaderStackProps extends ProducerConsumerStackProps {
  readCapacity: number;
  writeCapacity: number;
  partitionKey: string;
}

export interface DocumentReaderStack extends ProducerConsumerStack {
  parsedDocument: dynamodb.Table;
  workerLambda: lambda.Function;
}

export class DocumentReaderStack extends ProducerConsumerStack {
  constructor(scope: cdk.Construct, id: string, props: DocumentReaderStackProps) {
    super(scope, id, props);

    // create tables for images, text and registration references
    this.parsedDocument = new dynamodb.Table(this, props.stage.toString() + '-parsed-document', {
      readCapacity: props.readCapacity,
      writeCapacity: props.writeCapacity,
      partitionKey: {
        name: props.partitionKey,
        type: AttributeType.String
      }
    })

    // create lambda policy statement for operating over s3
    var lambdaS3PolicyStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    lambdaS3PolicyStatement.addActions(
      's3:PutObject',
      's3:GetObject'
    )
    lambdaS3PolicyStatement.addResources(
      this.contentBucket.bucketArn + "/*"
    );

    // create lambda policy statement for rekognition
    var lambdaRekognitionPolicyStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    lambdaRekognitionPolicyStatement.addActions(
      'rekognition:DetectText',
    )
    lambdaRekognitionPolicyStatement.addResources(
      "*"
    );

    // create lambda policy statement for polly
    var lambdaPollyPolicyStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    lambdaPollyPolicyStatement.addActions(
      'polly:SynthesizeSpeech',
    )
    lambdaPollyPolicyStatement.addResources(
      "*"
    );

    // create lambda policy statement for dynamo
    var lambdaDynamoPolicyStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    lambdaDynamoPolicyStatement.addActions(
      'dynamodb:PutItem',
      'dynamodb:GetItem',
      'dynamodb:DescribeTable'
    )
    lambdaDynamoPolicyStatement.addResources(
      this.parsedDocument.tableArn
    );

    // create lambda policy statement for sqs notification
    var lambdaSQSStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    lambdaSQSStatement.addActions(
      "sqs:ChangeMessageVisibility",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage",
    )
    lambdaSQSStatement.addResources(
      this.sqsQueue.queueArn
    );

    // create worker lambda
    this.workerLambda = new lambda.Function(this, props.stage.toString() + "-worker-lambda", {
      runtime: lambda.Runtime.NodeJS810,
      handler: 'index.handler',
      code: lambda.Code.asset("/Users/matteo/immutable.templates/templates/document-reader/lib/worker-lambda"),
      timeout: 60,
      environment: {
        "DYNAMO_TABLE": this.parsedDocument.tableName,
        "CONTENT_BUCKET": this.contentBucket.bucketName
      },
      initialPolicy: [
        lambdaS3PolicyStatement,
        lambdaRekognitionPolicyStatement,
        lambdaPollyPolicyStatement,
        lambdaDynamoPolicyStatement,
        lambdaSQSStatement
      ]
    })

    // create event source
    new lambda.EventSourceMapping(this, props.stage.toString() + "-worker-lambda-source", {
      eventSourceArn: this.sqsQueue.queueArn,
      target: this.workerLambda,
    });

    // // create sqs policy statement to allow lambda delete of the message
    // var s3SQSStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    // s3SQSStatement.addActions(
    //   "sqs:DeleteMessage",
    // )
    // s3SQSStatement.addResources(
    //   this.sqsQueue.queueArn
    // );
    // s3SQSStatement.addAnyPrincipal()
    // s3SQSStatement.addCondition("ArnLike", { "aws:SourceArn": this.workerLambda.functionArn })

  }
}