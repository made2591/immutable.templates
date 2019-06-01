# Static Website Stack

This stack creates a static site hosted on [Amazon S3](https://aws.amazon.com/s3/), served throught the help of [Cloudfront](https://aws.amazon.com/cloudfront/) and shipped with CI/CD powered by [Codepipeline](https://aws.amazon.com/codepipeline/). The stack differs from the one shown below just in the use of Github as source instead of [Codecommit](https://aws.amazon.com/codecommit/). Back in the history you should be able to find also a working commit with a codecommit git repository instead. I have a plan to provide this choice throught an environment variable that can be used to set up a paramenter for the stack. Right now [01/06/2019] this parameter is not implemented yet. Everything else remains untouched.

![architecture_schema](/templates/static-website/architecture.png)

A blog post is available [here](https://madeddu.xyz/posts/cloudformation-to-cdk/).

## Architecture overview
The user just git commit and git push the changes. Every time this happens, a Cloudwatch event (2) triggers the CodePipeline execution (3): this pipeline is composed of three stages. It first gets the source code from the repository (4) defined in CodeCommit/Github and puts it inside the artifact bucket (5); then, the build stage gets (6) the source code and starts the jekylls build - using a ruby docker image managed by aws - and puts the artifacts back in the bucket (in another prefix). Finally, it copies the artifacts to the content bucket. After that, a lambda is triggered (9) to invalidate the CloudFront cache: CloudFront starts cache invalidation (10) by retrieving (11) and propagating the new content from the content bucket again to the edge location. Every time a user B makes an https request to the domain, Route53 resolves (13) the request the CloudFront CDN, that uses the certificate manager (14) to operate in SSL, and stores logs (15) about the requests done by the users.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
