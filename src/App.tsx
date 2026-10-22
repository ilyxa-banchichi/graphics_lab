import {useEffect,useRef,useState} from 'react';
import {lessons} from './catalog';
import {lecture,type LectureStep} from './lecture';
import {frameGroups,frameSteps,type RenderStep} from './frameContent';
import {FrameSlide} from './FrameSlides';
import {FrameDemo} from './FrameDemos';
import './frame.css';
type Step=LectureStep|RenderStep;
const geometry=lecture.map(s=>({...s,key:s.key.replace('lecture/','geometry/')}));
const allSteps:Step[]=[...frameSteps,...geometry];
const groupsFor=(s:Step)=>s.key.startsWith('frame/')?frameGroups:lessons;
const stepsFor=(s:Step):Step[]=>s.key.startsWith('frame/')?frameSteps:geometry;
import {PipelineSlide} from './PipelineSlides';
import {PipelineDemo} from './PipelineDemos';
import './app.css';
import './slides.css';
import './pipeline.css';

function currentStep():Step{
 const hash=location.hash.slice(1).replace('lecture/','geometry/'),step=allSteps.find(s=>s.key===hash);
 if(step)return step;
 const lesson=lessons.find(l=>l.id===hash);
 return lesson?geometry.find(s=>s.section===lesson.id)!:frameSteps[0];
}
export default function App(){
 const [step,setStep]=useState<Step>(currentStep),[revision,setRevision]=useState(0),[notice,setNotice]=useState('');
 const root=useRef<HTMLDivElement>(null),outline=useRef<HTMLElement>(null);
 const steps=stepsFor(step),groups=groupsFor(step),isFrame=step.key.startsWith('frame/');
 const id=step.section,lesson=groups.find(l=>l.id===id)!,isSlide=step.kind==='slide'||step.kind==='render-slide';
 const position=steps.findIndex(s=>s.key===step.key),total=steps.length;
 const groupSteps=steps.filter(s=>s.section===id),key=step.key;
 function navigate(hash:string){if(location.hash.slice(1)===hash)return;location.hash=hash;setStep(currentStep());setRevision(0)}
 function selectSection(next:string){navigate(steps.find(s=>s.section===next)!.key)}
 function move(delta:number){const next=position+delta;if(next>=0&&next<total)navigate(steps[next].key)}
 useEffect(()=>{const sync=()=>{setStep(currentStep());setRevision(0)};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
 useEffect(()=>{if(document.fullscreenElement)root.current?.scrollTo({top:0});else window.scrollTo({top:0})},[key]);
 useEffect(()=>{
  const panel=outline.current,nav=panel?.querySelector('nav'),button=nav?.querySelector<HTMLButtonElement>('button[aria-current="step"]');
  if(!panel||!nav||!button)return;
  const item=button.getBoundingClientRect();
  if(nav.scrollWidth>nav.clientWidth){const box=nav.getBoundingClientRect();const delta=item.left<box.left?item.left-box.left:item.right>box.right?item.right-box.right:0;nav.scrollBy({left:delta});}
  else{const box=panel.getBoundingClientRect();const delta=item.top<box.top?item.top-box.top:item.bottom>box.bottom?item.bottom-box.bottom:0;panel.scrollBy({top:delta});}
 },[key]);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;const target=e.target;if(target instanceof HTMLElement&&(target.matches('input,textarea,select')||target.isContentEditable))return;if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();move(-1)}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[position,isFrame]);
 const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.current?.requestFullscreen();setNotice('')}catch{setNotice('Полный экран недоступен. Разверните окно браузера.')}};
 const reset=()=>setRevision(r=>r+1);

 return <div className="course-app lecture-app unified-lecture" ref={root}>
  <header className="course-header"><a className="brand" href={'#'+frameSteps[0].key}>КГ</a><nav className="topic-switch" aria-label="Материалы"><button aria-current={!isFrame?'page':undefined} onClick={()=>navigate(geometry[0].key)}>Геометрия и пиксели</button><button aria-current={isFrame?'page':undefined} onClick={()=>navigate(frameSteps[0].key)}>Сцена и кадр</button></nav><div className="header-actions"><button className="text-button" onClick={fullscreen}>Во весь экран</button></div></header>
  {notice&&<p className="notice" role="status">{notice}</p>}
  <div className="course-layout">
   <main className="course-main"><div className="course-intro"><p className="eyebrow">{id}<span className="step-kind">{isSlide?'Слайд':'Показ'}</span></p><h1>{isSlide?lesson.title:step.title}</h1><div className="lesson-actions"><button className="secondary-button" disabled={position===0} onClick={()=>move(-1)}>← Назад</button>{!isSlide&&<button className="reset-button" onClick={reset}>Сбросить показ</button>}<button className="secondary-button" disabled={position===total-1} onClick={()=>move(1)}>Далее →</button><span className="step-counter" aria-live="polite">Экран {position+1} из {total}</span></div></div>
   <nav className="pipeline-ribbon" aria-label="Разделы материала" style={{gridTemplateColumns:`repeat(${groups.length},minmax(0,1fr))`}}>{groups.map((g,i)=><button key={g.id} aria-current={g.id===id?'true':undefined} onClick={()=>selectSection(g.id)}><span>{i+1}. {g.tag}</span><strong>{g.title}</strong></button>)}</nav>
   {step.kind==='render-slide'?<FrameSlide slide={step}/>:step.kind==='slide'?<PipelineSlide slide={step}/>:<div key={key+'-'+revision}>{step.kind==='render-demo'?<FrameDemo kind={step.demo}/>:<PipelineDemo kind={step.demo}/>}</div>}
   </main>
   <aside ref={outline} className="group-outline" aria-labelledby="group-outline-title"><p className="eyebrow">В этой группе</p><h2 id="group-outline-title">{lesson.title}</h2><nav aria-label="Слайды и показы текущей группы">{groupSteps.map((item,i)=><button key={item.key} aria-current={key===item.key?'step':undefined} onClick={()=>navigate(item.key)}><span className="outline-number">{i+1}</span><span className="outline-label"><small>{item.kind==='slide'||item.kind==='render-slide'?'Слайд':'Показ'}</small><strong>{item.title}</strong></span></button>)}</nav></aside>
  </div>
  <footer className="course-footer"><span>← / → — смена экрана</span></footer>
 </div>
}
