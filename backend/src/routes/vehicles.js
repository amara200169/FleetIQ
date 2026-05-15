const express = require('express');
const bcrypt = require('bcrypt');

const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const notify = require('../utils/notify');

const router = express.Router();
const prisma = require('../lib/prisma');

const vehicleSelect = {
  id: true, licensePlate: true, make: true, model: true, year: true, color: true,
  capacity: true, status: true, active: true, currentMileage: true,
  insuranceExpiry: true, registrationExpiry: true, lastServiceDate: true,
  notes: true, createdAt: true, updatedAt: true,
  owner: { select: { id: true, email: true, firstName: true, lastName: true } },
  driver: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
};

// GET /api/vehicles/drivers
router.get('/drivers', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER', isActive: true },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, licenseNumber: true, licenseExpiry: true, avatar: true, createdAt: true,
      },
    });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vehicles/drivers — fleet owner creates driver account
router.post('/drivers', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 12);
    const driver = await prisma.user.create({
      data: { email, password: hashed, role: 'DRIVER' },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json({ message: 'Driver account created', driver });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vehicles/drivers/:id/reset-password — fleet owner resets a driver's password
router.patch('/drivers/:id/reset-password', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const driver = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!driver || driver.role !== 'DRIVER') {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: driver.id }, data: { password: hashed } });
    await notify(driver.id, 'Password Changed', 'Your password has been reset by your fleet manager.', 'WARNING');
    res.json({ message: `Password reset for ${driver.email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vehicles/assigned — driver's vehicles
router.get('/assigned', auth, roles('DRIVER'), async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ where: { driverId: req.user.id }, select: vehicleSelect });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vehicles — fleet owner's vehicles
router.get('/', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { ownerId: req.user.id },
      select: vehicleSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vehicles — create vehicle
router.post('/', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const { licensePlate, make, model, year, color, capacity, insuranceExpiry, registrationExpiry, notes } = req.body;
    if (!licensePlate || !model || !capacity) {
      return res.status(400).json({ error: 'licensePlate, model and capacity are required' });
    }
    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate,
        make: make || null,
        model,
        year: year ? parseInt(year) : null,
        color: color || null,
        capacity: parseInt(capacity),
        ownerId: req.user.id,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        registrationExpiry: registrationExpiry ? new Date(registrationExpiry) : null,
        notes: notes || null,
      },
      select: vehicleSelect,
    });
    res.status(201).json(vehicle);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'License plate already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vehicles/:id/assign-driver
router.patch('/:id/assign-driver', auth, roles('FLEET_OWNER', 'ADMIN'), async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const driverId = parseInt(req.body.driver);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (req.user.role === 'FLEET_OWNER' && vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this vehicle' });
    }
    const driver = await prisma.user.findUnique({ where: { id: driverId } });
    if (!driver || driver.role !== 'DRIVER') return res.status(400).json({ error: 'Driver not found or invalid role' });

    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { driverId: driver.id },
      select: vehicleSelect,
    });
    await notify(driver.id, 'Vehicle Assigned',
      `You have been assigned to vehicle ${vehicle.licensePlate} (${vehicle.model})`, 'INFO');
    res.json({ message: `Driver ${driver.email} assigned`, vehicle: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vehicles/:id — update vehicle details
router.patch('/:id', auth, roles('FLEET_OWNER', 'ADMIN'), async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (req.user.role === 'FLEET_OWNER' && vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this vehicle' });
    }
    const { make, model, year, color, capacity, status, active, currentMileage, insuranceExpiry, registrationExpiry, notes } = req.body;
    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...(make !== undefined && { make: make || null }),
        ...(model && { model }),
        ...(year !== undefined && { year: year ? parseInt(year) : null }),
        ...(color !== undefined && { color: color || null }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(status && { status }),
        ...(active !== undefined && { active }),
        ...(currentMileage !== undefined && { currentMileage: parseInt(currentMileage) }),
        ...(insuranceExpiry !== undefined && { insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null }),
        ...(registrationExpiry !== undefined && { registrationExpiry: registrationExpiry ? new Date(registrationExpiry) : null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      select: vehicleSelect,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', auth, roles('FLEET_OWNER', 'ADMIN'), async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (req.user.role === 'FLEET_OWNER' && vehicle.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this vehicle' });
    }
    await prisma.vehicle.delete({ where: { id: vehicleId } });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
