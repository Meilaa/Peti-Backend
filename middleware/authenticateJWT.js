const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Device = require('../models/Device');

const authenticateJWT = async (req, res, next) => {
  // Extract token from Authorization header
  const token = req.header('Authorization')?.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Authentication failed, token missing' });
  }

  try {
    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');

    const userId = decoded._id || decoded.id; // Use either _id or id depending on the token's structure

    if (!userId) {
      return res.status(401).json({ message: 'Invalid token structure', decoded });
    }

    // Fetch the user from the database
    const user = await User.findById(userId).populate('devices'); // populate devices if needed
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Attach the user to the request object
    req.user = user;
    
    // Call the next middleware or route handler
    next();

  } catch (error) {
    console.error("JWT verification error:", error);

    // Provide more specific error messages based on the JWT verification failure
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token is not valid' });
    }
    
    // General error message for other cases
    return res.status(403).json({ message: 'Token verification failed' });
  }
};

module.exports = authenticateJWT;
