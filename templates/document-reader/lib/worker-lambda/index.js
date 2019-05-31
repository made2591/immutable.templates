"use strict"

const AWS = require('aws-sdk')
const dynamoDb = new AWS.DynamoDB.DocumentClient()
const rekognition = new AWS.Rekognition({ apiVersion: '2016-06-27' })
const polly = new AWS.Polly()
const s3 = new AWS.S3({ signatureVersion: 'v4' })

const contentBucket = process.env.CONTENT_BUCKET
const dynamoTableName = process.env.DYNAMO_TABLE
const voiceId = 'Kimberly'
const noText = "Nothing found"
const outputFolder = "output/"
const outputFormat = "mp3"

async function saveReferencesToDynamo(item) {
    return await new Promise((resolve, reject) => {
        var params = {
            TableName: dynamoTableName,
            Item: item
        }
        dynamoDb.put(params, (error, data) => {
            if (error) {
                console.error(`error in save reference to dynamo: ${error.stack}`)
                reject({
                    statusCode: 400,
                    error: `Could not create message: ${error.stack}`
                })
            } else {
                console.log(`saved reference data: ${JSON.stringify(data)}`)
                resolve({
                    statusCode: 200,
                    body: JSON.stringify(params.Item)
                })
            }
        })
    })
}

function savePollyResultToS3(bucket, objectKey, audioStream) {
    return s3.putObject({
            Bucket: bucket,
            Key: objectKey,
            Body: audioStream,
            ContentType: 'audio/' + outputFormat
        }).promise()
        .catch(error => {
            console.error(`error in save reference to dynamo: ${error}`)
        })
}

async function readText(text, voiceId, outputObjectKey) {
    let audio = await polly.synthesizeSpeech({
        Text: text,
        OutputFormat: outputFormat,
        VoiceId: voiceId
    }).promise()
    if (audio.AudioStream instanceof Buffer) {
        await savePollyResultToS3(contentBucket, outputObjectKey, audio.AudioStream)
        return outputObjectKey
    } else {
        console.error(`audiostream is not a buffer`)
    }
}

function detectTextFromBytes(bytes) {
    return rekognition
        .detectText({
            Image: {
                Bytes: bytes
            }
        })
        .promise()
        .catch(error => {
            console.error(`error in detecting text: ${error}`)
        })
}

function getBase64BufferFromS3(objectKey) {
    return s3.getObject({
            Bucket: contentBucket,
            Key: objectKey,
        }).promise()
        .then(response => response.Body)
        .catch(error => {
            console.error(`error in detecting text: ${error}`)
        })
}

async function rekognizeText(rawObjectKey, maxLabels, minConfidence, attributes) {
    const bytes = await getBase64BufferFromS3(rawObjectKey)
    if (!bytes) return noText
    let text = await detectTextFromBytes(bytes)
    text = text && text.TextDetections ? text.TextDetections.map(i => i.DetectedText).join(" ") : noText
    return text
}

async function startDetection(rawObjectKey) {
    const speachObjectKey = outputFolder + rawObjectKey.split("/").pop().replace(/\.[^/.]+$/, "") + ".mp3"
    const textRekognized = await rekognizeText(rawObjectKey)
    console.log(textRekognized)
    const outputObjectKey = await readText(textRekognized, voiceId, speachObjectKey)
    if (!outputObjectKey) {
        console.error(`error in reading text`)
    }
    console.log(outputObjectKey)
    const result = {
        id: rawObjectKey,
        raw_object_key: rawObjectKey,
        text_rekognized: textRekognized,
        speach_object_key: outputObjectKey,
    }
    return await saveReferencesToDynamo(result)
}

exports.handler = async function(event) {
    try {
        console.log(JSON.stringify(event))
        console.log(JSON.parse(event.Records[0].body).Records[0].s3.object.key)
        console.log(event.Records[0].receiptHandle)
        const result = await startDetection(JSON.parse(event.Records[0].body).Records[0].s3.object.key)
        console.log(result)
        return result
    } catch (err) {
        console.log(err)
        return err
    }
}