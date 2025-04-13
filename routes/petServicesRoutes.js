const express = require('express');
const router = express.Router();
const axios = require('axios');

// Google Places API key
const GOOGLE_PLACES_API_KEY = 'AIzaSyDxVfB8UGo18w-COfsc6bdBiXyBwMEcSVo';
const GOOGLE_SIGNING_SECRET = 'nejCIamqvTznGVMfUTonl7JTE6k=';

// Mock data for demonstration purposes
const generateMockData = (type, lat, lng) => {
  const count = 8; // Number of mock locations
  const radius = 0.01; // Roughly 1km
  
  let mockServiceNames = [];
  let mockPhotos = [];
  
  if (type === 'veterinary_care') {
    mockServiceNames = [
      "Paws & Claws Veterinary Clinic", 
      "Happy Pets Animal Hospital", 
      "Furry Friends Vet Care", 
      "Healthy Paws Veterinary",
      "City Animal Hospital",
      "PetMed Emergency Care",
      "Main Street Animal Clinic",
      "All Creatures Veterinary"
    ];
    mockPhotos = ['https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'];
  } else if (type === 'pet_store') {
    mockServiceNames = [
      "Pet Supplies Plus", 
      "Pawsome Pet Store", 
      "The Pet Pantry", 
      "Bark Avenue Pet Boutique",
      "Fur & Feathers Pet Shop",
      "The Pampered Pet",
      "Pet Paradise Supplies",
      "Wags to Whiskers Shop"
    ];
    mockPhotos = ['https://images.unsplash.com/photo-1583036623774-75a5b52345e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'];
  } else if (type === 'lodging') {
    mockServiceNames = [
      "Luxury Paws Pet Resort", 
      "Happy Tails Pet Hotel", 
      "Pet Paradise Inn", 
      "The Barking Lot Suites",
      "Pets R&R Boarding",
      "Cozy Pets Hotel",
      "Furry Friends Retreat",
      "Pampered Paws Inn"
    ];
    mockPhotos = ['https://images.unsplash.com/photo-1546967900-1bea5f16b69d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'];
  }
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    // Generate random offset for coordinates
    const latOffset = (Math.random() - 0.5) * radius;
    const lngOffset = (Math.random() - 0.5) * radius;
    
    results.push({
      id: `mock-${type}-${i}`,
      name: mockServiceNames[i % mockServiceNames.length],
      geometry: {
        location: {
          lat: parseFloat(lat) + latOffset,
          lng: parseFloat(lng) + lngOffset
        }
      },
      vicinity: `${Math.floor(Math.random() * 1000) + 100} Main Street`,
      rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
      user_ratings_total: Math.floor(Math.random() * 100) + 10,
      photos: [{ photo_reference: mockPhotos[0] }],
      opening_hours: { open_now: Math.random() > 0.3 }, // 70% chance to be open
      phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      website: "https://www.example.com",
      services: ['Pet Examination', 'Vaccinations', 'Grooming', 'Surgery'] 
    });
  }
  
  return results;
};

// Test route to check if the pet services API is working
router.get('/test', (req, res) => {
  console.log('Pet services test route accessed');
  res.json({ message: 'Pet services API is working' });
});

// Get nearby pet services based on type and location
router.get('/nearby', async (req, res) => {
  try {
    const { type, lat, lng, radius = 5000 } = req.query;
    
    if (!type || !lat || !lng) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Please provide type, lat, and lng.' 
      });
    }
    
    // Using Google Places API with the provided key
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      // If Google API call is successful, return the data
      if (response.data && response.data.status === 'OK') {
        return res.json(response.data);
      } else {
        console.log('Google Places API returned non-OK status:', response.data.status);
        throw new Error(`Google Places API error: ${response.data.status}`);
      }
    } catch (apiError) {
      console.error('Error calling Google Places API:', apiError.message);
      // Fall back to mock data if the API call fails
      console.log('Falling back to mock data');
      const mockData = generateMockData(type, lat, lng);
      
      res.json({
        status: 'OK',
        results: mockData,
        source: 'mock' // Indicate this is mock data
      });
    }
  } catch (error) {
    console.error('Error fetching nearby pet services:', error);
    res.status(500).json({ error: 'Failed to fetch nearby pet services', details: error.message });
  }
});

// Get details of a specific pet service
router.get('/details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    
    // Using Google Places API with the provided key
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,formatted_phone_number,formatted_address,opening_hours,website,photos,reviews&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      // If Google API call is successful, return the data
      if (response.data && response.data.status === 'OK') {
        return res.json(response.data);
      } else {
        console.log('Google Places API returned non-OK status:', response.data.status);
        throw new Error(`Google Places API error: ${response.data.status}`);
      }
    } catch (apiError) {
      console.error('Error calling Google Places API Details:', apiError.message);
      // Fall back to mock data if the API call fails
      
      // For demonstration purposes, we'll use mock data
      res.json({
        status: 'OK',
        result: {
          name: 'Paws & Claws Veterinary Clinic',
          rating: 4.5,
          user_ratings_total: 120,
          formatted_phone_number: '(555) 123-4567',
          formatted_address: '123 Main Street, Anytown, USA',
          opening_hours: {
            weekday_text: [
              'Monday: 8:00 AM – 6:00 PM',
              'Tuesday: 8:00 AM – 6:00 PM',
              'Wednesday: 8:00 AM – 6:00 PM',
              'Thursday: 8:00 AM – 6:00 PM',
              'Friday: 8:00 AM – 6:00 PM',
              'Saturday: 9:00 AM – 4:00 PM',
              'Sunday: Closed'
            ],
            open_now: true
          },
          website: 'https://www.example.com',
          photos: [
            { photo_reference: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' }
          ],
          reviews: [
            {
              author_name: 'John Doe',
              rating: 5,
              text: 'Great service! My pet loved it here.'
            },
            {
              author_name: 'Jane Smith',
              rating: 4,
              text: 'Professional and caring staff.'
            }
          ],
          services: ['Pet Examination', 'Vaccinations', 'Grooming', 'Surgery'],
          source: 'mock' // Indicate this is mock data
        }
      });
    }
  } catch (error) {
    console.error('Error fetching pet service details:', error);
    res.status(500).json({ error: 'Failed to fetch pet service details', details: error.message });
  }
});

module.exports = router; 