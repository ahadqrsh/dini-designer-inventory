/**
 * Shared helpers for reading and displaying attendance clock times.
 * Used by both the admin roster (pages/admin/Attendance.jsx) and the
 * worker's own history (pages/worker/MyAttendance.jsx) so the two views
 * can never drift out of sync on formatting or the "how many hours" math.
 */

// yyyy-mm-dd for the local timezone — toISOString() alone would shift the
// date near midnight because it converts to UTC first.
export const toDateInput = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const shiftDate = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
};

// Postgres returns 'HH:MM:SS'; <input type="time"> and our math want 'HH:MM'
export const toTimeInput = (t) => (t ? String(t).slice(0, 5) : '');

// The current wall-clock time as 'HH:MM' — what a "clock in now" button stamps.
export const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// '14:05' -> '2:05 PM'
export const formatTime12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

// Duration between two 'HH:MM' strings, e.g. "7h 40m". Returns null if either
// time is missing or checkout isn't after checkin (bad manual entry).
export const hoursBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  if ([h1, m1, h2, m2].some(Number.isNaN)) return null;

  const minutes = h2 * 60 + m2 - (h1 * 60 + m1);
  if (minutes <= 0) return null;

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
};
