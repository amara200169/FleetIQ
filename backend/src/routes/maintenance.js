const express = require('express');

const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const notify = require('../utils/notify');

const router = express.Router();
const prisma = require('../lib/prisma');

const logSelect = {
  id: true, type: true, description: true, cost: true, odometer: true,
  nextDueDate: true, nextDueMileage: true, notes: true, createdAt: true,
  vehicle: { select: { id: true, licensePlate: true, model: true, make: true } },
  performedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
};

// GET /api/maintenance/alerts — must come before /:id routes
router.get('/alerts', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const [vehicleAlerts, maintenanceAlerts] = await Promise.all([
      prisma.vehicle.findMany({
        where: {
          ownerId: req.user.id,
          OR: [
            { insuranceExpiry: { lte: soon } },
            { registrationExpiry: { lte: soon } },
          ],
        },
        select: { id: true, licensePlate: true, model: true, make: true, insuranceExpiry: true, registrationExpiry: true, lastServiceDate: true },
      }),
      prisma.maintenanceLog.findMany({
        where: { vehicle: { ownerId: req.user.id }, nextDueDate: { lte: soon, gte: new Date() } },
        select: logSelect,
        orderBy: { nextDueDate: 'asc' },
      }),
    ]);

    res.json({ vehicleAlerts, maintenanceAlerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance
router.get('/', auth, roles('FLEET_OWNER', 'ADMIN'), async (req, res) => {
  try {
    const where = req.user.role === 'FLEET_OWNER' ? { vehicle: { ownerId: req.user.id } } : {};
    const logs = await prisma.maintenanceLog.findMany({ where, select: logSelect, orderBy: { createdAt: 'desc' } });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance
router.post('/', auth, roles('FLEET_OWNER', 'ADMIN'), async (req, res) => {
  try {
    const { vehicleId, type, description, cost, odometer, nextDueDate, nextDueMileage, notes } = req.body;
    if (!vehicleId || !type || !description) {
      return res.status(400).json({ error: 'vehicleId, type, and description are required' });
    }
    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (req.user.role === 'FLEET_OWNER' && vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this vehicle' });
    }

    const [log] = await Promise.all([
      prisma.maintenanceLog.create({
        data: {
          vehicleId: parseInt(vehicleId),
          performedById: req.user.id,
          type,
          description,
          cost: cost ? parseFloat(cost) : null,
          odometer: odometer ? parseInt(odometer) : null,
          nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
          nextDueMileage: nextDueMileage ? parseInt(nextDueMileage) : null,
          notes: notes || null,
        },
        select: logSelect,
      }),
      prisma.vehicle.update({ where: { id: parseInt(vehicleId) }, data: { lastServiceDate: new Date() } }),
    ]);

    if (vehicle.driverId) {
      await notify(vehicle.driverId, 'Vehicle Maintenance Logged',
        `Maintenance (${type}) logged for ${vehicle.licensePlate}: ${description}`, 'INFO');
    }

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/maintenance/:id
router.patch('/:id', auth, roles('FLEET_OWNER', 'ADMIN'), async (req, res) => {
  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: true },
    });
    if (!log) return res.status(404).json({ error: 'Maintenance log not found' });
    if (req.user.role === 'FLEET_OWNER' && log.vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { type, description, cost, odometer, nextDueDate, nextDueMileage, notes } = req.body;
    const updated = await prisma.maintenanceLog.update({
      where: { id: log.id },
      data: {
        ...(type && { type }),
        ...(description && { description }),
        ...(cost !== undefined && { cost: cost ? parseFloat(cost) : null }),
        ...(odometer !== undefined && { odometer: odometer ? parseInt(odometer) : null }),
        ...(nextDueDate !== undefined && { nextDueDate: nextDueDate ? new Date(nextDueDate) : null }),
        ...(nextDueMileage !== undefined && { nextDueMileage: nextDueMileage ? parseInt(nextDueMileage) : null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      select: logSelect,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/maintenance/:id
router.delete('/:id', auth, roles('FLEET_OWNER', 'ADMIN'), async (req, res) => {
  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: true },
    });
    if (!log) return res.status(404).json({ error: 'Maintenance log not found' });
    if (req.user.role === 'FLEET_OWNER' && log.vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.maintenanceLog.delete({ where: { id: log.id } });
    res.json({ message: 'Maintenance log deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
