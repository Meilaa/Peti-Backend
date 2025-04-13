const mongoose = require('mongoose');

const WalkPathSchema = new mongoose.Schema({
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date
    },
    coordinates: [{
        latitude: Number,
        longitude: Number,
        timestamp: Date
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    distance: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('WalkPath', WalkPathSchema);
