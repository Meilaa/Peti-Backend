const mongoose = require("mongoose");

const animalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true },
  breed: { type: String, required: true },
  age: { type: Number, required: true },
  height: { type: Number, required: true },
  weight: { type: Number, required: true },
  temperament: { type: String, enum: ['aggressive', 'friendly', 'neutral'], default: 'neutral' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User model
  device: { type: mongoose.Schema.Types.ObjectId, ref: "Device", required: true }, // Reference to Device model
  isLost: { type: Boolean, default: false },
  lostSince: { type: Date, default: null },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Animal", animalSchema);