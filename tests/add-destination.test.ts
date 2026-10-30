import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appendDestination} from '../src/lib/add-destination';
const existing=[{spot_id:'a',custom_title:'Cahuita',day_number:1,estimated_cost:25,notes:'Reserva confirmada',custom_address:'Entrada'},{spot_id:'b',custom_title:'Sixaola',day_number:2,estimated_cost:0}];
test('adding a destination appends to its day without losing the original stops or notes',()=>{
 const added=appendDestination(existing,{spot_id:'c',custom_title:'Puerto Viejo'},1,10,2);
 assert.deepEqual(added.map(s=>s.custom_title),['Cahuita','Puerto Viejo','Sixaola']);
 assert.equal(added[0].notes,'Reserva confirmada');
 assert.equal(added[1].estimated_cost,10);
 assert.equal(existing.length,2);
});
test('adding a destination rejects invalid days, costs and same-day duplicates',()=>{
 assert.throws(()=>appendDestination(existing,{spot_id:'a',custom_title:'Cahuita'},1,0,2),/ya está/);
 assert.throws(()=>appendDestination(existing,{custom_title:'Otro'},3,0,2),/duración/);
 assert.throws(()=>appendDestination(existing,{custom_title:'Otro'},2,-1,2),/costo/);
 assert.equal(appendDestination(existing,{spot_id:'a',custom_title:'Cahuita'},2,0,2).length,3);
});
