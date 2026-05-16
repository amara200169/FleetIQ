const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/track/:slug — public, no auth required
router.get('/:slug', async (req, res) => {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: { trackingSlug: req.params.slug },
      select: {
        id: true,
        description: true,
        customerName: true,
        destination: true,
        pickupAddress: true,
        status: true,
        scheduledAt: true,
        deliveredAt: true,
        latitude: true,
        longitude: true,
        proofImage: true,
        trackingEvents: {
          orderBy: { createdAt: 'asc' },
          select: { event: true, notes: true, createdAt: true },
        },
        driver: {
          select: { firstName: true, lastName: true, latitude: true, longitude: true, lastSeen: true },
        },
        vehicle: {
          select: { make: true, model: true, licensePlate: true, color: true },
        },
      },
    });

    if (!delivery) return res.status(404).json({ error: 'Tracking link not found or expired' });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
