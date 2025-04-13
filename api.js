const axios = require('axios'); 

// Configuration (ideally these should be environment variables)
const FLESPI_TOKEN = "Tyw5lqxUcsGcQagnjqLhXlGlqyDsbuIMSg2HyakUsz4hXf3HlVyRPBMYEJS9UFsG";
const CHANNEL_ID = 1231871;
const FLESPI_API_URL = `https://flespi.io/gw/channels/${CHANNEL_ID}/messages`;
const BACKEND_API_URL = "http://localhost:3001/api/deviceData";
const POLLING_INTERVAL = 30000; // 30 seconds

// Headers for Flespi API request
const flespiHeaders = {
    "Authorization": `FlespiToken ${FLESPI_TOKEN}`,
    "Content-Type": "application/json"
};

// Store the last processed message timestamp
let lastProcessedTimestamp = 0;
let isRunning = true;

// Function to fetch new messages from Flespi
const fetchNewMessages = async () => {
    try {
        const response = await axios.get(FLESPI_API_URL, { 
            headers: flespiHeaders,
            timeout: 10000 // Add timeout to prevent hanging
        });

        if (!response.data?.result || response.data.result.length === 0) {
            console.log("⚠️ No new messages received from Flespi.");
            return [];
        }

        // Filter out messages that have already been processed
        const newMessages = response.data.result.filter(message => {
            const timestamp = message.timestamp || 0;
            return timestamp > lastProcessedTimestamp;
        });

        console.log(`✅ Received ${newMessages.length} new messages from Flespi.`);
        
        // Update the lastProcessedTimestamp to the latest message timestamp
        if (newMessages.length > 0) {
            lastProcessedTimestamp = Math.max(...newMessages.map(msg => msg.timestamp || 0));
        }

        return newMessages;
    } catch (error) {
        console.error("❌ Failed to fetch data from Flespi:", error.response?.data || error.message);
        return [];
    }
};

// Function to send messages to the backend with retry logic
const sendDataToBackend = async (messages, retries = 3) => {
    let attempt = 0;
    
    while (attempt < retries) {
        try {
            const response = await axios.post(BACKEND_API_URL, { messages }, {
                timeout: 10000 // Add timeout
            });
            console.log(`✅ Successfully sent ${messages.length} messages to backend.`);
            return true;
        } catch (error) {
            attempt++;
            console.error(`❌ Backend error (attempt ${attempt}/${retries}):`, error.response?.data || error.message);
            
            if (attempt < retries) {
                // Exponential backoff
                const delay = 1000 * Math.pow(2, attempt);
                console.log(`Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    return false;
};

// Main function to fetch & send data every 30 seconds
const main = async () => {
    console.log("🚀 Starting Flespi data sync service...");
    
    // Setup graceful shutdown
    process.on('SIGINT', () => {
        console.log("🛑 Received shutdown signal. Shutting down gracefully...");
        isRunning = false;
    });
    
    while (isRunning) {
        try {
            const messages = await fetchNewMessages();
            if (messages.length > 0) {
                await sendDataToBackend(messages);
            }
        } catch (error) {
            console.error("❌ Unexpected Error in Main Loop:", error.message);
        }

        // Wait for the polling interval
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
    
    console.log("👋 Service stopped.");
};

// Start the script
main();
