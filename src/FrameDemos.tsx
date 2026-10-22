import {useMemo,useState} from 'react';
import {FrameCanvas} from './FrameCanvas';
import {Range,Toggle,Choices,Readout} from './ui';
import {initialFrame,passPlan,type FrameSpec,type FrameReport} from './frameModel';
import type {FrameDemoKind} from './frameContent';
import objectHlsl from '../shaders/Multipass.hlsl?raw';
import screenHlsl from '../shaders/ScreenPass.hlsl?raw';
function defaults(kind:FrameDemoKind):FrameSpec{return {...initialFrame,...(['gbuffer','targets'].includes(kind)?{path:'deferred' as const}:{}),...(['commands','opaque'].includes(kind)?{bloom:false,transparent:false,ui:false}:{}),...(kind==='post-order'?{threshold:.7}:{}),...(kind==='shadows'?{preview:'shadow',bloom:false}:{}),...(kind==='gbuffer'?{preview:'albedo',bloom:false}:{}),...(kind==='bloom'?{preview:'bright'}:{})}}
export function FrameDemo({kind}:{kind:FrameDemoKind}){
 const [state,setState]=useState(()=>defaults(kind)),[report,Report]=useState<FrameReport|null>(null),[selected,Select]=useState('');
 const set=(patch:Partial<FrameSpec>)=>setState(s=>{const next={...s,...patch};const plan=passPlan(next);if(next.stop!=='all'&&!plan.some(p=>p.id===next.stop))next.stop='all';if(!next.shadows&&next.preview==='shadow'||!next.bloom&&['bright','blur'].includes(next.preview)||next.path==='forward'&&['albedo','normal'].includes(next.preview))next.preview='result';return next});
 const spec=useMemo(()=>state,[state]),plan=passPlan(state);
 const views:[string,string][]=[['result','Результат'],['color','Scene Color'],['depth','Camera Depth'],...(state.shadows?[['shadow','Shadow Depth'] as [string,string]]:[]),...(state.path==='deferred'?[['albedo','Albedo'],['normal','Normal']] as [string,string][]:[]),...(state.bloom?[['bright','Bright'],['blur','Blur']] as [string,string][]:[])];
 const active=report?.passes.find(p=>p.id===selected)||report?.passes.at(-1);
 return <div className="frame-demo"><div className="frame-workbench"><section className="frame-stage"><div className="frame-stage-top"><span>{state.preview==='result'?'Кадр':views.find(v=>v[0]===state.preview)?.[1]}</span><span>{report?.width} × {report?.height} · {report?.hdr?'HDR / RGBA16F':'RGBA8'}</span></div><FrameCanvas spec={spec} onReport={Report}/><div className="frame-summary"><span><b>{report?.passes.length??0}</b> проходов</span><span><b>{report?.calls??0}</b> draw calls</span><span><b>{report?.triangles.toLocaleString('ru')??0}</b> треугольников с повторами</span></div></section><aside className="controls frame-controls"><h2>Параметры</h2>
 <label className="frame-select">Показать ресурс<select aria-label="Показать ресурс" value={state.preview} onChange={e=>set({preview:e.target.value,stop:'all'})}>{views.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 <label className="frame-select">Остановиться после<select aria-label="Остановиться после" value={state.stop} onChange={e=>set({stop:e.target.value,preview:'result'})}><option value="all">Весь кадр</option>{plan.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 {['frame','targets','gbuffer','lights','cost'].includes(kind)&&<Choices label="Путь освещения" value={state.path} options={[["forward","Forward"],["deferred","Deferred"]]} onChange={path=>set({path,preview:kind==='gbuffer'&&path==='deferred'?'albedo':'result'})}/>}
 {['frame','shadows','graph','debugger','cost','targets'].includes(kind)&&<Toggle label="Карта теней" value={state.shadows} onChange={shadows=>set({shadows})}/>}
 {kind==='shadows'&&<><Range label="Положение света" value={state.angle} min={-80} max={80} unit="°" step={1} precision={0} onChange={angle=>set({angle})}/><Choices label="Карта теней · texels" value={String(state.shadowSize)} options={[["128","128²"],["512","512²"],["1024","1024²"]]} onChange={v=>set({shadowSize:Number(v)})}/><Range label="Shadow bias" min={0} max={.03} step={.001} precision={3} value={state.bias} onChange={bias=>set({bias})}/></>}
 {['frame','transparent','opaque','graph','debugger','cost'].includes(kind)&&<Toggle label="Прозрачные поверхности" value={state.transparent} onChange={transparent=>set({transparent})}/>}
 {kind==='transparent'&&<Toggle label="Обратный порядок слоёв" value={state.reverse} onChange={reverse=>set({reverse})}/>}
 {['frame','commands','cost'].includes(kind)&&<><Range label="Копий малого куба" min={1} max={24} step={1} precision={0} value={state.copies} onChange={copies=>set({copies})}/><Toggle label="GPU Instancing для копий" value={state.instanced} onChange={instanced=>set({instanced})}/></>}
 {['lights','cost'].includes(kind)&&<Range label="Источников света" min={1} max={4} step={1} precision={0} value={state.lights} onChange={lights=>set({lights})}/>}
 {['frame','bloom','post-order','graph','debugger','cost'].includes(kind)&&<Toggle label="Bloom" value={state.bloom} onChange={bloom=>set({bloom})}/>}
 {['bloom','post-order'].includes(kind)&&<><Range label="Порог яркости" min={0} max={4} step={.05} value={state.threshold} onChange={threshold=>set({threshold})}/><Range label="Сила bloom" min={0} max={2} value={state.strength} onChange={strength=>set({strength})}/><Range label="Экспозиция" min={.2} max={3} value={state.exposure} onChange={exposure=>set({exposure})}/></>}
 {kind==='post-order'&&<><Toggle label="UI" value={state.ui} onChange={ui=>set({ui})}/><Toggle label="UI до постобработки" value={state.uiBefore} onChange={uiBefore=>set({uiBefore})}/></>}
 {kind==='cost'&&<><Choices label="Масштаб рендера" value={String(state.scale)} options={[["0.5","50%"],["0.75","75%"],["1","100%"]]} onChange={v=>set({scale:Number(v)})}/><Readout label="Оценка активных targets">{((report?.memory||0)/1048576).toFixed(2)} MiB</Readout></>}
 <button className="secondary-button" onClick={()=>{setState(defaults(kind));Select('')}}>Исходное состояние</button>
 </aside></div>
 <section className="frame-events" aria-label="Проходы кадра"><h2>Проходы кадра</h2><div className="frame-pass-strip">{plan.map((p,i)=><button key={p.id} className={active?.id===p.id?'selected':undefined} aria-pressed={active?.id===p.id} onClick={()=>Select(p.id)}><small>{i+1}</small><strong>{p.name}</strong><span>{report?.passes.find(x=>x.id===p.id)?.draws??'—'} draw</span></button>)}</div>
 {active&&<div className="pass-details"><div><small>Читает</small><p>{active.reads.join(' · ')}</p></div><div><small>Записывает</small><p>{active.writes.join(' · ')}</p></div><div><small>Команды</small><p>{active.draws} draw calls · {active.triangles.toLocaleString('ru')} треугольников</p></div></div>}
 <p className="frame-note">{state.stop==='all'?'Счётчики отражают выполненные команды GPU этого кадра.':'Кадр остановлен: последующие проходы не выполняются.'} Вспомогательный вывод выбранного ресурса в счётчики не включён.</p>
 {['graph','debugger'].includes(kind)&&<div className="dependency-list">{plan.map(p=><div key={p.id}><span>{p.reads.join(' + ')}</span><b>→ {p.name} →</b><span>{p.writes.join(' + ')}</span></div>)}</div>}
 {kind==='commands'&&<p className="frame-note">Instancing объединяет копии одного меша с общим материалом в одну команду на проход. Земля, большой куб, сфера и светящийся объект остаются отдельными. SRP Batcher решает другую задачу — уменьшает затраты CPU на подготовку состояния.</p>}
 {kind==='lights'&&<p className="frame-note">В Forward все выбранные источники считаются в одном шейдере геометрии. Deferred использует два MRT-буфера и один полноэкранный проход освещения. Это компактные реализации для сравнения данных, без clustered light culling URP.</p>}
 {kind==='cost'&&<p className="frame-note">Это счётчики работы и оценка размера активных targets, без служебных выделений и выравнивания драйвера. Они не являются измерением GPU-времени. Изменение количества источников увеличивает вычисления, даже если draw calls не меняются.</p>}
 {!report?.hdr&&report&&<p className="frame-note">В этом браузере недоступен float color target: рабочий цвет ограничен RGBA8. Для сравнения HDR и bloom нужен EXT_color_buffer_float.</p>}
 <details><summary>HLSL проходов</summary><pre>{['bloom','post-order'].includes(kind)?screenHlsl:objectHlsl}</pre></details></section>
 </div>
}
