const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [occurrences, totalStaff] = await Promise.all([
      prisma.shiftOccurrence.findMany({
        where: { date: { gte: today } },
        orderBy: { date: 'asc' },
        include: {
          shift: { select: { id: true, title: true, startTime: true, endTime: true } },
          responses: isAdmin
            ? { include: { user: { select: { id: true, name: true } } } }
            : { where: { userId: req.user.userId } },
          _count: { select: { responses: true } }
        }
      }),
      prisma.user.count({ where: { role: 'MITARBEITER' } })
    ]);

    const result = occurrences.map(occ => ({
      ...occ,
      myResponse: occ.responses.find(r => r.userId === req.user.userId) || null
    }));

    res.json({ occurrences: result, totalStaff });
  } catch (err) {
    console.error('[dashboard GET /]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

module.exports = router;
