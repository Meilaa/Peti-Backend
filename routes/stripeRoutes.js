// routes/stripeRoutes.js
const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const authenticateJWT = require('../middleware/authenticateJWT');

// Payment routes
router.post('/create-payment-intent', authenticateJWT, stripeController.createPaymentIntent);

// Customer routes
router.post('/create-customer', authenticateJWT, stripeController.createCustomer);

// Subscription routes
router.post('/create-subscription', authenticateJWT, stripeController.createSubscription);
router.get('/subscription', authenticateJWT, stripeController.getSubscription);
router.post('/cancel-subscription/:subscriptionId', authenticateJWT, stripeController.cancelSubscription);

// Webhook handler (this route should be configured in Stripe dashboard)
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeController.handleWebhook);

module.exports = router;
