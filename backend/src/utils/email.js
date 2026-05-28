const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

async function notifyNewShift(shift, emails) {
  if (!emails.length) return;

  const firstOcc = shift.occurrences?.[0];
  const dateText = firstOcc ? formatDate(firstOcc.date) : '–';
  const appUrl = process.env.FRONTEND_URL || '';
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#13111e;color:#e8e4da;border-radius:12px;padding:32px;">
      <h2 style="font-size:22px;font-weight:400;margin:0 0 8px;color:#e8e4da;">Neue Schicht</h2>
      <p style="font-size:24px;font-weight:600;margin:0 0 24px;color:#fff;">${escHtml(shift.title)}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#8b87a8;">Erster Termin</td>
          <td style="padding:8px 0;font-size:13px;color:#e8e4da;">${escHtml(dateText)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#8b87a8;">Uhrzeit</td>
          <td style="padding:8px 0;font-size:13px;color:#e8e4da;">${escHtml(shift.startTime)} – ${escHtml(shift.endTime)} Uhr</td>
        </tr>
      </table>
      ${appUrl ? `<a href="${escHtml(appUrl)}" style="display:inline-block;margin-top:28px;background:#c8b99a;color:#13111e;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">Zur App</a>` : ''}
    </div>
  `;

  await Promise.allSettled(
    emails.map(to =>
      resend.emails.send({
        from,
        to,
        subject: `Neue Schicht: ${shift.title}`,
        html
      })
    )
  );
}

module.exports = { notifyNewShift };
