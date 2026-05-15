const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const prisma = require('../lib/prisma');

const router = express.Router();

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

// GET /api/billing/status
router.get('/status', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { subscriptionStatus: true, trialEndsAt: true, subscriptionId: true, stripeCustomerId: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/create-checkout-session
router.post('/create-checkout-session', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${frontendUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl()}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/portal — manage existing subscription
router.post('/portal', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.stripeCustomerId) return res.status(400).json({ error: 'No subscription found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl()}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
