# Producer / Consumer Chain

The Producer / Consumer stack let you deploy a serverless infrastructure following the producer/consumer schema using [AWS API Gateway](https://aws.amazon.com/api-gateway/), [AWS Lambda](https://aws.amazon.com/lambda/), [AWS Simple Storage Service](https://aws.amazon.com/s3/) and [AWS Simple Queue Service](https://aws.amazon.com/sqs/).

## Getting Started

This stack inherits from the [Upload Form](https://github.com/made2591/immutable.templates/templates/upload-form) stack the same logic regarding the request of URL: the extension is around an SQS notification that can be used to trigger a consumer action after the upload of a document on S3. Below a schema of the stack with highlight of the common part. The only missing element is a Dead Letter Queue attached to the SQS Queue for troubleshooting of errors. Everything else remains untouched.

![architecture_schema](/templates/producer-consumer/architecture.png)

A blog post is available [here](https://madeddu.xyz/posts/producer-consumer/).

To use the stack / modify it, just clone the repository and move to the `templates/producer-consumer` folder starting from the root of the repository, like this:

```
git clone https://github.com/made2591/immutable.templates
cd immutable.templates/templates/producer-consumer
# start deploy (see later)
```

## Architecture overview

The producer asks to an API Gateway endpoint (1) for a pre-signed URL to produce his message. It doesn't need to know where it will be stored, neither the name of the temporary store or having any credentials. After that, the API Gateway will trigger a Lambda function (2) - i.e., the designed entity that runs with a role with attached the permissions to do a PutObject over the bucket designed to store the content of the file. The Lambda invokes the getSignedUrl URL action by using the S3 API (3) and provides back the URL to API Gateway (4) - that will forwards it directly to the producer (6). The producer is now able to push his file to S3 with the provided URL (7). Until this point, this is the behaviour of the Upload Form stack. When the file is uploaded, S3 will put a message over an SQS queue (8). The consumer will be able to retrieve the reference to the file sent by polling the SQS Queue (9). With this message, the consumer can ask to API Gateway the permission to retrieve the original content produced (10). Once the presigned URL is generated and sent back (11), it can retrieve safely the content of the message directly from S3 (12).

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
