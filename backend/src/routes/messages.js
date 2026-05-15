const express = require('express');

const auth = require('../middleware/auth');
const notify = require('../utils/notify');

const router = express.Router();
const prisma = require('../lib/prisma');

const userSelect = { id: true, email: true, firstName: true, lastName: true, avatar: true, role: true };

// GET /api/messages/contacts — must come before /:userId
router.get('/contacts', auth, async (req, res) => {
  try {
    let contacts = [];

    if (req.user.role === 'FLEET_OWNER') {
      contacts = await prisma.user.findMany({
        where: { role: 'DRIVER', isActive: true },
        select: userSelect,
      });
    } else if (req.user.role === 'DRIVER') {
      const vehicles = await prisma.vehicle.findMany({
        where: { driverId: req.user.id },
        select: { owner: { select: userSelect } },
      });
      const seen = new Set();
      for (const v of vehicles) {
        if (!seen.has(v.owner.id)) { contacts.push(v.owner); seen.add(v.owner.id); }
      }
      if (contacts.length === 0) {
        contacts = await prisma.user.findMany({ where: { role: 'FLEET_OWNER' }, select: userSelect });
      }
    } else {
      contacts = await prisma.user.findMany({
        where: { id: { not: req.user.id }, isActive: true },
        select: userSelect,
      });
    }

    const contactsWithMeta = await Promise.all(
      contacts.map(async (c) => {
        const [unread, lastMessage] = await Promise.all([
          prisma.message.count({ where: { senderId: c.id, receiverId: req.user.id, read: false } }),
          prisma.message.findFirst({
            where: { OR: [{ senderId: req.user.id, receiverId: c.id }, { senderId: c.id, receiverId: req.user.id }] },
            orderBy: { createdAt: 'desc' },
            select: { content: true, createdAt: true, senderId: true },
          }),
        ]);
        return { ...c, unreadCount: unread, lastMessage };
      })
    );

    res.json(contactsWithMeta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:userId
router.get('/:userId', auth, async (req, res) => {
  try {
    const otherId = parseInt(req.params.userId);
    const [messages, other] = await Promise.all([
      prisma.message.findMany({
        where: { OR: [{ senderId: req.user.id, receiverId: otherId }, { senderId: otherId, receiverId: req.user.id }] },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: userSelect } },
      }),
      prisma.user.findUnique({ where: { id: otherId }, select: userSelect }),
    ]);
    if (!other) return res.status(404).json({ error: 'User not found' });

    await prisma.message.updateMany({
      where: { senderId: otherId, receiverId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({ messages, contact: other });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:userId
router.post('/:userId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' });
    const receiverId = parseInt(req.params.userId);
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return res.status(404).json({ error: 'Recipient not found' });

    const message = await prisma.message.create({
      data: { senderId: req.user.id, receiverId, content: content.trim() },
      include: { sender: { select: userSelect } },
    });

    const senderName = req.user.firstName || req.user.email;
    await notify(receiverId, `New message from ${senderName}`, content.trim().slice(0, 80), 'INFO');

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
