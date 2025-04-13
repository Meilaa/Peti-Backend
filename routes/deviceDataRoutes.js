const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const DeviceData = require('../models/DeviceData');
const Device = require('../models/Device');
const Animal = require('../models/Animal');
const WalkPath = require('../models/WalkPath');
const Territory = require('../models/Territory');
const DangerZone = require('../models/DangerZone');
const Alert = require('../models/Alert');
const authenticateJWT = require('../middleware/authenticateJWT');
const { isPointInPolygon, calculateDistance } = require('../utils/geofenceUtils');

const movementTracker = {};
const pendingPoints = {}; // Store points before the 2-minute threshold is reached

// Store last known status for animals (safe zone, danger zone)
const animalZoneStatus = {};

router.post('/', async (req, res) => {
    try {
        const messages = req.body.messages;
        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'No messages received' });
        }

        const savedEntries = await Promise.all(messages.map(async (data) => {
            try {
                const ident = data['ident'];
                if (!ident) throw new Error('Missing device ident');

                const device = await Device.findOne({ deviceId: ident }).exec();
                if (!device) throw new Error(`Device with ident ${ident} not found`);

                // Get the associated animal
                const animal = await Animal.findById(device.animal).exec();
                if (!animal) throw new Error(`Animal associated with device ${ident} not found`);

                // Ensure timestamp is a valid Date object
                let timestamp;
                if (!data['timestamp']) {
                    throw new Error(`Missing timestamp for device ${ident}`);
                }

                // Check if timestamp is in seconds (if so, multiply by 1000)
                if (typeof data['timestamp'] === 'number' && data['timestamp'] < 10000000000) {
                    timestamp = new Date(data['timestamp'] * 1000);
                } else {
                    timestamp = new Date(data['timestamp']);
                }

                // Validate the timestamp
                if (isNaN(timestamp.getTime())) {
                    throw new Error(`Invalid timestamp for device ${ident}`);
                }

                const positionLatitude = data['position.latitude'];
                const positionLongitude = data['position.longitude'];

                // Save device data
                const latestData = new DeviceData({
                    device: device._id,
                    batteryLevel: data['battery.level'],
                    deviceName: data['device.name'],
                    gnssStatus: data['gnss.status'],
                    movementStatus: data['movement.status'],
                    positionAltitude: data['position.altitude'],
                    positionDirection: data['position.direction'],
                    positionSpeed: data['position.speed'],
                    positionValid: data['position.valid'],
                    timestamp,
                    positionLatitude,
                    positionLongitude,
                });

                const savedData = await latestData.save();

                // Initialize movementTracker for new device or if undefined
                if (!movementTracker[ident]) {
                    movementTracker[ident] = {
                        lastMovement: timestamp, // initialize with current timestamp
                        movementStartTime: null, // when continuous movement started
                        falseDuration: 0, // how long movement has been 'false'
                        isSaving: false, // flag to control if we are currently saving
                    };
                }

                // Initialize pendingPoints array if it doesn't exist
                if (!pendingPoints[ident]) {
                    pendingPoints[ident] = [];
                }

                // Initialize zone status tracker for this animal if not exists
                if (!animalZoneStatus[animal._id.toString()]) {
                    animalZoneStatus[animal._id.toString()] = {
                        inSafeZone: null,
                        inDangerZone: null,
                        currentDangerZone: null,
                        currentDangerType: null,
                        lastChecked: null
                    };
                }

                const deviceTracker = movementTracker[ident];
                const timeSinceLastPoint = deviceTracker.lastMovement ? 
                    (timestamp - deviceTracker.lastMovement) : 0;
                
                // Skip walk tracking if latitude or longitude is missing
                const hasValidCoordinates = positionLatitude !== undefined && 
                                           positionLatitude !== null && 
                                           positionLongitude !== undefined && 
                                           positionLongitude !== null;
                
                if (hasValidCoordinates) {
                    // Check geofence and danger zones if we have valid coordinates
                    await checkGeofenceAndDangerZones(
                        animal, 
                        { latitude: positionLatitude, longitude: positionLongitude },
                        timestamp
                    );
                }
                
                if (data['movement.status'] === true && hasValidCoordinates) {
                    // Reset false duration counter when movement is true
                    deviceTracker.falseDuration = 0;
                    
                    // Store this point in the pending points for this device
                    pendingPoints[ident].push({
                        latitude: positionLatitude,
                        longitude: positionLongitude,
                        timestamp: timestamp
                    });
                    
                    // Update or initialize movementStartTime
                    if (!deviceTracker.movementStartTime) {
                        deviceTracker.movementStartTime = timestamp;
                        console.log(`Device ${ident}: Movement detected, starting movement timer`);
                    }
                    
                    // Check if we've been moving for 5+ minutes
                    const movementDuration = timestamp - deviceTracker.movementStartTime;
                    
                    // If not already saving and we've been moving for 5+ minutes, start saving
                    if (!deviceTracker.isSaving && movementDuration >= 5 * 60 * 1000) {
                        deviceTracker.isSaving = true;
                        console.log(`Device ${ident}: Started tracking movement after ${Math.round(movementDuration/1000)} seconds of activity`);
                        
                        // Save all pending points
                        if (pendingPoints[ident] && pendingPoints[ident].length > 0) {
                            const points = pendingPoints[ident];
                            // Filter out any points with invalid coordinates
                            const validPoints = points.filter(point => 
                                point.latitude !== undefined && point.latitude !== null && 
                                point.longitude !== undefined && point.longitude !== null
                            );
                            
                            if (validPoints.length > 0) {
                                await createWalkPathWithInitialPoints(device, validPoints);
                            }
                            pendingPoints[ident] = []; // Clear pending points after saving
                        }
                    } else if (deviceTracker.isSaving) {
                        // Save path data if we're in saving mode
                        await updateWalkPath(device, positionLatitude, positionLongitude, timestamp);
                    }
                } else if (data['movement.status'] === false) {
                    // Add to false duration counter
                    deviceTracker.falseDuration += timeSinceLastPoint;
                    
                    // Log when movement stops
                    if (deviceTracker.movementStartTime) {
                        console.log(`Device ${ident}: Movement stopped, starting idle timer`);
                        deviceTracker.movementStartTime = null; // Reset movement start time since movement has stopped
                    }
                    
                    // Check if we should stop saving (5+ minutes of false)
                    if (deviceTracker.isSaving && deviceTracker.falseDuration >= 5 * 60 * 1000) {
                        console.log(`Device ${ident}: Stopping track after ${Math.round(deviceTracker.falseDuration/1000)} seconds of inactivity`);
                        deviceTracker.isSaving = false;
                        deviceTracker.falseDuration = 0; // Reset false duration after stopping
                        
                        // Finalize the walk path by marking it as inactive
                        await WalkPath.findOneAndUpdate(
                            { device: device._id, isActive: true },
                            { isActive: false, endTime: timestamp },
                            { new: true }
                        ).exec();
                        
                        // Clear any remaining pending points for this device
                        pendingPoints[ident] = [];
                    }
                }
                
                // Always update lastMovement timestamp
                deviceTracker.lastMovement = timestamp;

                return savedData;
            } catch (error) {
                console.error(`Error saving device data: ${error.message}`);
                return null;
            }
        }));

        res.status(201).json({ message: 'Device data saved successfully', data: savedEntries.filter(Boolean) });
    } catch (error) {
        console.error('Error saving device data:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// New helper function to create a walk path with initial points
async function createWalkPathWithInitialPoints(device, points) {
    try {
        // Validate that we have at least one valid point
        if (!points || points.length === 0 || 
            !points[0].latitude || !points[0].longitude) {
            console.log(`Skipping walk creation for device ${device.deviceId}: No valid coordinates`);
            return;
        }
        
        // Create a new walk path with all the pending points
        const activeWalk = new WalkPath({
            device: device._id,
            isActive: true,
            startTime: points[0].timestamp, // Use the first point's timestamp as start time
            coordinates: points
        });
        await activeWalk.save();
        console.log(`Started new walk for device ${device.deviceId} with ${points.length} initial points`);
    } catch (error) {
        console.error(`Error creating walk path with initial points: ${error.message}`);
    }
}

// Helper function to update WalkPath when movement is detected
async function updateWalkPath(device, positionLatitude, positionLongitude, timestamp) {
    try {
        // Skip if latitude or longitude is missing
        if (positionLatitude === undefined || positionLatitude === null || 
            positionLongitude === undefined || positionLongitude === null) {
            console.log(`Skipping walk update for device ${device.deviceId}: Missing coordinates`);
            return;
        }
        
        let activeWalk = await WalkPath.findOne(
            { device: device._id, isActive: true }
        ).exec();
        
        if (!activeWalk) {
            // Create a new walk path if none exists
            activeWalk = new WalkPath({
                device: device._id,
                isActive: true,
                startTime: timestamp,
                coordinates: [{ latitude: positionLatitude, longitude: positionLongitude, timestamp }]
            });
            await activeWalk.save();
            console.log(`Started new walk for device ${device.deviceId}`);
        } else {
            // Add coordinates to existing walk path
            activeWalk.coordinates.push({ latitude: positionLatitude, longitude: positionLongitude, timestamp });
            await activeWalk.save();
        }
    } catch (error) {
        console.error(`Error updating walk path: ${error.message}`);
    }
}

// GET route to fetch device data (unchanged)
router.get('/', authenticateJWT, async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }

        const userId = req.user._id;

        // Fetch devices owned by the user
        const userDevices = await Device.find({ user: userId }).exec();

        if (!userDevices.length) {
            return res.status(404).json({ message: "No devices found for this user" });
        }

        // Extract device IDs and convert them to ObjectId
        const deviceIds = userDevices.map(device => new mongoose.Types.ObjectId(device._id));

        // Fetch the latest data per device
        const deviceData = await DeviceData.aggregate([
            { $match: { device: { $in: deviceIds } } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$device",
                    latestData: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$latestData" } }
        ]).exec();

        // Format data with animal names - prioritize animal names over device names
        const formattedData = await Promise.all(userDevices.map(async (device) => {
            try {
                // Check if there is data for the current device
                const deviceObjectId = device._id.toString();
                const existingData = deviceData.find(data => 
                    data.device && data.device.toString() === deviceObjectId
                );
                
                // Default values if no data exists
                let animalName = 'Unknown Animal';
                let batteryLevel = 'N/A';
                let positionLatitude = 54.6892; // Default latitude
                let positionLongitude = 25.2798; // Default longitude
                let positionAltitude = 100; // Default altitude
                let isOffline = true;
                let gnssStatus = false;
                
                // Always try to get animal name first
                if (device && device.animal && mongoose.Types.ObjectId.isValid(device.animal)) {
                    const animal = await Animal.findById(device.animal).exec();
                    if (animal && animal.name) {
                        animalName = animal.name;
                    } else {
                        animalName = device.deviceName || 'Unknown Animal';
                    }
                } else {
                    animalName = device.deviceName || 'Unknown Animal';
                }

                // If device has data, use it
                if (existingData) {
                    batteryLevel = existingData.batteryLevel;
                    positionLatitude = existingData.positionLatitude;
                    positionLongitude = existingData.positionLongitude;
                    positionAltitude = existingData.positionAltitude;
                    gnssStatus = existingData.gnssStatus;
                    isOffline = !existingData.gnssStatus;
                }

                return {
                    _id: device._id,
                    device: device._id,
                    batteryLevel,
                    deviceName: device.deviceName || 'Unknown Device',
                    gnssStatus,
                    movementStatus: existingData ? existingData.movementStatus : 'Stationary',
                    positionAltitude,
                    positionDirection: existingData ? existingData.positionDirection : 'N/A',
                    positionSpeed: existingData ? existingData.positionSpeed : '0',
                    positionValid: existingData ? existingData.positionValid : false,
                    timestamp: existingData ? existingData.timestamp : new Date(),
                    positionLatitude,
                    positionLongitude,
                    animalName, // Always provide animal name
                    isOffline,
                    object_id: device._id
                };
            } catch (error) {
                console.error(`Error processing device data: ${error.message}`);
                return null;
            }
        }));

        const validData = formattedData.filter(Boolean);

        // Send the response with valid data
        res.status(200).json(validData);
    } catch (error) {
        console.error('Error fetching device data:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Helper function to calculate total distance for a walk
function calculateTotalDistance(coordinates) {
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    return totalDistance;
}

function calculateDuration(coordinates) {
    if (!coordinates || coordinates.length < 2) return 0;

    let totalDurationMs = 0;

    for (let i = 1; i < coordinates.length; i++) {
        const prevTime = new Date(coordinates[i - 1].timestamp);
        const currTime = new Date(coordinates[i].timestamp);

        const diffMs = currTime - prevTime;

        // Only count gaps smaller than 2 minutes (or adjust threshold)
        if (diffMs > 0 && diffMs <= 2 * 60 * 1000) {
            totalDurationMs += diffMs;
        }
    }

    return Math.round(totalDurationMs / (1000 * 60)); // Return duration in minutes
} 

// Modify the GET /walks/:deviceId route to include distance and duration
router.get('/walks/:deviceId', authenticateJWT, async (req, res) => {
    try {
      const { deviceId } = req.params;
      const userId = req.user._id;
  
      const device = await Device.findOne({ _id: deviceId, user: userId }).exec();
      if (!device) {
        return res.status(404).json({ error: "Device not found or not owned by user" });
      }
  
      // Get completed walks
      const walks = await WalkPath.find({ device: deviceId, isActive: false })
        .sort({ endTime: -1 })
        .limit(10)
        .exec();
  
      // Get currently active walk (if any)
      const activeWalk = await WalkPath.findOne({ device: deviceId, isActive: true }).exec();
  
      // Enrich finished walks with stats
      const walksWithStats = walks
        .filter(walk => walk && walk.coordinates)
        .map((walk) => {
          const distance = calculateTotalDistance(walk.coordinates);
          const duration = calculateDuration(walk.coordinates);
          return {
            ...walk.toObject(),
            distance,
            duration,
          };
        });
  
      // ✅ Declare before using it
      let activeWalkWithStats = null;
  
      if (activeWalk && activeWalk.coordinates?.length > 0) {
        const distance = calculateTotalDistance(activeWalk.coordinates);
        const duration = calculateDuration(activeWalk.coordinates); // Already fixed to ignore gaps
        activeWalkWithStats = {
          ...activeWalk.toObject(),
          distance,
          duration,
        };
      }
  
      return res.status(200).json({
        recentWalks: walksWithStats,
        activeWalk: activeWalkWithStats,
      });
    } catch (error) {
      console.error('Error fetching walk data:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });
  
  
// Helper function to check geofence and danger zones for an animal
async function checkGeofenceAndDangerZones(animal, position, timestamp) {
    try {
        const animalId = animal._id.toString();
        const status = animalZoneStatus[animalId];
        
        // Skip checks if we've checked recently (e.g., within the last 10 seconds)
        if (status.lastChecked && (timestamp - status.lastChecked) < 10000) {
            return;
        }
        
        // Find territories (safe zones) for this animal
        const territories = await Territory.find({ animal: animal._id }).exec();
        
        // Find danger zones for this animal
        const dangerZones = await DangerZone.find({ animal: animal._id }).exec();
        
        // Check if animal is in any safe zone
        let inSafeZone = false;
        for (const territory of territories) {
            if (isPointInPolygon(position, territory.coordinates)) {
                inSafeZone = true;
                break;
            }
        }
        
        // Check if animal is in any danger zone
        let inDangerZone = false;
        let currentDangerZone = null;
        let currentDangerType = null;
        
        for (const dangerZone of dangerZones) {
            if (isPointInPolygon(position, dangerZone.coordinates)) {
                inDangerZone = true;
                currentDangerZone = dangerZone._id;
                currentDangerType = dangerZone.dangerType;
                break;
            }
        }
        
        // Create alerts if status has changed
        if (status.inSafeZone !== inSafeZone) {
            // Animal has entered or left a safe zone
            if (!inSafeZone) {
                // Animal left the safe zone
                await createAlert(
                    animal._id,
                    'Geofence',
                    'Animal left the safe zone',
                    position,
                    null,
                    null
                );
                console.log(`🚨 Alert: Animal ${animal.name} left the safe zone`);
            }
        }
        
        if (status.inDangerZone !== inDangerZone) {
            // Animal has entered or left a danger zone
            if (inDangerZone) {
                // Animal entered a danger zone
                await createAlert(
                    animal._id,
                    'DangerZone',
                    `⚠️ Animal entered danger zone: ${currentDangerType}`,
                    position,
                    currentDangerZone,
                    currentDangerType
                );
                console.log(`⚠️ Alert: Animal ${animal.name} entered danger zone (${currentDangerType})`);
            } else if (status.inDangerZone) {
                // Animal left a danger zone
                await createAlert(
                    animal._id,
                    'DangerZone',
                    `Animal left danger zone: ${status.currentDangerType}`,
                    position,
                    status.currentDangerZone,
                    status.currentDangerType
                );
                console.log(`✅ Alert: Animal ${animal.name} left danger zone (${status.currentDangerType})`);
            }
        }
        
        // Update stored status
        status.inSafeZone = inSafeZone;
        status.inDangerZone = inDangerZone;
        status.currentDangerZone = currentDangerZone;
        status.currentDangerType = currentDangerType;
        status.lastChecked = timestamp;
        
    } catch (error) {
        console.error(`Error checking geofence and danger zones: ${error.message}`);
    }
}

// Helper function to create an alert
async function createAlert(animalId, alertType, description, position, dangerZoneId, dangerType) {
    try {
        const alert = new Alert({
            animal: animalId,
            alertType,
            description,
            threshold: {
                latitude: position.latitude,
                longitude: position.longitude,
                radius: 0 // Not relevant for polygon-based zones
            },
            location: {
                latitude: position.latitude,
                longitude: position.longitude
            },
            status: 'triggered',
            timestamp: new Date(),
            dangerZone: dangerZoneId,
            dangerType
        });
        
        await alert.save();
        return alert;
    } catch (error) {
        console.error(`Error creating alert: ${error.message}`);
        return null;
    }
}

module.exports = router;