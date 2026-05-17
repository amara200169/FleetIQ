const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { Resend } = require('resend');

const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const notify = require('../utils/notify');
const { uploadProof } = require('../lib/cloudinary');

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

const router = express.Router();
const prisma = require('../lib/prisma');

const upload = uploadProof;

const deliverySelect = {
  id: true, description: true, customerName: true, customerPhone: true, customerEmail: true,
  pickupAddress: true, destination: true, status: true, priority: true, scheduledAt: true,
  latitude: true, longitude: true, proofImage: true, deliveryNote: true,
  deliveryCost: true, deliveredAt: true, driverId: true, createdAt: true, updatedAt: true,
  vehicle: {
    select: {
      id: true, model: true, make: true, licensePlate: true,
      owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      driver: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  },
  driver: { select: { id: true, email: true, firstName: true, lastName: true } },
  trackingEvents: { orderBy: { createdAt: 'desc' }, take: 10 },
};

// GET /api/deliveries/fleet
router.get('/fleet', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const { status, priority, from, to } = req.query;
    const where = { vehicle: { ownerId: req.user.id } };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const deliveries = await prisma.delivery.findMany({ where, select: deliverySelect, orderBy: { createdAt: 'desc' } });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deliveries/assigned
router.get('/assigned', auth, roles('DRIVER'), async (req, res) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      where: {
        OR: [{ driverId: req.user.id }, { vehicle: { driverId: req.user.id } }],
        status: { not: 'CANCELLED' },
      },
      select: deliverySelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deliveries/eta
router.get('/eta', auth, async (req, res) => {
  try {
    const { delivery_id } = req.query;
    if (!delivery_id) return res.status(400).json({ error: 'delivery_id is required' });
    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(delivery_id) },
      include: { vehicle: { include: { driver: true } } },
    });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (req.user.role === 'FLEET_OWNER' && delivery.vehicle?.ownerId !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });
    if (!delivery.latitude || !delivery.longitude) return res.status(400).json({ error: 'Delivery coordinates missing' });
    const driver = delivery.vehicle?.driver;
    if (!driver?.latitude || !driver?.longitude) return res.status(400).json({ error: 'Driver location not available' });

    const { data } = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: `${driver.latitude},${driver.longitude}`,
        destinations: `${delivery.latitude},${delivery.longitude}`,
        units: 'metric',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });
    if (data.status !== 'OK') return res.status(500).json({ error: data.error_message || 'Google API failed' });
    const element = data.rows[0].elements[0];
    if (element.status !== 'OK') return res.status(500).json({ error: 'Route not found' });
    res.json({ distance: element.distance.text, duration: element.duration.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deliveries
router.post('/', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const {
      description, destination, vehicle: vehicleId,
      customerName, customerPhone, customerEmail, pickupAddress,
      priority, scheduledAt, deliveryCost,
    } = req.body;
    if (!description || !destination || !vehicleId) {
      return res.status(400).json({ error: 'description, destination and vehicle are required' });
    }
    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseInt(vehicleId) }, include: { driver: true } });
    if (!vehicle || vehicle.ownerId !== req.user.id) return res.status(404).json({ error: 'Vehicle not found' });
    if (!vehicle.driver) return res.status(400).json({ error: 'Assign a driver to this vehicle before creating a delivery' });

    let lat = null, lng = null;
    if (process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY !== 'your-google-maps-api-key-here') {
      try {
        const { data: geo } = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: { address: destination, key: process.env.GOOGLE_MAPS_API_KEY },
        });
        if (geo.status === 'OK') {
          lat = geo.results[0].geometry.location.lat;
          lng = geo.results[0].geometry.location.lng;
        }
      } catch (_) {}
    }

    const trackingSlug = crypto.randomBytes(6).toString('hex');
    const delivery = await prisma.delivery.create({
      data: {
        description,
        destination,
        vehicleId: vehicle.id,
        driverId: vehicle.driverId,
        latitude: lat,
        longitude: lng,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        pickupAddress: pickupAddress || null,
        priority: priority || 'NORMAL',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        deliveryCost: deliveryCost ? parseFloat(deliveryCost) : null,
        status: 'ASSIGNED',
        trackingSlug,
      },
      select: deliverySelect,
    });

    await Promise.all([
      prisma.trackingEvent.create({ data: { deliveryId: delivery.id, actorId: req.user.id, event: 'ASSIGNED', notes: `Assigned to driver ${vehicle.driver.email}` } }),
      notify(vehicle.driverId, 'New Delivery Assigned',
        `You have a new ${priority || 'NORMAL'} priority delivery to ${destination}`, 'INFO'),
    ]);

    res.status(201).json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/deliveries/:id/status
