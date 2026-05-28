const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { notifyNewShift } = require('../utils/email');

const router = express.Router();

function isValidId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 50;
}

// GET /api/shifts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: { validFrom: 'asc' },
      include: {
        _count: { select: { occurrences: true } },
        occurrences: {
          orderBy: { date: 'asc' },
          select: { id: true, date: true, cancelled: true, deadline: true }
        }
      }
    });
    res.json(shifts);
  } catch (err) {
    console.error('[shifts GET /]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/shifts/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });

    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: {
        occurrences: {
          orderBy: { date: 'asc' },
          take: 30,
          include: { _count: { select: { responses: true } } }
        }
      }
    });
    if (!shift) return res.status(404).json({ error: 'Schicht nicht gefunden' });
    res.json(shift);
  } catch (err) {
    console.error('[shifts GET /:id]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// POST /api/shifts (admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, startTime, endTime, validFrom, validUntil, deadline } = req.body;
    if (!title || !startTime || !endTime || !validFrom) {
      return res.status(400).json({ error: 'title, startTime, endTime und validFrom erforderlich' });
    }
    if (title.trim().length > 100) {
      return res.status(400).json({ error: 'Titel darf maximal 100 Zeichen haben' });
    }

    const fromDate = new Date(validFrom);
    if (isNaN(fromDate.getTime())) return res.status(400).json({ error: 'Ungültiges Datum' });

    const shift = await prisma.shift.create({
      data: {
        title: title.trim(),
        startTime,
        endTime,
        validFrom: fromDate,
        validUntil: validUntil ? new Date(validUntil) : fromDate,
        occurrences: {
          create: {
            date: fromDate,
            deadline: deadline ? new Date(deadline) : null
          }
        }
      },
      include: { occurrences: true }
    });
    res.status(201).json(shift);

    prisma.user.findMany({ where: { role: 'MITARBEITER' }, select: { email: true } })
      .then(users => notifyNewShift(shift, users.map(u => u.email)))
      .catch(() => {});
  } catch (err) {
    console.error('[shifts POST /]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// PATCH /api/shifts/:id (admin)
router.patch('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });

    const { title, startTime, endTime } = req.body;
    const data = {};
    if (title) {
      if (title.trim().length > 100) return res.status(400).json({ error: 'Titel darf maximal 100 Zeichen haben' });
      data.title = title.trim();
    }
    if (startTime) data.startTime = startTime;
    if (endTime) data.endTime = endTime;

    const shift = await prisma.shift.update({ where: { id: req.params.id }, data });
    res.json(shift);
  } catch (err) {
    console.error('[shifts PATCH /:id]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// DELETE /api/shifts/:id (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });

    await prisma.shift.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[shifts DELETE /:id]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

module.exports = router;
