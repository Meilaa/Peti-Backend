const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  animal: { type: mongoose.Schema.Types.ObjectId, ref: "Animal" }, // Make this optional
});
module.exports = mongoose.model("Device", DeviceSchema);