router.patch('/:id/status', auth, roles('DRIVER'), async (req, res) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: { include: { owner: true } } },
    });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.driverId !== req.user.id && delivery.vehicle.driverId !== req.user.id) {
      return res.status(403).json({ error: 'Delivery not found' });
    }
    if (delivery.status === 'DELIVERED' || delivery.status === 'CANCELLED') {
      return res.status(400).json({ error: `Delivery already ${delivery.status.toLowerCase()}` });
    }
    const { status, notes } = req.body;
    const validStatuses = ['IN_TRANSIT', 'DELIVERED', 'FAILED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const updateData = { status };
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();

    const updated = await prisma.delivery.update({ where: { id: delivery.id }, data: updateData, select: deliverySelect });

    const tasks = [
      prisma.trackingEvent.create({
        data: { deliveryId: delivery.id, actorId: req.user.id, event: status, notes: notes || null },
      }),
      notify(delivery.vehicle.ownerId, `Delivery ${status}`,
        `Delivery to ${delivery.destination} has been marked ${status} by driver`,
        status === 'DELIVERED' ? 'SUCCESS' : status === 'FAILED' ? 'ERROR' : 'INFO'),
    ];

    // Email customer their live tracking link when driver picks up
    if (status === 'IN_TRANSIT' && delivery.customerEmail && delivery.trackingSlug) {
      const trackUrl = `${frontendUrl()}/track/${delivery.trackingSlug}`;
      tasks.push(resend.emails.send({
        from: 'FleetIQ <onboarding@resend.dev>',
        to: delivery.customerEmail,
        subject: `Your delivery is on the way!`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#1e40af">Your delivery is on the way</h2>
            <p>Hi ${delivery.customerName || 'there'},</p>
            <p>Your delivery to <strong>${delivery.destination}</strong> is now in transit. Track it live:</p>
            <a href="${trackUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
              Track My Delivery
            </a>
            <p style="color:#64748b;font-size:13px">This link updates in real time — no app needed.</p>
          </div>
        `,
      }).catch(() => {}));
    }

    await Promise.all(tasks);
    res.json({ message: `Status updated to ${status}`, delivery: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/deliveries/:id/location
router.patch('/:id/location', auth, roles('DRIVER'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) return res.status(400).json({ error: 'latitude and longitude are required' });
    const delivery = await prisma.delivery.findUnique({ where: { id: parseInt(req.params.id) }, include: { vehicle: true } });
    if (!delivery || (delivery.driverId !== req.user.id && delivery.vehicle.driverId !== req.user.id)) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      select: deliverySelect,
    });
    res.json({ message: 'Location updated', delivery: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/deliveries/:id/proof
router.patch('/:id/proof', auth, roles('DRIVER'), upload.single('proof_image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Proof image is required' });
    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: { include: { owner: true } } },
    });
    if (!delivery || (delivery.driverId !== req.user.id && delivery.vehicle.driverId !== req.user.id)) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        proofImage: req.file.path,
        deliveryNote: req.body.delivery_note || null,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
      select: deliverySelect,
    });
    await Promise.all([
      prisma.trackingEvent.create({ data: { deliveryId: delivery.id, actorId: req.user.id, event: 'DELIVERED', notes: 'Proof of delivery uploaded' } }),
      notify(delivery.vehicle.ownerId, 'Proof of Delivery Uploaded',
        `Delivery to ${delivery.destination} completed with proof photo`, 'SUCCESS'),
    ]);
    res.json({ message: 'Proof uploaded and delivery marked as delivered', delivery: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/deliveries/:id
router.delete('/:id', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const delivery = await prisma.delivery.findUnique({ where: { id: parseInt(req.params.id) }, include: { vehicle: true } });
    if (!delivery || delivery.vehicle.ownerId !== req.user.id) return res.status(404).json({ error: 'Delivery not found' });
    await prisma.delivery.delete({ where: { id: delivery.id } });
    res.json({ message: 'Delivery deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deliveries/:id/driver-location
router.get('/:id/driver-location', auth, roles('FLEET_OWNER'), async (req, res) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: { include: { driver: true, owner: true } } },
    });
    if (!delivery || delivery.vehicle.ownerId !== req.user.id) return res.status(404).json({ error: 'Delivery not found' });
    const driver = delivery.vehicle.driver;
    if (!driver) return res.status(400).json({ error: 'No driver assigned' });
    res.json({ latitude: driver.latitude, longitude: driver.longitude, driver: driver.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deliveries/:id — single delivery detail (scoped by role)
router.get('/:id', auth, async (req, res) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: { select: { ownerId: true, driverId: true } } },
    });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (req.user.role === 'FLEET_OWNER' && delivery.vehicle?.ownerId !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });
    if (req.user.role === 'DRIVER' && delivery.vehicle?.driverId !== req.user.id && delivery.driverId !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });
    const result = await prisma.delivery.findUnique({ where: { id: delivery.id }, select: deliverySelect });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
