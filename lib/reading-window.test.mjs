import assert from 'node:assert/strict';
import test from 'node:test';
import { readingWindow } from './reading-window.js';

test('ranges count readings and report the actual duration in UTC', () => {
  const samples = Array.from({length: 20}, (_, index) => index);
  const times = samples.map(index => new Date(Date.UTC(2026, 10, 15, index)).toISOString());
  const result = readingWindow(samples, times, 7);
  assert.deepEqual(result.points, [13, 14, 15, 16, 17, 18, 19]);
  assert.equal(result.offset, 13);
  assert.match(result.period, /^6 hours/);
  assert.match(result.period, /13:00.*19:00 UTC$/);
  assert.equal(readingWindow(samples, times, 0).points.length, 20);
});

test('missing timestamps never imply days, hours or minutes', () => {
  const result = readingWindow([1, 2, 3], undefined, 14);
  assert.deepEqual(result.points, [1, 2, 3]);
  assert.match(result.period, /Timestamps unavailable/);
  assert.deepEqual(readingWindow(null, null, 14).points, []);
});

test('discarding invalid readings preserves their timestamp alignment', () => {
  const result = readingWindow([1, null, 3], ['2026-11-15T00:00:00Z', 'invalid', '2026-11-15T00:30:00Z'], 14);
  assert.deepEqual(result.points, [1, 3]);
  assert.match(result.period, /^30 min/);
});

test('incomplete or reversed timestamps do not produce a fabricated period', () => {
  assert.match(readingWindow([1, 2], ['2026-11-15T00:00:00Z'], 14).period, /unavailable/);
  assert.match(readingWindow([1, 2], ['2026-11-16T00:00:00Z', '2026-11-15T00:00:00Z'], 14).period, /unavailable/);
});

test('a single reading shows its timestamp without inventing a duration', () => {
  const result = readingWindow([42], ['2026-11-15T12:00:00Z'], 7);
  assert.match(result.period, /15 Nov.*12:00 UTC/);
  assert.doesNotMatch(result.period, /hours|days|min/);
});

test('short and multiday windows use explicit duration units', () => {
  assert.match(readingWindow([1, 2], ['2026-11-15T00:00:00Z', '2026-11-15T00:00:30Z'], 0).period, /^Less than 1 min/);
  assert.match(readingWindow([1, 2], ['2026-11-15T00:00:00Z', '2026-11-22T00:00:00Z'], 0).period, /^7 days/);
});
