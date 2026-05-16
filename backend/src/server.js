require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .concat(['http://localhost:3000', 'http://localhost:3001']);

app.use(cors({ origin: allowedOrigins }));

// Stripe webhook needs raw body — must be registered before express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), require('./routes/billing-webhook'));

app.use(express.json());
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/fuel', require('./routes/fuel'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/track', require('./routes/track'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io — JWT auth on every connection
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { id, role } = socket.user;
  // Fleet owners join their own room so drivers can target them
  if (role === 'FLEET_OWNER') socket.join(`owner:${id}`);
  if (role === 'DRIVER')      socket.join(`driver:${id}`);
});

// Export io so routes can emit events
app.set('io', io);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`FleetIQ API + Socket.io running on http://localhost:${PORT}`));
