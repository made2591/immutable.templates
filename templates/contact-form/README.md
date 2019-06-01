# Contact Form

This stack let you deploy the serverless infrastructure required to build a contact form by using [Amazon API Gateway](https://aws.amazon.com/api-gateway/), [DynamoDB](https://aws.amazon.com/dynamodb/) with DynamoStream and [Amazon Simple Notification Service](https://aws.amazon.com/it/sns/). The integration between API Gateway and DynamoDB is made throught the use of integration service, thus no Lambda is required in Step 3. Unfortunately, there's an element missing from the schema below: the Lambda triggered by DynamoDB stream and required to transfer information straight to SNS service. This is the only way to do it as far as I know, thus I had to create this Lambda for the integration between DynamoDB and SNS. Everything else is as shown.

![architecture_schema](/templates/contact-form/architecture.png)

A blog post is available [here](https://madeddu.xyz/posts/contact-form/).

## Architecture overview
The diagram shows an S3 hosted static page, but the stack doesn't require you to start from here: it just simply deploys what is needed to have an API Gateway endpoint to call. So, after the user arrives to your site (1), it sends a message to API Gateway (2): this *pack* a compliant request using VTL - Velocity Template Language by Apache - and sends it to DynamoDB (3), where the content of the message (name, email, content) is persisted. DynamoStream is enabled over this table and triggers a Lambda, that propagate (4) the content of the message to one SNS Topic. You as admin are subscribed to the topic and you will received the content of the message everything someone send a message throught your contact form.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
