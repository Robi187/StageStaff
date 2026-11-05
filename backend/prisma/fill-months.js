const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Usage: node prisma/fill-months.js <year> <fromMonth> <toMonth> [--dry-run]
// Months are 1-based, e.g. `node prisma/fill-months.js 2027 1 12` = Jänner–Dezember 2027
const [yearArg, fromArg, toArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const DRY_RUN = process.argv.includes('--dry-run');
const YEAR = parseInt(yearArg, 10);
const FROM = parseInt(fromArg, 10);
const TO = parseInt(toArg, 10);

if (!YEAR || !FROM || !TO || FROM < 1 || TO > 12 || FROM > TO) {
  console.error('Usage: node prisma/fill-months.js <year> <fromMonth 1-12> <toMonth 1-12> [--dry-run]');
  process.exit(1);
}

const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// Maps shift title keywords to JS day-of-week (0=Sun … 6=Sat)
const TITLE_TO_DOW = {
  'donnerstag': 4,
  'freitag':    5,
  'samstag':    6,
};

function detectDows(shift) {
  if (shift.weekdays) {
    const dows = shift.weekdays.split(',').map(s => parseInt(s, 10)).filter(n => n >= 0 && n <= 6);
    if (dows.length) return dows;
  }
  const lower = shift.title.toLowerCase();
  for (const [keyword, dow] of Object.entries(TITLE_TO_DOW)) {
    if (lower.includes(keyword)) return [dow];
  }
  return [4, 5, 6]; // unknown → all DO/FR/SA
}

function getDatesForDow(year, month, dow) {
  const dates = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    if (new Date(year, month, day).getDay() === dow) {
      dates.push(new Date(Date.UTC(year, month, day)));
    }
  }
  return dates;
}

async function main() {
  const lastDay = new Date(Date.UTC(YEAR, TO, 0, 23, 59, 59));
  const rangeStart = new Date(Date.UTC(YEAR, FROM - 1, 1));

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}${MONTHS[FROM - 1]} – ${MONTHS[TO - 1]} ${YEAR}`);

  // Only recurring shifts that are still in use (valid until at least the start of the previous month)
  const cutoff = new Date(Date.UTC(YEAR, FROM - 2, 1));
  const shifts = await prisma.shift.findMany({ where: { validUntil: { gte: cutoff } } });
  console.log(`${shifts.length} Schicht(en) gefunden:`);

  let totalCreated = 0;

  for (const shift of shifts) {
    const dows = detectDows(shift);

    const dates = [];
    for (let month = FROM - 1; month <= TO - 1; month++) {
      for (const dow of dows) dates.push(...getDatesForDow(YEAR, month, dow));
    }

    // Skip dates that already have an occurrence on the same calendar day (any time of day)
    const existing = await prisma.shiftOccurrence.findMany({
      where: { shiftId: shift.id, date: { gte: rangeStart, lte: lastDay } },
      select: { date: true }
    });
    const existingDays = new Set(existing.map(o => o.date.toISOString().slice(0, 10)));
    const toCreate = dates.filter(d => !existingDays.has(d.toISOString().slice(0, 10)));

    const dayLabel = dows.map(d => ['So','Mo','Di','Mi','Do','Fr','Sa'][d]).join('/');

    if (DRY_RUN) {
      console.log(`  "${shift.title}" (${dayLabel}): ${toCreate.length} Termine würden erstellt (${existing.length} existieren bereits)`);
      totalCreated += toCreate.length;
      continue;
    }

    if (new Date(shift.validUntil) < lastDay) {
      await prisma.shift.update({ where: { id: shift.id }, data: { validUntil: lastDay } });
    }

    const result = await prisma.shiftOccurrence.createMany({
      data: toCreate.map(date => ({ shiftId: shift.id, date })),
      skipDuplicates: true,
    });

    console.log(`  "${shift.title}" (${dayLabel}): ${result.count} Termine erstellt`);
    totalCreated += result.count;
  }

  console.log(`\nFertig — ${totalCreated} Termine insgesamt ${DRY_RUN ? 'würden erstellt' : 'erstellt'}.`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
