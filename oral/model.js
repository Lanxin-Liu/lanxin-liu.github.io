import { config } from './config.js';

export const slotId = (date, hour) => `${date}T${String(hour).padStart(2, '0')}:00`;
export const slots = config.dates.flatMap(date => config.hours.map(hour => ({
  id: slotId(date, hour), date, hour,
  label: `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`,
})));
export const validSlotIds = new Set(slots.map(slot => slot.id));
export function tally(responses) {
  return slots.map(slot => {
    const available = responses.filter(response => response.slots.includes(slot.id));
    return { ...slot, count: available.length, names: available.map(response => response.name),
      everyone: responses.length > 0 && available.length === responses.length };
  });
}
export function rank(responses) {
  return tally(responses).filter(slot => slot.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}
export function calendarEvent(slot) {
  const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(slot.id + ':00' + config.offset);
  const end = new Date(start.getTime() + config.durationMinutes * 60_000);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lanxin Liu//Oral Scheduling//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:oral-${slot.id.replace(/\W/g, '')}@lanxin-liu.github.io`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, 'SUMMARY:Lanxin Liu — Oral（候选时间）',
    'DESCRIPTION:口试约40分钟，预留1小时。此为候选时段，最终安排请以组织者通知为准。',
    'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
