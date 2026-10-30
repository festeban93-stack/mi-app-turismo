import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveStop, orderedStops, validateTripDraft, type EditableStop } from '../src/lib/trip-editor';
const stop = (name: string, day: number): EditableStop => ({ spot_id: null, custom_title: name, custom_address: '', day_number: day, estimated_cost: 0, notes: '' });
test('two days can contain three stops without creating a third day', () => {
  const stops = [stop('Puerto Viejo', 1), stop('Cahuita', 2), stop('Sixaola', 2)];
  assert.equal(validateTripDraft(2, stops), null);
  assert.deepEqual(orderedStops(stops).map(s => s.day_number), [1, 2, 2]);
});
test('reordering preserves day and cannot cross day boundaries', () => {
  const stops = [stop('Puerto Viejo', 1), stop('Cahuita', 2), stop('Sixaola', 2)];
  assert.deepEqual(moveStop(stops, 2, -1).map(s => s.custom_title), ['Puerto Viejo', 'Sixaola', 'Cahuita']);
  assert.deepEqual(moveStop(stops, 1, -1), stops);
});
test('shortening a trip requires explicit reassignment; costs cannot be negative or nonfinite', () => {
  assert.match(validateTripDraft(1, [stop('Cahuita', 2)])!, /fuera/);
  for (const cost of [-1, NaN, Infinity]) assert.match(validateTripDraft(2, [{ ...stop('Cahuita', 2), estimated_cost: cost }])!, /costos/);
});
