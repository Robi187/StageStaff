export const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export const GERMAN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
];

export const GERMAN_WEEKDAYS = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'
];

export const GERMAN_WEEKDAYS_SHORT = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];

export function formatGermanDate(date) {
  const d = new Date(date);
  return `${d.getDate()}. ${GERMAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatGermanFullDate(date) {
  const d = new Date(date);
  return `${GERMAN_WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${GERMAN_MONTHS[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

export function formatHeaderDate(date) {
  const d = new Date(date);
  return `${GERMAN_WEEKDAYS[d.getDay()].toUpperCase()}, ${d.getDate()}. ${GERMAN_MONTHS[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

export function getDayNumber(date) {
  return new Date(date).getDate();
}

export function getWeekdayShort(date) {
  return GERMAN_WEEKDAYS_SHORT[new Date(date).getDay()];
}

export function getMonthName(monthIndex) {
  return GERMAN_MONTHS[monthIndex];
}
