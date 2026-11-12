/**
 * Spanish formatting done by hand. `Intl` and `toLocaleString` depend on the locale data of
 * each device, and the Wrapped must read exactly the same everywhere.
 */

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
/** Index 0 = Monday, as in the analytics. */
export const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** 1234567 → "1.234.567"; 2.5 → "2,5". */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  const whole = Math.trunc(Math.abs(rounded));
  const decimal = Math.round((Math.abs(rounded) - whole) * 10);
  const digits = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (rounded < 0 ? '-' : '') + digits + (decimal > 0 ? `,${decimal}` : '');
}

const plural = (n: number, one: string, many: string) =>
  `${formatNumber(n)} ${n === 1 ? one : many}`;

/** 45 → "45 minutos"; 150 → "2 horas y 30 minutos"; 4000 → "2 días y 18 horas". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 1) return 'menos de un minuto';
  if (total < 60) return plural(total, 'minuto', 'minutos');
  if (total < 1440) {
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest === 0
      ? plural(hours, 'hora', 'horas')
      : `${plural(hours, 'hora', 'horas')} y ${plural(rest, 'minuto', 'minutos')}`;
  }
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  return hours === 0 || days >= 7
    ? plural(days, 'día', 'días')
    : `${plural(days, 'día', 'días')} y ${plural(hours, 'hora', 'horas')}`;
}

/** "2026-03-14" → "14 de marzo". */
export function formatDay(dayKey: string, withYear = false): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const text = `${day} de ${MONTHS[(month ?? 1) - 1]}`;
  return withYear ? `${text} de ${year}` : text;
}

/** "2026-03-14" → "sábado". */
export function weekdayOfDay(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / 86_400_000);
  return WEEKDAYS[(dayNumber + 3) % 7] as string;
}

/** "2026-03" → "marzo". */
export function formatMonth(monthKey: string): string {
  return MONTHS[Number(monthKey.slice(5, 7)) - 1] as string;
}

/** 9 → "9:00". */
export const formatHour = (hour: number): string => `${hour}:00`;

/** ["Ana", "Beto", "Carla"] → "Ana, Beto y Carla". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
