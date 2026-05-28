const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  // Delete duplicate occurrences — keep the oldest per (shiftId, calendar day).
  // Uses DATE() to compare only the day part, ignoring time/timezone offsets.
  const result = await prisma.$executeRaw`
    DELETE FROM "ShiftOccurrence"
    WHERE id IN (
      SELECT id FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY "shiftId", DATE("date" AT TIME ZONE 'UTC')
            ORDER BY "createdAt" ASC
          ) AS rn
        FROM "ShiftOccurrence"
      ) t
      WHERE rn > 1
    )
  `;

  console.log(`${result} Duplikat(e) gelöscht.`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
