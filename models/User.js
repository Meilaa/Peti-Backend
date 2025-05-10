const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const subscriptionSchema = new mongoose.Schema({
  id: { type: String },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
    default: null
  },
  currentPeriodEnd: { type: Date },
  cancelAtPeriodEnd: { type: Boolean },
  trialEnd: { type: Date }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  devices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Device" }], // ✅ Change 'device' to 'devices' (array)
  stripeCustomerId: {
    type: String,
    default: null
  },
  subscription: subscriptionSchema,
  paymentMethods: [{ type: String }],
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && !this.password.startsWith("$2")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
