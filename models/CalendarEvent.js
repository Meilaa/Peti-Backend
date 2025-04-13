const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['medication', 'vet'],
    required: true
  },
  category: {
    type: String
  },
  status: {
    type: String,
    enum: ['upcoming', 'taken', 'missed'],
    default: 'upcoming'
  },
  recurringPattern: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none'
  },
  notificationId: {
    type: String
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

// Pre-save hook to update 'updatedAt' timestamp
calendarEventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CalendarEvent', calendarEventSchema); 