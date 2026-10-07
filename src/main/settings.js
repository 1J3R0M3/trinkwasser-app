'use strict';
const { app } = require('electron');
const { EventEmitter } = require('node:events');
const store = require('./store');

const FILE = 'settings';
const SCHEMA_VERSION = 1;

// Arbeitszeiten: Index 0 = Montag … 6 = Sonntag.
const day = (enabled, start = '08:00', end = '17:00') => ({ enabled, start, end });

function defaults() {
  return {
    version: SCHEMA_VERSION,
    setupDone: false,
    language: app.getLocale().toLowerCase().startsWith('de') ? 'de' : 'en',
    dailyGoalMl: 2000,
    weeklyGoalMl: 10000,
    glassMl: 250,
    intervalMin: 60,
    autostart: false,
    workHours: [day(true), day(true), day(true), day(true), day(true), day(false), day(false)],
  };
}

const LIMITS = {
  dailyGoalMl: [250, 10000],
  weeklyGoalMl: [250, 70000],
  glassMl: [50, 2000],
  intervalMin: [5, 240],
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function int(value, [min, max], fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function sanitizeDay(d, fallback) {
  if (!d || typeof d !== 'object') return fallback;
  const start = TIME_RE.test(d.start) ? d.start : fallback.start;
  const end = TIME_RE.test(d.end) ? d.end : fallback.end;
  // Schichten über Mitternacht werden nicht unterstützt: Ende muss nach Beginn liegen.
  if (end <= start) return { ...fallback, enabled: Boolean(d.enabled) };
  return { enabled: Boolean(d.enabled), start, end };
}

// Alles, was vom Renderer kommt, wird hier geprüft – der Renderer gilt als nicht vertrauenswürdig.
function sanitize(input, base) {
  const out = { ...base };
  if (!input || typeof input !== 'object') return out;

  if (input.language === 'de' || input.language === 'en') out.language = input.language;
  for (const key of Object.keys(LIMITS)) {
    if (key in input) out[key] = int(input[key], LIMITS[key], base[key]);
  }
  if ('autostart' in input) out.autostart = Boolean(input.autostart);
  if ('setupDone' in input) out.setupDone = Boolean(input.setupDone);
  if (Array.isArray(input.workHours) && input.workHours.length === 7) {
    out.workHours = input.workHours.map((d, i) => sanitizeDay(d, base.workHours[i]));
  }
  return out;
}

const events = new EventEmitter();
let current = null;

function load() {
  const def = defaults();
  const raw = store.readJson(FILE, null);
  current = raw ? sanitize(raw, def) : def;
  return current;
}

function get() {
  return current ?? load();
}

function update(patch) {
  const prev = get();
  current = sanitize(patch, prev);
  store.writeJson(FILE, current);
  events.emit('changed', current, prev);
  return current;
}

module.exports = { load, get, update, events, defaults, LIMITS };
