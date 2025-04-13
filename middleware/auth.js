// Use existing authenticateJWT middleware
const authenticateJWT = require('./authenticateJWT');

// Simple wrapper around authenticateJWT for backward compatibility
const auth = authenticateJWT;

module.exports = auth; 