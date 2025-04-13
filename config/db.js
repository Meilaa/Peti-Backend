const mongoose = require('mongoose');
require('dotenv').config(); // Load .env file

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, { })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Connection error', err));
