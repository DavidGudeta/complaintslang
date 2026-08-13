import api from './axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getApiOrigin = () => {
  try {
    const baseUrl = api.defaults.baseURL;
    if (!baseUrl) {
      throw new Error('Missing baseURL');
    }
    return new URL(baseUrl).origin;
  } catch (error) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
};

export function getUploadFileUrl(rawUrl?: string | null) {
  if (!rawUrl) return null;
  const url = String(rawUrl).trim().replace(/\\/g, '/');
  if (url === '') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `http:${url}`;
  const origin = getApiOrigin();
  if (url.startsWith('/uploads/')) return `${origin}${url}`;
  if (url.startsWith('uploads/')) return `${origin}/${url}`;
  return `${origin}/uploads/${url.split('/').pop()}`;
}

export function getUploadFilename(rawUrl?: string | null) {
  if (!rawUrl) return 'Uploaded File';
  const url = String(rawUrl).trim().replace(/\\/g, '/');
  const filename = url.split('/').pop();
  return filename || 'Uploaded File';
}

const parseDateValue = (value: string | Date | number) => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);

  const raw = String(value).trim();
  if (raw === '') return new Date(NaN);

  const hasTimezone = /[+-]\d{2}:?\d{2}|Z$/i.test(raw);
  const timezoneLessIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(raw);
  if (hasTimezone) return new Date(raw);
  if (timezoneLessIso) return new Date(`${raw}+03:00`);
  return new Date(raw);
};

export function formatDate(date?: string | Date | number | null) {
  if (date === undefined || date === null || date === '') return '';

  const d = parseDateValue(date);
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-ET', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Addis_Ababa',
  }).format(d);
}

export function exportRowsToCsv(filename: string, rows: Array<Record<string, any>>, columns: Array<{ key: string; label?: string; fallbacks?: string[]; getValue?: (row: Record<string, any>) => any }>) {
  const header = columns.map((col) => col.label || col.key).join(',');
  const body = rows.map((row) => {
    return columns.map((col) => {
      const value = col.getValue ? col.getValue(row) : (row?.[col.key] ?? (col.fallbacks || []).map((fallback) => row?.[fallback]).find((candidate) => candidate !== undefined && candidate !== null && candidate !== ''));
      const normalized = value === undefined || value === null ? '' : String(value);
      return `"${normalized.replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');

  const csv = [header, body].filter(Boolean).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
