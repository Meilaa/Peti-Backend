const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert'); // Assuming alertModel.js is in the 'models' directory
const Animal = require('../models/Animal'); // Assuming animalModel.js is in the 'models' directory
const DangerZone = require('../models/DangerZone'); // Add DangerZone model
const authenticateJWT = require('../middleware/authenticateJWT'); // Add authentication middleware

// Add authentication to routes
// Create a new alert
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { animalId, alertType, description, threshold, location } = req.body;

    // Validate required fields
    if (!animalId || !alertType || !threshold || !location) {
      return res.status(400).json({ message: 'Missing required fields: animalId, alertType, threshold, location' });
    }

    // Validate if the animal exists
    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found.' });
    }

    // Validate threshold fields
    if (!threshold.radius || !threshold.latitude || !threshold.longitude) {
      return res.status(400).json({ message: 'Missing required threshold fields: radius, latitude, longitude' });
    }

    // Validate location fields
    if (!location.latitude || !location.longitude) {
      return res.status(400).json({ message: 'Missing required location fields: latitude, longitude' });
    }

    // Create a new alert
    const newAlert = new Alert({
      animal: animalId,
      alertType,
      description,
      threshold,
      location,
      timestamp: Date.now(),
    });

    await newAlert.save();
    res.status(201).json({ message: 'Alert created successfully', alert: newAlert });
  } catch (error) {
    console.error('Error while creating alert:', error);
    res.status(500).json({ message: 'Server error, please try again later.', error: error.message });
  }
});


// Get all alerts for an animal
router.get('/animal/:animalId', authenticateJWT, async (req, res) => {
  try {
    // Verify animal belongs to user
    const animal = await Animal.findOne({ 
      _id: req.params.animalId,
      owner: req.user.id
    });
    
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found or you do not have permission.' });
    }
    
    const alerts = await Alert.find({ animal: req.params.animalId }).sort({ timestamp: -1 });
    
    if (alerts.length === 0) {
      return res.status(404).json({ message: 'No alerts found for this animal.' });
    }
    
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Get the latest alert for an animal
router.get('/animal/:animalId/latest', authenticateJWT, async (req, res) => {
  try {
    // Verify animal belongs to user
    const animal = await Animal.findOne({ 
      _id: req.params.animalId,
      owner: req.user.id
    });
    
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found or you do not have permission.' });
    }
    
    const latestAlert = await Alert.findOne({ animal: req.params.animalId }).sort({ timestamp: -1 });
    
    if (!latestAlert) {
      return res.status(404).json({ message: 'No alerts found for this animal.' });
    }
    
    res.status(200).json(latestAlert);
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// New: Get danger zone alerts for an animal
router.get('/animal/:animalId/danger-zones', authenticateJWT, async (req, res) => {
  try {
    // Verify animal belongs to user
    const animal = await Animal.findOne({ 
      _id: req.params.animalId,
      owner: req.user.id
    });
    
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found or you do not have permission.' });
    }
    
    const alerts = await Alert.find({ 
      animal: req.params.animalId,
      alertType: 'DangerZone'
    }).sort({ timestamp: -1 });
    
    if (alerts.length === 0) {
      return res.status(404).json({ message: 'No danger zone alerts found for this animal.' });
    }
    
    res.status(200).json(alerts);
  } catch (error) {
    console.error('Error fetching danger zone alerts:', error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Get all alerts (optional for admins)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    // Only allow admins to get all alerts
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized access. Admin privileges required.' });
    }
    
    const alerts = await Alert.find().populate('animal', 'name'); // Populate animal name for each alert
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Delete an alert by ID
router.delete('/:alertId', authenticateJWT, async (req, res) => {
  try {
    // Find the alert first to verify ownership
    const alert = await Alert.findById(req.params.alertId);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found.' });
    }
    
    // Get the animal to verify ownership
    const animal = await Animal.findOne({ 
      _id: alert.animal,
      owner: req.user.id
    });
    
    // Allow deletion only if user owns the animal or is admin
    if (!animal && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized access.' });
    }
    
    const deletedAlert = await Alert.findByIdAndDelete(req.params.alertId);
    res.status(200).json({ message: 'Alert deleted successfully.' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Helper function to calculate distance between two geographical points (in km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// Helper function to convert degrees to radians
const toRad = (value) => {
  return value * (Math.PI / 180);
};

module.exports = router;