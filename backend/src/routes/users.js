const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

function isValidId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 50;
}

// PATCH /api/users/me/password
router.patch('/me/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
    }
    if (newPassword.length < 6) return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });
    if (newPassword.length > 200) return res.status(400).json({ error: 'Passwort darf maximal 200 Zeichen haben' });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[users PATCH /me/password]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/users (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (err) {
    console.error('[users GET /]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// PATCH /api/users/:id/role (admin only)
router.patch('/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });

    const { role } = req.body;
    if (!['ADMIN', 'MITARBEITER'].includes(role)) {
      return res.status(400).json({ error: 'Ungültige Rolle' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    res.json(user);
  } catch (err) {
    console.error('[users PATCH /:id/role]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });

    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Du kannst dich nicht selbst löschen' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err) {
    console.error('[users DELETE /:id]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

module.exports = router;
