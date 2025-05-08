require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

// Import route modules
const animalRoutes = require('./routes/animalRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const userRoutes = require('./routes/userRoutes');
const alertRoutes = require('./routes/alertRoutes');
const deviceDataRoutes = require('./routes/deviceDataRoutes');
const territoryRoutes = require('./routes/territoryRoutes');
const dangerZoneRoutes = require('./routes/dangerZoneRoutes');
const calendarEventRoutes = require('./routes/calendarEventRoutes');
const petServicesRoutes = require('./routes/petServicesRoutes');
const stripeRoutes = require('./routes/stripeRoutes');

// Init Express App
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());

// Root Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Admin route to list all registered endpoints
app.get('/admin/routes', (req, res) => {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const routePath = handler.route.path;
          const fullPath = middleware.regexp.toString()
            .replace('/^\\', '')
            .replace('\\/?(?=\\/|$)/i', '')
            .replace(/\\\//g, '/');

          routes.push({
            path: fullPath + routePath,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  res.json({
    message: 'Registered routes:',
    routes,
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Register API Routes
app.use('/api/animals', animalRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/deviceData', deviceDataRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/danger-zones', dangerZoneRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/pet-services', petServicesRoutes);
app.use('/api/stripe', stripeRoutes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
