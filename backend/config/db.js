const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../users.json');
const PROPERTIES_FILE = path.join(__dirname, '../properties.json');

// Initialize JSON files if they don't exist
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(PROPERTIES_FILE)) fs.writeFileSync(PROPERTIES_FILE, JSON.stringify([], null, 2));

// Helper functions for Local JSON operations
const readJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const dbState = {
  isMongoConnected: false
};

const connectDB = async () => {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('>>> Connected to MongoDB database successfully.');
      dbState.isMongoConnected = true;
    } catch (err) {
      console.error('>>> MongoDB connection error, falling back to local JSON database:', err.message);
      dbState.isMongoConnected = false;
    }
  } else {
    console.log('>>> No MONGODB_URI provided in environmental variables. Using local JSON database fallback.');
    dbState.isMongoConnected = false;
  }
};

module.exports = {
  connectDB,
  dbState,
  readJSON,
  writeJSON,
  USERS_FILE,
  PROPERTIES_FILE
};
