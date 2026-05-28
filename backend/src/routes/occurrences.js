const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

function isValidId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 50;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d;
}

// GET /api/occurrences?year=2026&month=5
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: 'year und month erforderlich' });

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      return res.status(400).json({ error: 'Ungültige Jahr/Monat-Werte' });
    }

    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59, 999);
    const isAdmin = req.user.role === 'ADMIN';

    const occurrences = await prisma.shiftOccurrence.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
      include: {
        shift: { select: { id: true, title: true, startTime: true, endTime: true } },
        responses: isAdmin
          ? { include: { user: { select: { id: true, name: true } } } }
          : { where: { userId: req.user.userId } }
      }
    });

    const totalStaff = await prisma.user.count({ where: { role: 'MITARBEITER' } });

    const result = occurrences.map(occ => ({
      ...occ,
      myResponse: occ.responses.find(r => r.userId === req.user.userId) || null,
      _count: { responses: occ.responses.length }
    }));

    res.json({ occurrences: result, totalStaff });
  } catch (err) {
    console.error('[occurrences GET /]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/occurrences/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });

    const isAdmin = req.user.role === 'ADMIN';
    const occ = await prisma.shiftOccurrence.findUnique({
      where: { id: req.params.id },
      include: {
        shift: true,
        responses: isAdmin
          ? { include: { user: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'asc' } }
          : { where: { userId: req.user.userId } }
      }
    });
    if (!occ) return res.status(404).json({ error: 'Termin nicht gefunden' });
    res.json(occ);
  } catch (err) {
    console.error('[occurrences GET /:id]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// PATCH /api/occurrences/:id (admin)
router.patch('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });

    const data = {};
    if ('cancelled' in req.body) data.cancelled = Boolean(req.body.cancelled);
    if ('deadline' in req.body) {
      if (req.body.deadline) {
        const dl = parseDate(req.body.deadline);
        if (!dl) return res.status(400).json({ error: 'Ungültiges Datum für Frist' });
        data.deadline = dl;
      } else {
        data.deadline = null;
      }
    }
    if ('startTime' in req.body) data.startTime = req.body.startTime || null;
    if ('endTime' in req.body) data.endTime = req.body.endTime || null;

    const occ = await prisma.shiftOccurrence.update({ where: { id: req.params.id }, data });
    res.json(occ);
  } catch (err) {
    console.error('[occurrences PATCH /:id]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// POST /api/occurrences (admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { shiftId, date, startTime, endTime, deadline } = req.body;
    if (!shiftId || !date) return res.status(400).json({ error: 'shiftId und date erforderlich' });

    const occDate = parseDate(date);
    if (!occDate) return res.status(400).json({ error: 'Ungültiges Datum' });

    let deadlineDate = null;
    if (deadline) {
      deadlineDate = parseDate(deadline);
      if (!deadlineDate) return res.status(400).json({ error: 'Ungültiges Datum für Frist' });
    }

    const occ = await prisma.shiftOccurrence.create({
      data: {
        shiftId,
        date: occDate,
        startTime: startTime || null,
        endTime: endTime || null,
        deadline: deadlineDate
      }
    });
    res.status(201).json(occ);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Termin existiert bereits für diesen Tag' });
    console.error('[occurrences POST /]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// DELETE /api/occurrences/:id (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });

    await prisma.shiftOccurrence.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('[occurrences DELETE /:id]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

module.exports = router;
