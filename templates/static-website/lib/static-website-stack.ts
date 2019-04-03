import cdk = require('@aws-cdk/cdk');
import stackConfig = require("./static-website-config")

export class StaticWebsiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const globalConfig = new stackConfig.StaticWebsiteConfig();
    console.log('debug', globalConfig.config);



  }
}
