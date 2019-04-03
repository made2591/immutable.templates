#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { StaticWebsiteStack } from '../lib/static-website-stack';

const app = new cdk.App();
new StaticWebsiteStack(app, 'StaticWebsiteStack');
