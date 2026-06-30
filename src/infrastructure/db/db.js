const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4,                        // Use IPv4, skip trying IPv6
      serverSelectionTimeoutMS: 10000,  // Wait up to 10s for a server
      socketTimeoutMS: 45000,           // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000,          // Give up initial connection after 10s
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Auto-reconnect on unexpected disconnect
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Reconnecting...');
      setTimeout(connectDB, 5000);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectDB, 5000); // Retry instead of crashing
  }
};

module.exports = connectDB;
