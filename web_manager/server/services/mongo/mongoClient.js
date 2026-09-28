let client;
let connecting;

function getMongoClientClass() {
  try {
    return require('mongodb').MongoClient;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error('MongoDB driver is missing. Run: yarn add mongodb');
    }
    throw error;
  }
}

function getMongoUri() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }
  return process.env.MONGODB_URI;
}

async function getMongoClient() {
  if (client) return client;
  if (!connecting) {
    const MongoClient = getMongoClientClass();
    connecting = new MongoClient(getMongoUri(), {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
    }).connect().then((connectedClient) => {
      client = connectedClient;
      return client;
    }).finally(() => {
      connecting = null;
    });
  }
  return connecting;
}

async function getCollection(source) {
  const mongoClient = await getMongoClient();
  return mongoClient.db(source.database).collection(source.collection);
}

module.exports = { getMongoClient, getCollection, getMongoUri };
