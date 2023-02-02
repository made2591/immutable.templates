#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { DocumentReaderStack } from '../lib/document-reader-stack';
import { Stage } from '../lib/stage-env/stage-env';

const app = new cdk.App();
var stage = Stage.Dev;
switch (process.env.STAGE) {
    case "dev": {
        stage = Stage.Dev;
        break
    }
    case "test": {
        stage = Stage.Test;
        break
    }
    case "prod": {
        stage = Stage.Prod;
        break
    }
    default: {
        stage = Stage.Dev;
        break;
    }
}
const readCapacity = parseInt(process.env.READ_CAPACITY || "")
const writeCapacity = parseInt(process.env.WRITE_CAPACITY || "")
const partitionKey = process.env.PARTITION_KEY || ""

new DocumentReaderStack(app, 'DocumentReaderStack', {
    stage: stage,
    readCapacity: readCapacity,
    writeCapacity: writeCapacity,
    partitionKey: partitionKey
});

app.run();