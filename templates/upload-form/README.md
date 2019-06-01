# Upload Form

The Upload Form stack let you deploy the serverless infrastructure required to build an upload form by using [AWS API Gateway](https://aws.amazon.com/api-gateway/), [AWS Lambda](https://aws.amazon.com/lambda/) and [AWS Simple Storage Service](https://aws.amazon.com/s3/).

## Getting Started

If you want to provide an endpoint to upload object, you can leverage the S3 service easily. Furthermore, with a pre-signed a URL you can give to someone access to the object identified in the URL, provided that the creator of the pre-signed URL has the permissions to access that object. That is, if you receive a pre-signed URL to upload an object, you can upload the object only if the creator of the pre-signed URL has the necessary permissions to upload that object: a simple Lambda will provide this URL to the final users. The diagram below shows the scenario:

![architecture_schema](/templates/contact-form/architecture.png)

A blog post is available [here](https://madeddu.xyz/posts/uploader-stack/).

To use the stack / modify it, just clone the repository and move to the `templates/upload-form` folder starting from the root of the repository, like this:

```
git clone https://github.com/made2591/immutable.templates
cd immutable.templates/templates/upload-form
# start deploy (see later)
```

## Architecture overview

The user asks to API Gateway (1) for a pre-signed URL to upload a file. It doesn't need to know where it will be stored, neither the name of the bucket or having any credentials: this covers our scenario in which a generic user just want to upload a file into our platform, and only owns the file - in this case, it will also provide the name of it, but could even be ignored, depending on the logic of your application. After that, API Gateway will trigger a Lambda function (2) - i.e., the designed entity that runs with a role with attached the permissions to do a PutObject over the bucket designed to store the content of the user. The Lambda invokes the getSignedUrl URL action by using the s3 API (3) and provides back the URL to API Gateway (4) - that will forwards it directly to the user (6). The user is now able to push his file to s3 with the provided URL (7).

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
