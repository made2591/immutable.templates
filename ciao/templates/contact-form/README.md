# Contact Form

The Contact Form stack let you deploy the serverless infrastructure required to build a contact form by using [AWS API Gateway](https://aws.amazon.com/api-gateway/), [AWS DynamoDB](https://aws.amazon.com/dynamodb/) with DynamoStream and [AWS Simple Notification Service](https://aws.amazon.com/it/sns/).

## Getting Started

The integration between API Gateway and DynamoDB is made throught the use of integration service, thus no Lambda is required in Step 3. There's an element missing from the schema below: the Lambda triggered by DynamoDB stream and required to transfer information straight to SNS service. This is the only way to do it as far as I know, thus I had to create this Lambda for the integration between DynamoDB and SNS. Everything else is as shown.

![architecture_schema](/templates/contact-form/architecture.png)

A blog post is available [here](https://madeddu.xyz/posts/contact-form/).

To use the stack / modify it, just clone the repository and move to the `templates/contact-form` folder starting from the root of the repository, like this:

```
git clone https://github.com/made2591/immutable.templates
cd immutable.templates/templates/contact-form
# start deploy (see later)
```

## Architecture overview

The diagram shows an S3 hosted static page, but the stack doesn't require you to start from here: it just simply deploys what is needed to have an API Gateway endpoint to call. So, after the user arrives to your site (1), it sends a message to API Gateway (2): this *pack* a compliant request using VTL - Velocity Template Language by Apache - and sends it to DynamoDB (3), where the content of the message (name, email, content) is persisted. DynamoStream is enabled over this table and triggers a Lambda, that propagate (4) the content of the message to one SNS Topic. You as admin are subscribed to the topic and you will received the content of the message everything someone send a message throught your contact form.

### Prerequisites

The only needed tool is [Node.js](https://nodejs.org/en/download/) - ≥ 8.11.x - and the [AWS Cloud Development Kit](https://github.com/awslabs/aws-cdk) - AWS CDK. You can install it by running

```
$ npm i -g aws-cdk
```

## Deployment of Stack

Just as any other CDK stack, this are the main commands that can help you with the most common actions:

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Built With

* [Node.js](https://nodejs.org/en/download/) - Node.js
* [AWS CDK](https://github.com/awslabs/aws-cdk) - AWS Cloud Development Kit

## Contributing

Please read [CONTRIBUTING.md](https://github.com/made2591/immutable.templates/CONTRIBUTING.md) for details on how to contact me.

## Authors

Almost all the stacks proposed in this repository, and their implementation, are deeply discussed between people below:

* **Matteo Madeddu** - *Design, Implementation* - [Github](https://github.com/made2591/), [LinkedIn](https://www.linkedin.com/in/mmadeddu/)
* *Guido Nebiolo* - *Design, Implementation* - [Github](https://github.com/guidonebiolo/), [LinkedIn](https://www.linkedin.com/in/guidonebiolo/)

Thank you for your interest!

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

* Fix architecture schemas
* Inspiration
* etc
