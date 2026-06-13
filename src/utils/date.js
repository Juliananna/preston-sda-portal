export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nextSaturday(base = new Date(), dayOffset = 0) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  const days = (6 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + days);
  return d;
}

export function asDate(dateLike) {
  if (!dateLike) return null;
  if (dateLike instanceof Date) return dateLike;
  if (typeof dateLike?.toDate === 'function') return dateLike.toDate();
  if (typeof dateLike === 'object' && 'seconds' in dateLike) return new Date(dateLike.seconds * 1000);
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function niceDate(dateLike) {
  if (!dateLike) return 'TBA';
  const d = asDate(dateLike);
  if (!d) return String(dateLike);
  return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function dateInputValue(dateLike) {
  const d = asDate(dateLike);
  if (!d) return typeof dateLike === 'string' ? dateLike.slice(0, 10) : '';
  return toLocalDateString(d);
}

export function dateTimeLocalValue(dateLike) {
  const d = asDate(dateLike);
  if (!d) return typeof dateLike === 'string' ? dateLike.slice(0, 16) : '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
