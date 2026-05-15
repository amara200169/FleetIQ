const express = require('express');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const prisma = require('../lib/prisma');

const router = express.Router();

// POST /api/drivers/location — driver updates their own location
router.post('/location', auth, roles('DRIVER'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Update driver's current position and save a breadcrumb in one transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: { latitude: lat, longitude: lng },
      }),
      prisma.locationHistory.create({
        data: { driverId: req.user.id, latitude: lat, longitude: lng },
      }),
    ]);

    // Find all vehicles this driver is assigned to, then notify their owners
    const vehicles = await prisma.vehicle.findMany({
      where: { driverId: req.user.id },
      select: { ownerId: true },
    });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        driverId: req.user.id,
        email: req.user.email,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString(),
      };
      // Emit to each fleet owner who owns a vehicle driven by this driver
      const ownerIds = [...new Set(vehicles.map((v) => v.ownerId))];
      ownerIds.forEach((ownerId) => io.to(`owner:${ownerId}`).emit('driver:location', payload));
    }

    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers/location — driver fetches their own current location
router.get('/location', auth, roles('DRIVER'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { latitude: true, longitude: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers/locations — locations of drivers assigned to this owner's vehicles only
router.get('/locations', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { ownerId: req.user.id, driverId: { not: null } },
      select: { driverId: true },
    });
    const driverIds = vehicles.map((v) => v.driverId);
    const drivers = await prisma.user.findMany({
      where: { id: { in: driverIds }, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, email: true, firstName: true, lastName: true, latitude: true, longitude: true },
    });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers/:id/location-history — breadcrumb trail (only for owner's drivers)
router.get('/:id/location-history', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    const vehicle = await prisma.vehicle.findFirst({ where: { ownerId: req.user.id, driverId } });
    if (!vehicle) return res.status(403).json({ error: 'Driver not assigned to your fleet' });
    const history = await prisma.locationHistory.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { latitude: true, longitude: true, createdAt: true },
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
