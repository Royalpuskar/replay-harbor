import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from './engine.mjs';
import {sample} from './sample.mjs';
test('domain behavior and boundary cases',()=>{assert.equal(run(sample).metrics.stock,5);assert.equal(run(sample).metrics.rejected,1);assert.equal(run({initial:0,events:[{id:'a',delta:1},{id:'a',delta:1}]}).metrics.stock,1);});
test('deterministic result and input preservation',()=>{const copy=JSON.stringify(sample);assert.deepEqual(run(sample),run(sample));assert.equal(JSON.stringify(sample),copy);});
test('reject malformed root and oversized input',()=>{assert.throws(()=>run(null));assert.throws(()=>run([]));assert.throws(()=>run({...sample,oversized:'x'.repeat(200001)}));});

test('same ID and different delta is a conflict rather than a duplicate', () => {
  const r=run({initial:0,events:[{id:'a',delta:2},{id:'a',delta:5}]});
  assert.equal(r.metrics.stock,2);assert.equal(r.metrics.conflicts,1);assert.equal(r.metrics.duplicates,0);
  assert.equal(r.rows[1].originalDelta,2);assert.equal(r.rows[1].appliedDelta,0);
});
test('rejected decisions remain rejected on exact retry after replenishment', () => {
  const r=run({initial:0,events:[{id:'order',delta:-2},{id:'restock',delta:5},{id:'order',delta:-2}]});
  assert.equal(r.metrics.stock,5);assert.equal(r.metrics.rejected,1);assert.equal(r.metrics.duplicates,1);
  assert.equal(r.rows[2].originalStatus,'rejected: negative inventory');
  assert.equal(r.rows[2].originalStock,0);assert.equal(r.rows[2].stock,5);
});
test('a conflict cannot overwrite the original decision', () => {
  const r=run({initial:0,events:[{id:'a',delta:1},{id:'a',delta:2},{id:'a',delta:1}]});
  assert.equal(r.rows[2].status,'duplicate ignored');assert.equal(r.rows[2].originalIndex,0);
  assert.equal(r.metrics.stock,1);
});
test('zero deltas and prototype-like IDs remain valid identities', () => {
  const r=run({initial:0,events:[{id:'__proto__',delta:0},{id:'constructor',delta:1},{id:'__proto__',delta:0}]});
  assert.equal(r.metrics.applied,2);assert.equal(r.metrics.duplicates,1);assert.equal(r.metrics.stock,1);
});
test('reject fractional and malformed quantities and sparse event arrays', () => {
  for(const delta of [0.1,NaN,Infinity,'1',1e12+1])assert.throws(()=>run({initial:0,events:[{id:'a',delta}]}));
  assert.throws(()=>run({initial:0,events:new Array(1)}));
  assert.throws(()=>run({initial:0.5,events:[]}));
});
test('all three-event traces conserve accepted stock and retain first decisions', () => {
  const choices=[{id:'a',delta:-1},{id:'a',delta:0},{id:'a',delta:1},{id:'b',delta:-1},{id:'b',delta:1}];
  for(const a of choices)for(const b of choices)for(const c of choices){
    const r=run({initial:1,events:[a,b,c]});
    assert.equal(r.metrics.stock,1+r.rows.reduce((sum,row)=>sum+row.appliedDelta,0));
    assert.ok(r.rows.every(row=>row.stock>=0));
    for(const row of r.rows){assert.equal(row.originalIndex,r.rows.findIndex(x=>x.id===row.id));}
  }
});
