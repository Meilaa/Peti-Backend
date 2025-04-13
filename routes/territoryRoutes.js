const express = require('express');
const router = express.Router();
const Territory = require('../models/Territory');
const authenticateJWT = require('../middleware/authenticateJWT');

// Debug test route
router.get('/test', (req, res) => {
  console.log('✅ Territory routes test endpoint reached');
  res.json({ message: 'Territory routes are working' });
});

// Get all territories for the authenticated user
router.get('/', authenticateJWT, async (req, res) => {
  console.log('🔍 GET /territories request received, user:', req.user.id);
  try {
    const territories = await Territory.find({ user: req.user.id })
      .populate('animal', 'name')
      .sort({ updatedAt: -1 });
    
    console.log(`✅ Found ${territories.length} territories for user ${req.user.id}`);
    res.json(territories);
  } catch (error) {
    console.error('❌ Error fetching territories:', error);
    res.status(500).json({ error: 'Failed to fetch territories' });
  }
});

// Get a specific territory by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  console.log(`🔍 GET /territories/${req.params.id} request received`);
  try {
    const territory = await Territory.findOne({ 
      _id: req.params.id,
      user: req.user.id
    }).populate('animal', 'name');
    
    if (!territory) {
      console.log(`❌ Territory ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({ error: 'Territory not found' });
    }
    
    console.log(`✅ Found territory ${req.params.id}`);
    res.json(territory);
  } catch (error) {
    console.error(`❌ Error fetching territory ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch territory' });
  }
});

// Create a new territory
router.post('/', authenticateJWT, async (req, res) => {
  console.log('📝 POST /territories request received');
  console.log('Request body:', JSON.stringify(req.body));
  try {
    const { name, description, coordinates, animalId } = req.body;
    
    if (!name || !coordinates || !animalId) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Name, coordinates, and animalId are required' });
    }
    
    if (coordinates.length < 4) {
      console.log('❌ Territory must have at least 4 points');
      return res.status(400).json({ error: 'A territory must have at least 4 points' });
    }
    
    const territory = new Territory({
      name,
      description,
      coordinates,
      user: req.user.id,
      animal: animalId
    });
    
    await territory.save();
    console.log(`✅ New territory created with ID: ${territory._id}`);
    
    res.status(201).json(territory);
  } catch (error) {
    console.error('❌ Error creating territory:', error);
    res.status(500).json({ error: 'Failed to create territory' });
  }
});

// Update a territory
router.put('/:id', authenticateJWT, async (req, res) => {
  console.log(`📝 PUT /territories/${req.params.id} request received`);
  try {
    const { name, description, coordinates, animalId } = req.body;
    
    if (coordinates && coordinates.length < 4) {
      console.log('❌ Territory must have at least 4 points');
      return res.status(400).json({ error: 'A territory must have at least 4 points' });
    }
    
    const territory = await Territory.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { 
        name, 
        description, 
        coordinates,
        animal: animalId,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!territory) {
      console.log(`❌ Territory ${req.params.id} not found for update`);
      return res.status(404).json({ error: 'Territory not found' });
    }
    
    console.log(`✅ Territory ${req.params.id} updated successfully`);
    res.json(territory);
  } catch (error) {
    console.error(`❌ Error updating territory ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update territory' });
  }
});

// Delete a territory
router.delete('/:id', authenticateJWT, async (req, res) => {
  console.log(`🗑️ DELETE /territories/${req.params.id} request received`);
  try {
    const territory = await Territory.findOneAndDelete({ 
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!territory) {
      console.log(`❌ Territory ${req.params.id} not found for deletion`);
      return res.status(404).json({ error: 'Territory not found' });
    }
    
    console.log(`✅ Territory ${req.params.id} deleted successfully`);
    res.json({ message: 'Territory deleted successfully' });
  } catch (error) {
    console.error(`❌ Error deleting territory ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete territory' });
  }
});

module.exports = router; 