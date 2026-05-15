const prisma = require('../lib/prisma');

async function notify(userId, title, message, type = 'INFO') {
  try {
    return await prisma.notification.create({ data: { userId, title, message, type } });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

module.exports = notify;
