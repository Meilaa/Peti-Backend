require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const animalRoutes = require('./routes/animalRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const userRoutes = require('./routes/userRoutes');
const alertRoutes = require('./routes/alertRoutes');
const deviceDataRoutes = require('./routes/deviceDataRoutes'); // ✅ Added missing route
const territoryRoutes = require('./routes/territoryRoutes'); // ✅ Add territory routes
const dangerZoneRoutes = require('./routes/dangerZoneRoutes'); // ✅ Add danger zone routes
const calendarEventRoutes = require('./routes/calendarEventRoutes'); // ✅ Add calendar events routes
const petServicesRoutes = require('./routes/petServicesRoutes'); // ✅ Add pet services routes

const app = express();

// ✅ Increase Request Size Limit (Fix PayloadTooLargeError)
app.use(bodyParser.json({ limit: '50mb' })); // Increase JSON size limit
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded size limit

app.use(cors());
app.use(express.json());
// Root Test Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Admin route to test all endpoints
app.get('/admin/routes', (req, res) => {
  console.log('Admin routes check requested');
  
  // Get all registered routes
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const routePath = handler.route.path;
          const fullPath = middleware.regexp.toString()
            .replace('/^\\', '')  // Remove the beginning
            .replace('\\/?(?=\\/|$)/i', '')  // Remove the end
            .replace(/\\\//g, '/');  // Replace \/ with /
            
          routes.push({
            path: fullPath + routePath,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  // Return registered routes
  res.json({
    message: 'Routes check',
    registeredRoutes: routes,
    apiRoutes: [
      { path: '/api/animals', status: 'Registered' },
      { path: '/api/devices', status: 'Registered' },
      { path: '/api/users', status: 'Registered' },
      { path: '/api/alerts', status: 'Registered' },
      { path: '/api/locations', status: 'Registered' },
      { path: '/api/alerts', status: 'Registered' },
      { path: '/api/deviceData', status: 'Registered' },
      { path: '/api/territories', status: 'Registered' },
      { path: '/api/danger-zones', status: 'Registered' },
      { path: '/api/calendar-events', status: 'Registered' },
      { path: '/api/pet-services', status: 'Registered' }
    ]
  });
});

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Mount API Routes
app.use('/api/animals', animalRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/deviceData', deviceDataRoutes); // ✅ Added missing route
app.use('/api/territories', territoryRoutes); // ✅ Add territory routes
app.use('/api/danger-zones', dangerZoneRoutes); // ✅ Add danger zone routes
app.use('/api/calendar-events', calendarEventRoutes); // ✅ Add calendar events routes
app.use('/api/pet-services', petServicesRoutes); // ✅ Add pet services routes

// Start Server
const PORT = 3001; // or any other available port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Available routes:`);
    console.log(` - GET  /`);
    console.log(` - GET  /admin/routes`);
    console.log(` - GET  /api/territories`);
    console.log(` - GET  /api/territories/test`);
    console.log(` - GET  /api/danger-zones`);
    console.log(` - GET  /api/danger-zones/test`);
    console.log(` - GET  /api/calendar-events`);
    console.log(` - GET  /api/calendar-events/test`);
    console.log(` - GET  /api/pet-services/test`);
    console.log(` - GET  /api/pet-services/nearby`);
});