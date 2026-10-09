const mongoose = require('mongoose');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  'mongodb://mongodb:27017/authdb';

const connectMongo = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI);
  console.log('Mongoose connected to MongoDB');
};

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

module.exports = { connectMongo, mongoose };
