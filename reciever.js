const axios = require('axios');

// 🔑 Flespi API Token (Replace with your actual token)
const FLESPI_TOKEN = "lJpsNmslfzUxP9EyZtH4MpEoV6Ud3qTlQ2eKUHcvskyW8JYBYJs0LeFTeYEuAiBZ";

// 📡 Flespi Device ID
const DEVICE_ID = 6091336;

// 🌐 Flespi API Endpoint
const FLESPI_API_URL = `https://flespi.io/gw/devices/${DEVICE_ID}/messages`;

// 🔧 Headers for the HTTP request
const headers = {
    "Authorization": `FlespiToken ${FLESPI_TOKEN}`,
    "Content-Type": "application/json"
};

// 🌍 Initial fixed location (Berlin, Germany)
let currentLatitude = 52.5200;
let currentLongitude = 13.4050;

// Timer to track movement status
let movementStartTime = null;
let idleStartTime = null;
const movementDuration = 4 * 60 * 1000; // 4 minutes in milliseconds
const idleDuration = 2 * 60 * 1000; // 2 minutes idle duration
let movementStatus = false; // Starts as false (not moving)

// Function to generate slightly adjusted position (simulating movement)
const updateLocation = () => {
    if (movementStatus) {
        const latOffset = (Math.random() - 0.5) * 0.0005; // Smaller step for smoother movement
        const lonOffset = (Math.random() - 0.5) * 0.0005; // Smaller step for smoother movement

        currentLatitude += latOffset;
        currentLongitude += lonOffset;
    }
    // Don't update location when idle
};

// Function to generate fake telemetry data
const generateFakeData = () => {
    updateLocation(); // Update position before sending data

    return {
        "battery.level": Math.floor(Math.random() * 91) + 10,
        "battery.voltage": (Math.random() * (4.2 - 3.5) + 3.5).toFixed(3),
        "channel.id": 1231871,
        "codec.id": 142,
        "custom.param.116": 1,
        "device.id": DEVICE_ID,
        "device.name": "TMT250",
        "device.type.id": 508,
        "event.priority.enum": 0,
        "gnss.state.enum": 2,
        "gnss.status": true,
        "gsm.mcc": 246,
        "gsm.mnc": 1,
        "gsm.operator.code": "24601",
        "gsm.signal.level": Math.floor(Math.random() * 71) + 30,
        "ident": "352625692119264",
        "movement.status": movementStatus, // Use the current movement status
        "peer": "62.212.215.213:41991",
        "position.altitude": Math.floor(Math.random() * 501),
        "position.direction": Math.floor(Math.random() * 361),
        "position.hdop": (Math.random() * (2.0 - 0.5) + 0.5).toFixed(2),
        "position.pdop": (Math.random() * (2.0 - 0.5) + 0.5).toFixed(2),
        "position.satellites": Math.floor(Math.random() * 9) + 4,
        "position.speed": movementStatus ? Math.floor(Math.random() * 21) : 0, // Only set speed when moving
        "position.valid": true,
        "protocol.id": 14,
        "server.timestamp": Math.floor(Date.now() / 1000),
        "timestamp": Math.floor(Date.now() / 1000),
        "position.latitude": currentLatitude,
        "position.longitude": currentLongitude
    };
};

// Function to start walking phase
const startWalking = () => {
    console.log("🚶‍♂️ STARTING MOVEMENT PHASE: Setting movement.status = true for 4 minutes");
    movementStatus = true;
    movementStartTime = Date.now();
};

// Function to start idle phase
const startIdle = () => {
    console.log("🛑 ENDING MOVEMENT PHASE: Setting movement.status = false for 2 minutes");
    movementStatus = false;
    idleStartTime = Date.now();
};

// Function to send fake data to Flespi
const sendFakeData = async () => {
    // Start with the walking phase immediately
    startWalking();
    
    while (true) {
        const currentTime = Date.now();
        
        // Check if 4 minutes of walking have passed
        if (movementStatus && currentTime - movementStartTime >= movementDuration) {
            startIdle();
        }
        
        // Check if 2 minutes of idle have passed
        if (!movementStatus && currentTime - idleStartTime >= idleDuration) {
            startWalking();
        }
        
        // 🛰️ Generate fake TMT250 telemetry data
        const payload = [generateFakeData()];

        try {
            // 📡 Send data to Flespi
            const response = await axios.post(FLESPI_API_URL, payload, { headers });
            console.log(`✅ Message sent successfully with movement.status = ${movementStatus}`);
        } catch (error) {
            console.error(`❌ Failed to send message!`, error.response ? error.response.data : error.message);
        }

        // Wait 10 seconds before sending the next update
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
};

// 🔥 Start the simulation
console.log("🔄 Starting GPS data simulation with 4-min movement / 2-min idle cycles");
sendFakeData();