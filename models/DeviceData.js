const mongoose = require('mongoose');

const DeviceDataSchema = new mongoose.Schema({
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true }, // Ensure 'Device' is the correct model name
    batteryLevel: Number,
    deviceName: String,
    gnssStatus: String,
    movementStatus: String,
    positionAltitude: Number,
    positionDirection: Number,
    positionSpeed: Number,
    positionValid: Boolean,
    timestamp: { type: Date, required: true },
    positionLatitude: Number,
    positionLongitude: Number
});
DeviceDataSchema.set('strictPopulate', false);  // Disable strict populate for this schema
module.exports = mongoose.model('DeviceData', DeviceDataSchema);
