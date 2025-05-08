// controllers/stripeController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


exports.createPaymentIntent = async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 500, // €5.00 = 500 cents
      currency: 'eur',
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
};
