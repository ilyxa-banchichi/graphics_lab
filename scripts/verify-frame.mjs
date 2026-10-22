import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const req=createRequire(import.meta.url),ts=req('typescript');
async function load(file){const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))}
const {initialFrame,passPlan,targetBytes}=await load('src/frameModel.ts'),{frameSteps}=await load('src/frameContent.ts');
const ids=s=>passPlan(s).map(p=>p.id);
assert.deepEqual(ids(initialFrame),['shadow','opaque','transparent','extract','blur-x','blur-y','composite','ui']);
assert.deepEqual(ids({...initialFrame,path:'deferred'}),['shadow','gbuffer','opaque','transparent','extract','blur-x','blur-y','composite','ui']);
for(const path of ['forward','deferred'])for(const shadows of [true,false])for(const bloom of [true,false])for(const transparent of [true,false])for(const uiBefore of [true,false]){
 const s={...initialFrame,path,shadows,bloom,transparent,uiBefore};const plan=passPlan(s);const available=new Set(['Геометрия','Свет','Материалы']);
 for(const p of plan){for(const name of p.reads)assert(available.has(name),`${p.id} reads undefined ${name}`);p.writes.forEach(n=>available.add(n))}
 assert(available.has('Display Color'));assert.equal(plan.some(p=>p.id==='shadow'),shadows);assert.equal(plan.some(p=>p.id==='extract'),bloom);
 assert.equal(plan.some(p=>p.id==='ui-before'),uiBefore);assert.equal(plan.some(p=>p.id==='ui'),!uiBefore);
}
assert.equal(targetBytes(1000,600,true,false,false,0),4*targetBytes(500,300,true,false,false,0));
assert(targetBytes(1000,600,true,true,true,512)>targetBytes(1000,600,true,false,false,512));
assert.equal(frameSteps.length,30);assert.equal(frameSteps.filter(s=>s.kind==='render-demo').length,13);assert.equal(new Set(frameSteps.map(s=>s.key)).size,30);
for(const s of frameSteps){assert(!/лекци|урок|заняти|учебн.*курс/i.test(JSON.stringify(s)));assert(s.key.startsWith('frame/'))}
console.log('✓ 32 configurations: resource producers precede readers; toggles preserve valid output');console.log('✓ Resolution / resource memory scaling');console.log('✓ 30 routes, 17 slides, 13 demos; neutral standalone copy');
