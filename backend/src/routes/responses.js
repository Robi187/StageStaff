const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/responses (upsert)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { occurrenceId, status, comment } = req.body;
    if (!occurrenceId || !status) {
      return res.status(400).json({ error: 'occurrenceId und status erforderlich' });
    }

    const validStatuses = ['JA', 'NEIN', 'VIELLEICHT'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Ungültiger Status. Erlaubt: JA, NEIN, VIELLEICHT' });
    }

    if (comment && comment.length > 500) {
      return res.status(400).json({ error: 'Kommentar darf maximal 500 Zeichen haben' });
    }

    const occ = await prisma.shiftOccurrence.findUnique({ where: { id: occurrenceId } });
    if (!occ) return res.status(404).json({ error: 'Termin nicht gefunden' });
    if (occ.cancelled) return res.status(400).json({ error: 'Schicht wurde abgesagt' });
    if (occ.deadline && occ.deadline < new Date()) {
      return res.status(400).json({ error: 'Antwortfrist abgelaufen' });
    }

    const response = await prisma.response.upsert({
      where: { userId_occurrenceId: { userId: req.user.userId, occurrenceId } },
      update: { status, comment: comment?.trim() || null },
      create: { userId: req.user.userId, occurrenceId, status, comment: comment?.trim() || null }
    });

    res.json(response);
  } catch (err) {
    console.error('[responses POST /]', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

module.exports = router;
