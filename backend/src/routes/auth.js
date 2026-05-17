const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();
const prisma = require('../lib/prisma');

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

const sendVerificationEmail = async (email, code) => {
  await transporter.sendMail({
    from: `"FleetIQ" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Verify your FleetIQ account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-size:18px">🚚</span>
          </div>
          <span style="font-size:20px;font-weight:700;color:#111827">FleetIQ</span>
        </div>
        <h2 style="color:#111827;margin:0 0 8px">Verify your email</h2>
        <p style="color:#6b7280;margin:0 0 24px">Enter this 6-digit code to activate your account and start your 7-day free trial.</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1d4ed8">${code}</span>
        </div>
        <p style="color:#9ca3af;font-size:13px">This code expires in 15 minutes. If you didn't create a FleetIQ account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

// POST /api/auth/register — fleet owner self-registration only
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day trial
    const code = generateCode();
    const emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = await prisma.user.create({
      data: {
        email, password: hashed, role: 'FLEET_OWNER',
        firstName: firstName || null, lastName: lastName || null,
        subscriptionStatus: 'trialing', trialEndsAt,
        emailVerified: false,
        emailVerificationCode: code,
        emailVerificationExpiry,
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });

    res.status(201).json({ message: 'Account created. Check your email for the verification code.', email });
    sendVerificationEmail(email, code).catch((e) => console.error('Email send failed:', e.message));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid code' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });
    if (user.emailVerificationCode !== code) return res.status(400).json({ error: 'Invalid code' });
    if (user.emailVerificationExpiry < new Date()) return res.status(400).json({ error: 'Code expired. Request a new one.' });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerificationCode: null, emailVerificationExpiry: null },
    });

    res.json({ token: signToken(user), role: user.role, message: 'Email verified!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return res.json({ message: 'If applicable, a new code has been sent.' });

    const code = generateCode();
    const emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationCode: code, emailVerificationExpiry },
    });

    res.json({ message: 'New verification code sent.' });
    sendVerificationEmail(email, code).catch((e) => console.error('Email send failed:', e.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Block unverified fleet owners (drivers/admins skip verification)
    if (user.role === 'FLEET_OWNER' && !user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.', requiresVerification: true, email });
    }

    res.json({ token: signToken(user), role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

    const resetUrl = `${frontendUrl()}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"FleetIQ" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Reset your FleetIQ password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1e40af">FleetIQ Password Reset</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
