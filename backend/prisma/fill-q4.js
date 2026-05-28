const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Maps shift title keywords to JS day-of-week (0=Sun … 6=Sat)
const TITLE_TO_DOW = {
  'donnerstag': 4,
  'freitag':    5,
  'samstag':    6,
};

function detectDow(title) {
  const lower = title.toLowerCase();
  for (const [keyword, dow] of Object.entries(TITLE_TO_DOW)) {
    if (lower.includes(keyword)) return dow;
  }
  return null; // unknown → all DO/FR/SA
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
  const dec31 = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));

  // Fetch shifts
  const shifts = await prisma.shift.findMany();
  console.log(`\n${shifts.length} Schicht(en) gefunden:`);

  let totalCreated = 0;

  for (const shift of shifts) {
    const dow = detectDow(shift.title);

    // Extend validUntil if needed
    if (new Date(shift.validUntil) < dec31) {
      await prisma.shift.update({
        where: { id: shift.id },
        data: { validUntil: dec31 }
      });
    }

    // Collect dates for Oct/Nov/Dec 2026
    let dates = [];
    for (const month of [8, 9, 10, 11]) { // Sep, Oct, Nov, Dec
      if (dow !== null) {
        dates.push(...getDatesForDow(2026, month, dow));
      } else {
        // Fallback: all DO/FR/SA
        for (const d of [4, 5, 6]) {
          dates.push(...getDatesForDow(2026, month, d));
        }
      }
    }

    const result = await prisma.shiftOccurrence.createMany({
      data: dates.map(date => ({ shiftId: shift.id, date })),
      skipDuplicates: true,
    });

    const dayLabel = dow !== null
      ? ['So','Mo','Di','Mi','Do','Fr','Sa'][dow]
      : 'DO/FR/SA';
    console.log(`  "${shift.title}" (${dayLabel}): ${result.count} Termine erstellt`);
    totalCreated += result.count;
  }

  console.log(`\nFertig — ${totalCreated} Termine insgesamt erstellt.`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
