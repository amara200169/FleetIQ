const express = require('express');

const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();
const prisma = require('../lib/prisma');

const logSelect = {
  id: true, fuelAmount: true, fuelCost: true, odometer: true,
  fuelStation: true, notes: true, createdAt: true,
  vehicle: { select: { id: true, licensePlate: true, model: true, make: true } },
  driver: { select: { id: true, email: true, firstName: true, lastName: true } },
};

// GET /api/fuel
router.get('/', auth, async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'FLEET_OWNER') where = { vehicle: { ownerId: req.user.id } };
    else if (req.user.role === 'DRIVER') where = { driverId: req.user.id };

    const logs = await prisma.fuelLog.findMany({ where, select: logSelect, orderBy: { createdAt: 'desc' } });
    const totalCost = logs.reduce((s, l) => s + l.fuelCost, 0);
    const totalLiters = logs.reduce((s, l) => s + l.fuelAmount, 0);
    res.json({ logs, totalCost, totalLiters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fuel
router.post('/', auth, roles('DRIVER', 'FLEET_OWNER'), async (req, res) => {
  try {
    const { vehicleId, fuelAmount, fuelCost, odometer, fuelStation, notes } = req.body;
    if (!vehicleId || !fuelAmount || !fuelCost || !odometer) {
      return res.status(400).json({ error: 'vehicleId, fuelAmount, fuelCost, and odometer are required' });
    }
    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (req.user.role === 'DRIVER' && vehicle.driverId !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this vehicle' });
    }
    if (req.user.role === 'FLEET_OWNER' && vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this vehicle' });
    }

    const effectiveDriverId = req.user.role === 'DRIVER' ? req.user.id : (vehicle.driverId || req.user.id);

    const [log] = await Promise.all([
      prisma.fuelLog.create({
        data: {
          vehicleId: parseInt(vehicleId),
          driverId: effectiveDriverId,
          fuelAmount: parseFloat(fuelAmount),
          fuelCost: parseFloat(fuelCost),
          odometer: parseInt(odometer),
          fuelStation: fuelStation || null,
          notes: notes || null,
        },
        select: logSelect,
      }),
      prisma.vehicle.update({ where: { id: parseInt(vehicleId) }, data: { currentMileage: parseInt(odometer) } }),
    ]);
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fuel/:id
router.delete('/:id', auth, roles('FLEET_OWNER', 'ADMIN'), async (req, res) => {
  try {
    const log = await prisma.fuelLog.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: true },
    });
    if (!log) return res.status(404).json({ error: 'Fuel log not found' });
    if (req.user.role === 'FLEET_OWNER' && log.vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.fuelLog.delete({ where: { id: log.id } });
    res.json({ message: 'Fuel log deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
