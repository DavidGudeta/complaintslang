import test from 'node:test';
import assert from 'node:assert/strict';

import { getReportApiPath } from './reportRoutes.js';

test('uses the backend route relative to the shared axios base URL', () => {
  assert.equal(getReportApiPath('responded'), '/internal/complaints/reports/responded');
  assert.equal(getReportApiPath('performance'), '/internal/complaints/reports/performance');
});
