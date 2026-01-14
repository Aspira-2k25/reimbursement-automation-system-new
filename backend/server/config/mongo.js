require("dotenv").config();
const mongoose = require("mongoose");

// Cache connection state across serverless invocations
let isConnected = false;

const connectMongoDB = async () => {
  // Reuse existing connection if already established
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGO_URI) {
    // In serverless environments we should not crash the process,
    // instead throw and let the caller / error handler respond with 500.
    throw new Error("MONGO_URI is not set in environment variables");
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = conn.connection.readyState === 1;
    console.log("MongoDB connected successfully ✅");
  } catch (err) {
    console.error("MongoDB connection error ❌", err);
    // Do NOT call process.exit() in serverless – just rethrow
    throw err;
  }
};

module.exports = connectMongoDB;
