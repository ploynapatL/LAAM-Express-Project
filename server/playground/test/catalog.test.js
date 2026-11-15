'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {cases}=require('../scenarios');const {requirements}=require('../catalog');
test('ten functional requirements and 33 unique tests are registered',()=>{assert.equal(requirements.length,10);assert.equal(cases.length,33);assert.equal(new Set(cases.map(x=>x.id)).size,cases.length);for(const r of requirements){assert.ok(cases.some(x=>x.fr===r.id));assert.ok(r.br&&r.useCase)}});
test('all test handlers are executable functions',()=>{for(const c of cases){assert.equal(typeof c.run,'function');assert.ok(c.name);assert.ok(c.kind)}});
