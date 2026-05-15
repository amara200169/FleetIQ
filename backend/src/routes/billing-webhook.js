const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await prisma.user.updateMany({
          where: { stripeCustomerId: session.customer },
          data: { subscriptionStatus: 'active', subscriptionId: session.subscription },
        });
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await prisma.user.updateMany({
          where: { stripeCustomerId: sub.customer },
          data: { subscriptionStatus: sub.status, subscriptionId: sub.id },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await prisma.user.updateMany({
          where: { stripeCustomerId: sub.customer },
          data: { subscriptionStatus: 'canceled' },
        });
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
};
