const express = require('express');

const auth = require('../middleware/auth');

const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read-all — must come before /:id
router.patch('/read-all', auth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const n = await prisma.notification.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!n || n.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.notification.update({ where: { id: n.id }, data: { read: true } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications — clear all
router.delete('/', auth, async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user.id } });
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const n = await prisma.notification.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!n || n.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
    await prisma.notification.delete({ where: { id: n.id } });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
