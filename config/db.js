// ...existing code...
import mongoose from 'mongoose';

const DEFAULT_POOL_SIZE = Number(process.env.MONGO_POOL_SIZE) || 10;
const SERVER_SELECTION_TIMEOUT = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000;

let isConnected = false;

async function connectDB(retries = 5, backoff = 500) {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  const uri = process.env.MONGODB_URI;

  const opts = {
    // Mongoose 6+ has sensible defaults for useNewUrlParser / useUnifiedTopology
    autoIndex: process.env.NODE_ENV === 'production' ? false : true, // disable in prod
    maxPoolSize: DEFAULT_POOL_SIZE,
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT,
    socketTimeoutMS: 45000,
    family: 4, // use IPv4 - remove if you need IPv6
    // appName: 'my-app', // optional: helpful in logs/monitoring
  };

  try {
    const conn = await mongoose.connect(uri, opts);
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    if (retries > 0) {
      console.log(`Retrying connection in ${backoff}ms... (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, backoff));
      return connectDB(retries - 1, Math.min(20000, backoff * 2));
    }
    // Let the process manager decide restart vs exit; still exit for clarity
    process.exit(1);
  }
}

// Graceful shutdown helpers
function handleShutdown(signal) {
  return async () => {
    console.log(`Received ${signal}, closing MongoDB connection...`);
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MongoDB connection', err);
      process.exit(1);
    }
  };
}

process.once('SIGINT', handleShutdown('SIGINT'));
process.once('SIGTERM', handleShutdown('SIGTERM'));
// (Optionally SIGUSR2 for nodemon)

export { connectDB, isConnected };
export default connectDB;

