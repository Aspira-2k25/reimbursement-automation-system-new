import test from 'node:test';
import assert from 'node:assert/strict';
import { previewDocuments, selectFormErrors } from '../src/utils/nptelReview.js';

test('section validation excludes errors from later sections but final validation keeps them', () => {
  const errors = { name: 'Required', amount: 'Too high', idCard: 'Required' };
  assert.deepEqual(selectFormErrors(errors, ['name', 'email']), { name: 'Required' });
  assert.deepEqual(selectFormErrors(errors), errors);
});

test('review respects document kinds regardless of order and previews replacement uploads', () => {
  const file = { name: 'new-result.pdf' };
  const documents = previewDocuments([
    { kind: 'idCard', url: '/id' }, { kind: 'nptelResult', url: '/result' },
  ], { nptelResult: file }, 'Student');
  assert.equal(documents[0].file, file);
  assert.equal(documents[1].url, '/id');
  assert.equal(documents[1].label, 'Student ID card');
});

test('ambiguous legacy documents remain visible without being mislabelled as an ID or result', () => {
  const documents = previewDocuments([{ publicId: 'unknown', url: '/unknown' }]);
  assert.equal(documents.length, 3);
  assert.equal(documents[0].publicId, undefined);
  assert.equal(documents[2].label, 'Existing supporting document');
  assert.equal(documents[2].url, '/unknown');
  const legacyPair = previewDocuments([{ url: '/result' }, { url: '/id' }]);
  assert.equal(legacyPair[0].url, '/result');
  assert.equal(legacyPair[1].url, '/id');
});
