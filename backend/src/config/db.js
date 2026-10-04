const mongoose = require('mongoose');

let isInMemoryMode = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_dpr';
  
  try {
    // Attempt connecting to configured MongoDB instance with a short timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 500
    });
    console.log(`[MongoDB] Connected successfully to external instance: ${mongoose.connection.host}`);
    isInMemoryMode = false;
  } catch (err) {
    console.warn(`[MongoDB] External instance unavailable (${err.message}).`);
    console.log(`[MongoDB] Activating high-performance In-Memory Document Store for zero-config operation.`);
    isInMemoryMode = true;
  }

  mongoose.connection.on('error', (error) => {
    console.error('[MongoDB Connection Error]:', error);
  });
}

function getIsInMemory() {
  return isInMemoryMode;
}

async function closeDB() {
  if (!isInMemoryMode) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDB, closeDB, getIsInMemory };
