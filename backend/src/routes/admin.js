const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');

const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();
const prisma = require('../lib/prisma');

const isAdmin = [auth, roles('ADMIN')];

// GET /api/admin/dashboard
router.get('/dashboard', ...isAdmin, async (req, res) => {
  try {
    const [totalUsers, drivers, fleetOwners, totalVehicles, assignedVehicles, deliveries] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'DRIVER' } }),
        prisma.user.count({ where: { role: 'FLEET_OWNER' } }),
        prisma.vehicle.count(),
        prisma.vehicle.count({ where: { driverId: { not: null } } }),
        prisma.delivery.groupBy({ by: ['status'], _count: { status: true } }),
      ]);

    res.json({
      users: { total: totalUsers, drivers, fleet_owners: fleetOwners },
      vehicles: { total: totalVehicles, assigned: assignedVehicles, unassigned: totalVehicles - assignedVehicles },
      deliveries: deliveries.map((d) => ({ status: d.status, count: d._count.status })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', ...isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, isActive: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users — admin creates a driver with full details (licenseNumber stored but not exposed in list)
router.post('/users', ...isAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, licenseNumber, role = 'DRIVER' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role,
        firstName: firstName || null,
        lastName: lastName || null,
        licenseNumber: licenseNumber || null,
      },
      select: { id: true, email: true, role: true, isActive: true, firstName: true, lastName: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', ...isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', ...isAdmin, async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updated = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
      select: { id: true, email: true, role: true, isActive: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/reset-password
router.patch('/users/:id/reset-password', ...isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ message: `Password reset for ${user.email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', ...isAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/vehicles
router.get('/vehicles', ...isAdmin, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      select: {
        id: true, licensePlate: true, model: true, capacity: true, active: true,
        owner: { select: { id: true, email: true } },
        driver: { select: { id: true, email: true } },
      },
    });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/vehicles/:id
router.get('/vehicles/:id', ...isAdmin, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { owner: { select: { id: true, email: true } }, driver: { select: { id: true, email: true } } },
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/deliveries
router.get('/deliveries', ...isAdmin, async (req, res) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      select: {
        id: true, description: true, destination: true, status: true,
        createdAt: true, proofImage: true, deliveryNote: true,
        vehicle: {
          select: {
            model: true, licensePlate: true,
            owner: { select: { email: true } },
            driver: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/deliveries/:id
router.get('/deliveries/:id', ...isAdmin, async (req, res) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: { include: { owner: true, driver: true } } },
    });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/deliveries/:id
router.patch('/deliveries/:id', ...isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.delivery.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(status && { status }) },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/fleet (admin view of fleet analytics)
router.get('/analytics', ...isAdmin, async (req, res) => {
  try {
    const [vehicles, deliveries, users] = await Promise.all([
      prisma.vehicle.findMany({ select: { model: true, capacity: true, active: true, driverId: true } }),
      prisma.delivery.findMany({ select: { status: true, createdAt: true, destination: true } }),
      prisma.user.count({ where: { role: 'DRIVER' } }),
    ]);

    const total = vehicles.length;
    const active = vehicles.filter((v) => v.active).length;
    const withDriver = vehicles.filter((v) => v.driverId).length;
    const delivered = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const pending = deliveries.filter((d) => d.status !== 'DELIVERED').length;

    res.json({
      total_vehicles: total,
      active_vehicles: active,
      total_drivers: users,
      total_deliveries: deliveries.length,
      delivered,
      pending,
      driver_to_vehicle_ratio: total ? Math.round((withDriver / total) * 100) / 100 : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/proxy/distance-matrix  (proxied here for admin too)
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
