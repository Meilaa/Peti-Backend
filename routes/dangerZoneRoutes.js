const express = require('express');
const router = express.Router();
const DangerZone = require('../models/DangerZone');
const authenticateJWT = require('../middleware/authenticateJWT');

// Debug test route
router.get('/test', (req, res) => {
  console.log('✅ Danger Zone routes test endpoint reached');
  res.json({ message: 'Danger Zone routes are working' });
});

// Get all danger zones for the authenticated user
router.get('/', authenticateJWT, async (req, res) => {
  console.log('🔍 GET /danger-zones request received, user:', req.user.id);
  try {
    const dangerZones = await DangerZone.find({ user: req.user.id })
      .populate('animal', 'name')
      .sort({ updatedAt: -1 });
    
    console.log(`✅ Found ${dangerZones.length} danger zones for user ${req.user.id}`);
    res.json(dangerZones);
  } catch (error) {
    console.error('❌ Error fetching danger zones:', error);
    res.status(500).json({ error: 'Failed to fetch danger zones' });
  }
});

// Get a specific danger zone by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  console.log(`🔍 GET /danger-zones/${req.params.id} request received`);
  try {
    const dangerZone = await DangerZone.findOne({ 
      _id: req.params.id,
      user: req.user.id
    }).populate('animal', 'name');
    
    if (!dangerZone) {
      console.log(`❌ Danger Zone ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({ error: 'Danger Zone not found' });
    }
    
    console.log(`✅ Found danger zone ${req.params.id}`);
    res.json(dangerZone);
  } catch (error) {
    console.error(`❌ Error fetching danger zone ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch danger zone' });
  }
});

// Create a new danger zone
router.post('/', authenticateJWT, async (req, res) => {
  console.log('📝 POST /danger-zones request received');
  console.log('Request body:', JSON.stringify(req.body));
  try {
    const { name, description, dangerType, coordinates, animalId } = req.body;
    
    if (!name || !coordinates || !animalId || !dangerType) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Name, coordinates, dangerType, and animalId are required' });
    }
    
    if (coordinates.length < 4) {
      console.log('❌ Danger Zone must have at least 4 points');
      return res.status(400).json({ error: 'A danger zone must have at least 4 points' });
    }
    
    const dangerZone = new DangerZone({
      name,
      description,
      dangerType,
      coordinates,
      user: req.user.id,
      animal: animalId
    });
    
    await dangerZone.save();
    console.log(`✅ New danger zone created with ID: ${dangerZone._id}`);
    
    res.status(201).json(dangerZone);
  } catch (error) {
    console.error('❌ Error creating danger zone:', error);
    res.status(500).json({ error: 'Failed to create danger zone' });
  }
});

// Update a danger zone
router.put('/:id', authenticateJWT, async (req, res) => {
  console.log(`📝 PUT /danger-zones/${req.params.id} request received`);
  try {
    const { name, description, dangerType, coordinates, animalId } = req.body;
    
    if (coordinates && coordinates.length < 4) {
      console.log('❌ Danger Zone must have at least 4 points');
      return res.status(400).json({ error: 'A danger zone must have at least 4 points' });
    }
    
    const dangerZone = await DangerZone.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { 
        name, 
        description, 
        dangerType,
        coordinates,
        animal: animalId,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!dangerZone) {
      console.log(`❌ Danger Zone ${req.params.id} not found for update`);
      return res.status(404).json({ error: 'Danger Zone not found' });
    }
    
    console.log(`✅ Danger Zone ${req.params.id} updated successfully`);
    res.json(dangerZone);
  } catch (error) {
    console.error(`❌ Error updating danger zone ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update danger zone' });
  }
});

// Delete a danger zone
router.delete('/:id', authenticateJWT, async (req, res) => {
  console.log(`🗑️ DELETE /danger-zones/${req.params.id} request received`);
  try {
    const dangerZone = await DangerZone.findOneAndDelete({ 
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!dangerZone) {
      console.log(`❌ Danger Zone ${req.params.id} not found for deletion`);
      return res.status(404).json({ error: 'Danger Zone not found' });
    }
    
    console.log(`✅ Danger Zone ${req.params.id} deleted successfully`);
    res.json({ message: 'Danger Zone deleted successfully' });
  }
  catch (error) {
    console.error(`❌ Error deleting danger zone ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete danger zone' });
  }
});

module.exports = router; 