#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { ProducerConsumerStack } from '../lib/producer-consumer-stack';
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

new ProducerConsumerStack(app, 'ProducerConsumerStack', {
    stage: stage
});

app.run()
