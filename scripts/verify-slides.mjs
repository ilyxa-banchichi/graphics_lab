import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),ts=require('typescript');
const load=file=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const {lecture}=await load('src/lecture.ts'),{lessons}=await load('src/catalog.ts');
const {chromium}=require(process.env.LECTURE_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.LECTURE_CHROME?{executablePath:process.env.LECTURE_CHROME}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const base=process.env.LECTURE_URL||'http://127.0.0.1:5173';
const slides=lecture.filter(s=>s.kind==='slide');
const wait=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const check=(ok,message)=>{if(!ok)throw Error(message);console.log('✓ '+message)};
const goto=async step=>{await page.goto(base+'/#'+step.key);await page.locator('.step-counter').waitFor();await wait()};
try{
check(new Set(lecture.map(s=>s.key)).size===lecture.length,'Stable unique routes');
await page.goto(base);await wait();check(await page.locator('.lecture-slide').count()===1,'Default opens lecture cover');
for(let i=0;i<lecture.length;i++){const step=lecture[i];check((await page.locator('.step-counter').innerText())===`Экран ${i+1} из ${lecture.length}`,'Sequence '+step.key);if(step.kind==='slide'){check((await page.locator('.lecture-slide>h2').innerText())===step.title,'Slide title '+step.key);check(await page.locator('.lecture-slide').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Content fits '+step.key);}if(i<lecture.length-1)await page.getByRole('button',{name:'Далее →',exact:true}).click();await wait()}
check(await page.getByRole('button',{name:'Далее →',exact:true}).isDisabled(),'Lecture ends without wrapping');
await page.getByRole('button',{name:'← Назад',exact:true}).click();await page.keyboard.press('ArrowLeft');check((await page.locator('.step-counter').innerText()).includes(`Экран ${lecture.length-2} из`),'Keyboard works after button navigation');
check(await page.locator('.course-view-switch').count()===0,'Single flow without mode switch');
check(await page.locator('.lesson-nav').count()===0,'No duplicate group sidebar');
for(const section of [...new Set(lecture.map(s=>s.section))]){
 const group=lecture.filter(s=>s.section===section);
 await page.getByRole('navigation',{name:'Разделы лекции'}).getByRole('button').nth(lessons.findIndex(l=>l.id===section)).click();await wait();check(await page.locator('.pipeline-ribbon button[aria-current]').count()===1,'One selected section '+section);
 check((await page.locator('.step-counter').innerText())===`Экран ${lecture.indexOf(group[0])+1} из ${lecture.length}`,'Group opens first screen '+section);
 check(await page.locator('.group-outline button').count()===group.length,'Outline includes all slides and shows '+section);
 for(const item of group){await page.locator('.group-outline button').filter({hasText:item.title}).click();await wait();check(await page.locator('.group-outline button[aria-current="step"]').count()===1,'One selected screen');check((await page.locator('.step-counter').innerText())===`Экран ${lecture.indexOf(item)+1} из ${lecture.length}`,'Outline opens '+item.key);}
}
await page.goto(base+'/#F00');await wait();check(await page.locator('.lecture-slide').count()===1,'Section shortcut opens unified flow');await page.getByRole('button',{name:'Далее →',exact:true}).click();await page.getByRole('button',{name:'Далее →',exact:true}).click();check(await page.locator('.pipeline-gpu canvas').count()===1,'Next opens interactive in same flow');
await page.setViewportSize({width:390,height:900});await goto(lecture.find(s=>s.key==='lecture/F00/material-show'));
check(await page.locator('.group-outline button[aria-current="step"]').evaluate(e=>{const r=e.getBoundingClientRect(),n=e.parentElement.getBoundingClientRect();return r.left>=n.left-1&&r.right<=n.right+1}),'Current screen stays visible in mobile outline');
for(const width of [390,850,1440]){await page.setViewportSize({width,height:900});for(const step of slides){await goto(step);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow '+width+' '+step.key);check(await page.locator('.lecture-slide').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'No slide overflow '+width+' '+step.key)}}
await page.setViewportSize({width:1440,height:1000});for(const step of slides){await goto(step);await page.addStyleTag({content:'html{font-size:200%!important}'});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'200% text '+step.key)}
check(errors.length===0,'No browser errors: '+JSON.stringify(errors));
console.log(`${slides.length} slides, ${lecture.length} lecture steps verified.`);
}finally{await browser.close()}
