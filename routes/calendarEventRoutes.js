const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const auth = require('../middleware/auth');

// Get all calendar events for a user
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔍 GET /calendar-events request received, user:', req.user.id);
    const events = await CalendarEvent.find({ user: req.user.id });
    console.log(`✅ Found ${events.length} calendar events for user ${req.user.id}`);
    res.json(events);
  } catch (error) {
    console.error('❌ Error fetching calendar events:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update calendar events
router.post('/', auth, async (req, res) => {
  try {
    console.log('📝 POST /calendar-events request received, user:', req.user.id);
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'Events array is required' });
    }
    
    console.log(`Processing ${events.length} calendar events`);
    
    // Process all events
    const savedEvents = [];
    
    for (const eventData of events) {
      // Make sure event has a valid ID
      if (!eventData.id) {
        console.error('Event missing ID, skipping');
        continue;
      }
      
      // Add user ID to the event
      eventData.user = req.user.id;
      
      // Check if event already exists
      let event = await CalendarEvent.findOne({ id: eventData.id });
      
      if (event) {
        // Update existing event
        Object.assign(event, eventData);
        await event.save();
        console.log(`Updated calendar event: ${event.id}`);
      } else {
        // Create new event
        event = new CalendarEvent(eventData);
        await event.save();
        console.log(`Created new calendar event: ${event.id}`);
      }
      
      savedEvents.push(event);
    }
    
    console.log(`✅ Successfully saved ${savedEvents.length} calendar events`);
    res.json(savedEvents);
  } catch (error) {
    console.error('❌ Error saving calendar events:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update your delete route to handle both single and recurring events with the same endpoint
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log(`🗑️ DELETE /calendar-events/${req.params.id} request received`);
    
    const { deleteAllRecurring } = req.query; // Add this to check if we should delete all recurring
    
    // Find the event by ID
    const event = await CalendarEvent.findOne({ 
      id: req.params.id,
      user: req.user.id 
    });

    if (!event) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    // Check if we should delete all recurring events
    if (deleteAllRecurring === 'true' && event.recurrence !== 'none') {
      // Delete all events with the same baseEventId
      const baseEventId = event.baseEventId || event.id.split('_')[0];
      await CalendarEvent.deleteMany({
        user: req.user.id,
        $or: [
          { id: { $regex: `^${baseEventId}` } },
          { baseEventId: baseEventId }
        ]
      });
      console.log(`✅ Deleted all recurring events for base ID: ${baseEventId}`);
    } else {
      // Just delete the single event
      await event.remove();
      console.log(`✅ Deleted single event: ${event.id}`);
    }

    res.json({ message: 'Calendar event(s) deleted' });
  } catch (error) {
    console.error('❌ Error deleting calendar event(s):', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test endpoint for checking if the route is working
router.get('/test', (req, res) => {
  res.json({ message: 'Calendar events route is working!' });
});

module.exports = router; 