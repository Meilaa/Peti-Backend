const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Device = require("../models/Device");
const User = require("../models/User");
const Animal = require("../models/Animal");
const authenticateJWT = require('../middleware/authenticateJWT');

// ✅ Add tracker (device) to the system
router.post("/addTracker", authenticateJWT, async (req, res) => {
  try {
    const { trackerID, userId } = req.body;

    if (!trackerID || !userId) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let device = await Device.findOne({ deviceId: trackerID });
    if (device) {
      return res.status(400).json({ message: "Device is already registered." });
    }

    device = new Device({
      deviceId: trackerID,
      user: user._id,
      animal: null,
    });

    const savedDevice = await device.save();

    user.devices = user.devices || [];
    user.devices.push(device._id);
    await user.save();

    return res.status(201).json({ message: "Tracker added successfully!", device: savedDevice });
  } catch (error) {
    console.error("Error creating device:", error);
    return res.status(500).json({ message: "Error saving tracker ID.", error: error.message });
  }
});

// ✅ Link an animal to a device
router.put("/linkAnimal", async (req, res) => {
  try {
    const { trackerObjectId, animalId } = req.body;

    if (!trackerObjectId || !animalId) {
      return res.status(400).json({ message: "Tracker Object ID and Animal ID are required." });
    }

    const device = await Device.findById(trackerObjectId);
    if (!device) {
      return res.status(404).json({ message: "Device not found." });
    }

    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({ message: "Animal not found." });
    }

    if (animal.device) {
      return res.status(400).json({ message: "Animal already has a device assigned." });
    }

    if (device.animal) {
      return res.status(400).json({ message: "Device is already assigned to another animal." });
    }

    // Update both models correctly
    const updatedDevice = await Device.findByIdAndUpdate(
      trackerObjectId,
      { animal: animal._id },
      { new: true }
    );

    const updatedAnimal = await Animal.findByIdAndUpdate(
      animalId,
      { device: device._id },
      { new: true }
    );

    return res.status(200).json({ message: "Device linked to animal successfully.", device: updatedDevice });
  } catch (error) {
    console.error("Error linking device to animal:", error);
    return res.status(500).json({ message: "Error linking device to animal.", error: error.message });
  }
});

// ✅ FIX: Link an animal to a device after creation
router.put("/linkAnimalAfterCreation", async (req, res) => {
  try {
    const { trackerObjectId, animalId } = req.body;

    console.log("🔄 Linking Tracker to Animal:", { trackerObjectId, animalId });

    if (!trackerObjectId || !animalId) {
      return res.status(400).json({ message: "Tracker Object ID and Animal ID are required." });
    }

    const device = await Device.findById(trackerObjectId);
    if (!device) {
      return res.status(404).json({ message: "Device not found." });
    }

    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({ message: "Animal not found." });
    }

    // Update device with animal ID
    device.animal = animal._id;
    await device.save();

    // Update animal with device ID
    animal.device = device._id;
    await animal.save();

    console.log("✅ Device and Animal linked successfully:", { device, animal });

    return res.status(200).json({ message: "Device linked to animal successfully.", device });
  } catch (error) {
    console.error("❌ Error linking device to animal:", error);
    return res.status(500).json({ message: "Error linking device to animal.", error: error.message });
  }
});

// ✅ Update a device (fix for frontend issue)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { animal } = req.body; // Expecting animal ID

    if (!animal) {
      return res.status(400).json({ message: "Animal ID is required to update the device." });
    }

    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({ message: "Device not found." });
    }

    device.animal = animal;
    await device.save();

    return res.status(200).json({ message: "Device updated successfully.", device });
  } catch (error) {
    console.error("Error updating device:", error);
    return res.status(500).json({ message: "Error updating device.", error: error.message });
  }
});

// ✅ Delete a device by ID
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findByIdAndDelete(id);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    await Animal.findOneAndUpdate(
      { device: id },
      { $unset: { device: "" } },
      { new: true }
    );

    res.status(200).json({ message: "Device deleted successfully", device });
  } catch (error) {
    console.error("Error deleting device:", error);
    res.status(500).json({ message: "Error deleting device", error: error.message });
  }
});

// ✅ Get all devices for a user
router.get("/", authenticateJWT, async (req, res) => {
  try {
      const devices = await Device.find({ user: req.user.id }).populate("animal");
      res.status(200).json(devices);
  } catch (error) {
      res.status(500).json({ message: "Error fetching devices", error });
  }
});

module.exports = router;
