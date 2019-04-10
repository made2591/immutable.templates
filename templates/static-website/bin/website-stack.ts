import cdk = require("@aws-cdk/cdk");
import s3 = require("@aws-cdk/aws-s3");

interface WebsiteStackProps extends cdk.StackProps {
    stage: string
}

export class MyStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: WebsiteStackProps) {
        super(scope, id, props);
        if (props.stage == "dev") {
            new s3.Bucket(this, "MyGroovyBucket", {
                encryption: s3.BucketEncryption.KmsManaged
            });
        } else {
            new s3.Bucket(this, "MyGroovyBucket");
        }
    }
}

const oauth = new cdk.SecretParameter(this,
    '${stage}-${projectName}-githubtoken',
    { ssmParameter: props.githubOauthToken });

