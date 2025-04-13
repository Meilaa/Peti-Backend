/**
 * Utility functions for geofencing and polygon calculations
 */

/**
 * Check if a point is inside a polygon using the ray casting algorithm
 * 
 * @param {Object} point - The point to check {latitude, longitude}
 * @param {Array} polygon - Array of points forming the polygon [{latitude, longitude}, ...]
 * @returns {boolean} - True if the point is inside the polygon, false otherwise
 */
function isPointInPolygon(point, polygon) {
  if (!point || !polygon || polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect = ((yi > point.latitude) != (yj > point.latitude))
        && (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate distance between two geographical points (in km)
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0; // Validate coordinates
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Convert degrees to radians
 * 
 * @param {number} value - Value in degrees
 * @returns {number} - Value in radians
 */
function toRad(value) {
  return value * (Math.PI / 180);
}

/**
 * Convert degrees to radians (alias function)
 * 
 * @param {number} deg - Value in degrees
 * @returns {number} - Value in radians
 */
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = {
  isPointInPolygon,
  calculateDistance,
  toRad,
  deg2rad
}; 