const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

const mbxClient = require('@mapbox/mapbox-sdk');
const mbxMatrix = require('@mapbox/mapbox-sdk/services/matrix');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

const documentClient = DynamoDBDocument.from(client);

const baseClient = mbxClient({ accessToken: process.env.MAPBOX_API_KEY });
const matrixClient = mbxMatrix(baseClient);

async function getDistances() {
  const mbxResponse = await matrixClient.getMatrix({
    points: [
      {
        // Enterprise Plaza
        coordinates: [-95.3710341, 29.7575786],
      },
      {
        // Spring Branch West
        coordinates: [-95.529294, 29.787863],
      },
      {
        // Briarforest
        coordinates: [-95.567466, 29.737249],
      },
      {
        // Shepherd Park
        coordinates: [-95.419145, 29.833801],
      },
      {
        // West of Bayou Garden Oaks
        coordinates: [-95.474414, 29.835555],
      },
    ],
    profile: 'driving-traffic',
  }).send();
  const matrix = mbxResponse.body;
  console.log(matrix);
  const durations = matrix.durations;

  const distances = {
    EtoSB: durations[0][1],
    EtoBF: durations[0][2],
    EtoSP: durations[0][3],
    EtoGO: durations[0][4],
    SBtoE: durations[1][0],
    BFtoE: durations[2][0],
    SPtoE: durations[3][0],
    GOtoE: durations[4][0],
  }

  return distances;
}

async function pushToDdb(distances) {
  const currentTime = new Date();
  await documentClient.put({
    TableName: process.env.PRIMARY_TABLE_NAME,
    Item: {
      id: currentTime.toISOString(),
      ...distances,
    },
  });
}

async function main() {
  const distances = await getDistances();
  await pushToDdb(distances);
}

exports.handler = async function (event, context, callback) {
  try {
    await main();
  } catch (uncaughtError) {
    console.error(uncaughtError);
    throw uncaughtError;
  }
}