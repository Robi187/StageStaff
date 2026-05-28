const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('[auth POST /login]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { token, name, email, password } = req.body;
    if (!token || !name || !email || !password) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }

    if (name.length > 100) return res.status(400).json({ error: 'Name darf maximal 100 Zeichen haben' });
    if (email.length > 200) return res.status(400).json({ error: 'E-Mail darf maximal 200 Zeichen haben' });
    if (password.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
    if (password.length > 200) return res.status(400).json({ error: 'Passwort darf maximal 200 Zeichen haben' });

    const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Einladungslink ungültig oder abgelaufen' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'E-Mail bereits registriert' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash }
    });

    await prisma.inviteToken.update({
      where: { token },
      data: { used: true }
    });

    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    res.json({
      token: jwtToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('[auth POST /register]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/auth/invite (admin only)
router.get('/invite', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.inviteToken.create({ data: { token, expiresAt } });

    const frontendUrl = process.env.FRONTEND_URL;
    res.json({ token, url: `${frontendUrl}/register?token=${token}` });
  } catch (err) {
    console.error('[auth GET /invite]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/auth/validate-invite?token=
router.get('/validate-invite', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.json({ valid: false, error: 'Token fehlt' });
    }

    const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return res.json({ valid: false, error: 'Einladungslink ungültig oder abgelaufen' });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error('[auth GET /validate-invite]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

module.exports = router;
