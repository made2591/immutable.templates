# immutable.templates

Immutable templates contains a collection of CDK templates. The respective CloudFormation templates will be stored in [here](https://github.com/GuidoNebiolo/aws-architectures) as soon as they will be ready to be shipped - updated

## Available Arhictectures
The available architectures are the following:

- [Static Website](https://github.com/made2591/immutable.templates/blob/master/templates/static-website/README.md): creates a static site hosted on [AWS Simple Storage Service](https://aws.amazon.com/s3/), served throught the help of [AWS Cloudfront](https://aws.amazon.com/cloudfront/) and shipped with CI/CD powered by [AWS Codepipeline](https://aws.amazon.com/codepipeline/).
- [Contact Form](https://github.com/made2591/immutable.templates/blob/master/templates/contact-form/README.md): creates the serverless infrastructure required to build a contact form by using [AWS API Gateway](https://aws.amazon.com/api-gateway/), [AWS DynamoDB](https://aws.amazon.com/dynamodb/) with DynamoStream and [AWS Simple Notification Service](https://aws.amazon.com/it/sns/).
- [Upload Form](https://github.com/made2591/immutable.templates/blob/master/templates/upload-form/README.md): creates the serverless infrastructure required to build an upload form by using [AWS API Gateway](https://aws.amazon.com/api-gateway/), [AWS Lambda](https://aws.amazon.com/lambda/) and [AWS Simple Storage Service](https://aws.amazon.com/s3/).
- [Producer/Consumer](https://github.com/made2591/immutable.templates/blob/master/templates/producer-consumer/README.md): creates the serverless infrastructure following the producer/consumer schema using [AWS API Gateway](https://aws.amazon.com/api-gateway/), [AWS Lambda](https://aws.amazon.com/lambda/), [AWS Simple Storage Service](https://aws.amazon.com/s3/) and [AWS Simple Queue Service](https://aws.amazon.com/sqs/).
- [Document Reader](https://github.com/made2591/immutable.templates/blob/master/templates/document-reader/README.md): creates a serverless infrastructure to build OCR application that produce spoken text extracted from images you can provide throught REST API by using many services like [AWS API Gateway](https://aws.amazon.com/api-gateway/), [AWS Lambda](https://aws.amazon.com/lambda/), [AWS Simple Storage Service](https://aws.amazon.com/s3/), [AWS Simple Queue Service](https://aws.amazon.com/sqs/), [AWS DynamoDB](https://aws.amazon.com/dynamodb/), [AWS Rekognition](https://aws.amazon.com/rekognition/) and [AWS Polly](https://aws.amazon.com/polly/), to provide text-to-speach functionality;

## Getting Started

To use the stack and modify them, just clone the repository and move to the desired stack folder under the `templates` directory in the root of the repository. For example, if you are interested in the `static-website` stack, just do the following:

```
git clone https://github.com/made2591/immutable.templates
cd immutable.templates/templates/static-website
# start deploy (see later)
```

You will find an always updated list of the current available stacks in the section Available Arhictectures of this document.

### Prerequisites

The only needed tool is [Node.js](https://nodejs.org/en/download/) - ≥ 8.11.x - and the [AWS Cloud Development Kit](https://github.com/awslabs/aws-cdk) - AWS CDK. You can install it by running

```
$ npm i -g aws-cdk
```

## Deployment of Stacks
Just as any other CDK stack, this are the main commands that can help you with the most common actions:

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Built With

* [Node.js](https://nodejs.org/en/download/) - Node.js
* [AWS CDK](https://github.com/awslabs/aws-cdk) - AWS Cloud Development Kit
* [AWS SAM](https://github.com/awslabs/serverless-application-model) - AWS Serverless Application Model

## Contributing

Please read [CONTRIBUTING.md](https://github.com/made2591/immutable.templates/blob/master/CONTRIBUTING.md) for details on how to contact me.

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
