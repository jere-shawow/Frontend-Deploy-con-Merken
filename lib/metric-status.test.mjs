import test from 'node:test';
import assert from 'node:assert/strict';
import {metricState} from './metric-status.js';

test('body markers follow each updated source assessment', () => {
  const metric = ['heart','Heart rate',72,'bpm'];
  for (const status of ['normal','warning','critical','unknown']) {
    assert.equal(metricState(metric,{heart:status}),status);
  }
});

test('missing readings or source assessments remain unassessed', () => {
  assert.equal(metricState(['heart','Heart rate',null],{heart:'critical'}),'unknown');
  assert.equal(metricState(['heart','Heart rate',72],{}),'unknown');
  assert.equal(metricState(['heart','Heart rate',72],{heart:'invalid'}),'unknown');
  assert.equal(metricState(['heart','Heart rate',72]),'unknown');
});
