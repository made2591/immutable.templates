import cdk = require('@aws-cdk/cdk');
import sqs = require('@aws-cdk/aws-sqs');

import { UploadFormStack, UploadFormStackProps } from "../../upload-form/lib/upload-form-stack";

interface ProducerConsumerStackProps extends UploadFormStackProps {
}

export interface ProducerConsumerStack extends UploadFormStack {
  sqsQueue: sqs.Queue
}

export class ProducerConsumerStack extends UploadFormStack {
  constructor(scope: cdk.Construct, id: string, props: ProducerConsumerStackProps) {
    super(scope, id, props);

    this.sqsQueue = new sqs.Queue(this, 'Queue', {
      retentionPeriodSec: 1209600
    });
    this.contentBucket.onPutObject(props.stage.toString() + "-put-event");

  }
}
