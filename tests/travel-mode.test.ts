import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreProgress,travelSignature,freshProgress,validPoint,navigationLink} from '../src/lib/travel-mode';
const stops=[{custom_title:'Puerto Viejo',day_number:1},{custom_title:'Cahuita',day_number:2},{custom_title:'Sixaola',day_number:2}];
test('travel resumes same-day stops in order and resets progress after itinerary changes',()=>{
 const saved=JSON.stringify({signature:travelSignature(stops),progress:{...freshProgress(),completed:2,paused:true}});
 assert.equal(restoreProgress(saved,stops).completed,2);
 assert.equal(restoreProgress(saved,stops).paused,true);
 assert.equal(restoreProgress(saved,[...stops].reverse()).completed,0);
});
test('invalid stored progress and locations are rejected',()=>{
 assert.deepEqual(restoreProgress('{broken',stops),freshProgress());
 const raw=JSON.stringify({signature:travelSignature(stops),progress:{...freshProgress(),completed:99}});
 assert.deepEqual(restoreProgress(raw,stops),freshProgress());
 assert.equal(validPoint({latitude:null,longitude:0}),false);
 assert.equal(validPoint({latitude:95,longitude:0}),false);
 assert.equal(validPoint({latitude:0,longitude:0}),true);
});
test('navigation uses confirmed coordinates and a Google Maps directions link',()=>{
 const url=new URL(navigationLink({latitude:9.65,longitude:-82.75}));
 assert.equal(url.hostname,'www.google.com');
 assert.equal(url.searchParams.get('destination'),'9.65,-82.75');
});
