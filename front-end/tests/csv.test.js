import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, serializeCsv } from '../src/utils/csv.js';

test('CSV keeps punctuation, multiline fields, Unicode and embedded quotes', () => {
  assert.equal(serializeCsv([['Name', 'Notes'], ['Ada, Lovelace', 'He said "paid"\n₹1500']]), '"Name","Notes"\r\n"Ada, Lovelace","He said ""paid""\n₹1500"');
});

test('spreadsheet formula prefixes are neutralized even after whitespace and controls', () => {
  for (const prefix of ['=', '+', '-', '@']) {
    for (const padding of ['', ' ', '\t', '\r\n', '\x00', '\u00a0']) {
      const value = `${padding}${prefix}SUM(1,2)`;
      assert.equal(csvCell(value), `"'${value}"`);
    }
  }
});

test('ordinary values remain data and missing cells serialize consistently', () => {
  assert.equal(csvCell('student@example.com'), '"student@example.com"');
  assert.equal(csvCell('ABC-123'), '"ABC-123"');
  assert.equal(csvCell(1500), '"1500"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
  assert.equal(serializeCsv([]), '');
});
