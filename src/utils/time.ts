import { AppError } from './AppError';

/**
 * Converts a 24-hour 'HH:MM' or 'HH:MM:SS' string into a UTC Date object
 * compatible with Prisma's `@db.Time(0)` PostgreSQL `TIME` column.
 */
export function parseTimeToDate(timeStr: string): Date {
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`1970-01-01T${normalized}.000Z`);
}

/**
 * Formats a Prisma `@db.Time(0)` Date object back to 'HH:MM' string.
 */
export function formatDateToTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

/**
 * Parses a 'YYYY-MM-DD' date string into a UTC midnight Date object
 * compatible with Prisma's `@db.Date` PostgreSQL `DATE` column.
 */
export function parseDateOnly(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new AppError(
      `Invalid date format '${dateStr}'. Expected 'YYYY-MM-DD'.`,
      400,
      'INVALID_DATE_FORMAT'
    );
  }
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateStr) {
    throw new AppError(
      `Invalid calendar date '${dateStr}'.`,
      400,
      'INVALID_DATE_VALUE'
    );
  }
  return date;
}

/**
 * Formats a Prisma `@db.Date` Date object to 'YYYY-MM-DD'.
 */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Converts a 24-hour 'HH:MM' string into minutes since 00:00.
 */
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new AppError(
      `Invalid time value '${timeStr}'. Expected 24-hour 'HH:MM'.`,
      400,
      'INVALID_TIME_FORMAT'
    );
  }
  return hours * 60 + minutes;
}

/**
 * Converts minutes since 00:00 into a 24-hour 'HH:MM' string.
 */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Combines a `@db.Date` Date object and a `@db.Time(0)` Date object into a single UTC Date.
 */
export function combineDateAndTime(dateObj: Date, timeObj: Date): Date {
  const datePart = formatDateOnly(dateObj);
  const timePart = formatDateToTime(timeObj);
  return new Date(`${datePart}T${timePart}:00.000Z`);
}

/**
 * Checks whether two `[start, end)` time intervals overlap.
 */
export function doTimeRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

