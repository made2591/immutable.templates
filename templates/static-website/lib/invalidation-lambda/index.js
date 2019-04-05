const AWS = require('aws-sdk')
const CodePipeline = new AWS.CodePipeline()
const CloudFront = new AWS.CloudFront()

const DistributionId = process.env.DISTRIBUTION_ID

exports.handler = async(event) => {
    const jobId = event['CodePipeline.job'].id
    await CloudFront.createInvalidation({
        DistributionId: DistributionId,
        InvalidationBatch: {
            Paths: {
                Quantity: 1,
                Items: ['/*']
            },
            CallerReference: new Date().toISOString()
        }
    }).promise()
    await CodePipeline.putJobSuccessResult({ jobId: jobId }).promise()
}