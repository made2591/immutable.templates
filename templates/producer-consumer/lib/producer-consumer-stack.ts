import cdk = require('@aws-cdk/cdk');
import cloudtrail = require('@aws-cdk/aws-cloudtrail');
import iam = require('@aws-cdk/aws-iam');
import sqs = require('@aws-cdk/aws-sqs');

import { UploadFormStack, UploadFormStackProps } from "../../upload-form/lib/upload-form-stack";
import { PolicyStatementEffect } from '@aws-cdk/aws-iam';
import { ReadWriteType } from '@aws-cdk/aws-cloudtrail';

export interface ProducerConsumerStackProps extends UploadFormStackProps {
}

export interface ProducerConsumerStack extends UploadFormStack {
  sqsQueue: sqs.Queue
}

export class ProducerConsumerStack extends UploadFormStack {
  constructor(scope: cdk.Construct, id: string, props: ProducerConsumerStackProps) {
    super(scope, id, props);

    // create trail to enable events on s3
    const trail = new cloudtrail.Trail(this, props.stage.toString() + 'content-bucket-trail');
    trail.addS3EventSelector([this.contentBucket.bucketArn + "/"], {
      includeManagementEvents: false,
      readWriteType: ReadWriteType.All,
    });

    // create sqs queue
    this.sqsQueue = new sqs.Queue(this, props.stage.toString() + "-sqs-content-queue", {
      retentionPeriodSec: 1209600,
      visibilityTimeoutSec: 360,
      deadLetterQueue: {
        queue: new sqs.Queue(this, props.stage.toString() + "-sqs-dead-queue", {
          retentionPeriodSec: 1209600
        }),
        maxReceiveCount: 5
      }
    });

    // create sqs policy statement to allow cloudwatch pushing the message
    var s3SQSStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    s3SQSStatement.addActions(
      "sqs:SendMessage",
      "sqs:SendMessageBatch",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
    )
    s3SQSStatement.addResources(
      this.sqsQueue.queueArn
    );
    s3SQSStatement.addAnyPrincipal()
    s3SQSStatement.addCondition("ArnLike", { "aws:SourceArn": this.contentBucket.bucketArn })

    this.contentBucket.addObjectCreatedNotification(this.sqsQueue, {
      prefix: "input/"
    })

  }
}
