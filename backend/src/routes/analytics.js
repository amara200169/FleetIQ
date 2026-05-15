const express = require('express');
const axios = require('axios');

const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/analytics/fleet — fleet owner analytics
router.get('/fleet', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ where: { ownerId: req.user.id } });
    const deliveries = await prisma.delivery.findMany({
      where: { vehicle: { ownerId: req.user.id } },
    });

    const total = vehicles.length;
    const active = vehicles.filter((v) => v.active).length;
    const withDriver = vehicles.filter((v) => v.driverId).length;
    const delivered = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const pending = deliveries.filter((d) => d.status !== 'DELIVERED').length;

    res.json({
      total_vehicles: total,
      active_vehicles: active,
      total_drivers: withDriver,
      total_deliveries: deliveries.length,
      delivered,
      pending,
      driver_to_vehicle_ratio: total ? Math.round((withDriver / total) * 100) / 100 : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/proxy/distance-matrix
router.get('/proxy/distance-matrix', auth, async (req, res) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }
    const { data } = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: { origins: origin, destinations: destination, units: 'imperial', key: process.env.GOOGLE_MAPS_API_KEY },
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
