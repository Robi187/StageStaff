require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Day-of-week constants (0=Sun, 1=Mon, ..., 4=Thu, 5=Fri, 6=Sat)
const TARGET_DAYS = [4, 5, 6]; // Thu, Fri, Sat

const SHIFTS = [
  { title: 'Donnerstag', dayOfWeek: 4, startTime: '20:00', endTime: '02:00' },
  { title: 'Freitag',    dayOfWeek: 5, startTime: '20:00', endTime: '03:00' },
  { title: 'Samstag',    dayOfWeek: 6, startTime: '20:00', endTime: '03:00' },
];

const WEEKS_AHEAD = 16;

function nextWeekday(dayOfWeek, from) {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0); // noon to avoid DST edge cases
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
  return d;
}

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const { title, dayOfWeek, startTime, endTime } of SHIFTS) {
    // Find or create the parent Shift
    let shift = await prisma.shift.findFirst({ where: { title, type: 'RECURRING' } });
    if (!shift) {
      const firstDate = nextWeekday(dayOfWeek, today);
      const lastDate = new Date(firstDate);
      lastDate.setDate(lastDate.getDate() + WEEKS_AHEAD * 7);

      shift = await prisma.shift.create({
        data: {
          title,
          startTime,
          endTime,
          validFrom: firstDate,
          validUntil: lastDate,
          type: 'RECURRING',
          weekdays: String(dayOfWeek),
        }
      });
      console.log(`Created shift: ${title}`);
    }

    // Generate occurrences
    let current = nextWeekday(dayOfWeek, today);
    let created = 0;
    for (let w = 0; w <= WEEKS_AHEAD; w++) {
      const date = new Date(current);
      date.setDate(date.getDate() + w * 7);
      date.setHours(12, 0, 0, 0);

      try {
        await prisma.shiftOccurrence.create({ data: { shiftId: shift.id, date } });
        created++;
      } catch (e) {
        if (e.code !== 'P2002') throw e; // ignore duplicate
      }
    }
    console.log(`  Created ${created} occurrences for ${title}`);
  }

  console.log('Done.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
