const mongoose = require('mongoose');

const territorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  coordinates: {
    type: [{
      latitude: Number,
      longitude: Number
    }],
    validate: [
      {
        validator: function(coords) {
          return coords.length >= 4; // Require at least 4 points to form a territory
        },
        message: 'A territory must have at least 4 points'
      }
    ],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  animal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to update the updatedAt field
territorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Territory = mongoose.model('Territory', territorySchema);

module.exports = Territory; 