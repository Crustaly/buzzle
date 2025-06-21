const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { userId, totalQuestions, correctAnswers } = body;

    if (!userId || totalQuestions === undefined || correctAnswers === undefined) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing required fields." }),
        };
    }

    const timestamp = new Date().toISOString();

    const params = {
        TableName: "BuzzleUserProgress",
        Item: {
            userId,
            timestamp,
            totalQuestions,
            correctAnswers,
        },
    };

    try {
        await dynamoDb.put(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User progress saved." }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error." }),
        };
    }
};
