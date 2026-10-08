import {useState} from 'react';
import {initialPipeline,vertexOutputs,clipPolygon,screen,rasterSamples,cssColor,uvPreview,type PipelineState,type Sample} from './pipelineModel';
import {Range,Choices,Readout,vec,fmt} from './ui';

type GridMode='coverage'|'color'|'uv';
const cellKey=(x:number,y:number)=>x+':'+y;

function RasterGrid({s,mode,perspective=true,pick,onPick,weights=false,label}:{s:PipelineState;mode:GridMode;perspective?:boolean;pick:[number,number];onPick:(p:[number,number])=>void;weights?:boolean;label:string}){
    const n=s.size,samples=rasterSamples(s,perspective),map=new Map(samples.map(p=>[cellKey(p.x,p.y),p])),poly=clipPolygon(vertexOutputs(s)),sel=map.get(cellKey(...pick));
    const fill=(p:Sample|undefined)=>!p?'#10192e':mode==='coverage'?'#2c4a6e':mode==='color'?cssColor(p.color):uvPreview(p.uv);
    const P=[pick[0]+.5,pick[1]+.5],V=sel?.vertices.map(v=>screen(v,n)),line=n/150;
    return <svg className="raster-grid" viewBox={`-1 -1 ${n+2} ${n+2}`} role="img" aria-label={label}>
        {Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>{const p=map.get(cellKey(x,y));return <rect key={cellKey(x,y)} x={x} y={y} width="1" height="1" fill={fill(p)} className="raster-cell" style={{strokeWidth:n/600}} onClick={()=>onPick([x,y])}/>}))}
        {mode==='coverage'&&Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=><circle key={'s'+cellKey(x,y)} cx={x+.5} cy={y+.5} r={.11} className={map.has(cellKey(x,y))?'sample-in':'sample-out'}/>))}
        <polygon className="raster-outline" points={poly.map(v=>screen(v,n).slice(0,2).join(',')).join(' ')} style={{strokeWidth:line*1.4}}/>
        {weights&&sel&&V&&[0,1,2].map(i=>{const [j,k]=[(i+1)%3,(i+2)%3];return <polygon key={i} className="weight-area" points={`${P.join(',')} ${V[j][0]},${V[j][1]} ${V[k][0]},${V[k][1]}`} style={{fill:cssColor(sel.vertices[i].color),strokeWidth:line}}/>})}
        {weights&&sel&&V&&V.map((v,i)=><line key={'l'+i} x1={P[0]} y1={P[1]} x2={v[0]} y2={v[1]} className="weight-line" style={{strokeWidth:line}}/>)}
        <rect x={pick[0]} y={pick[1]} width="1" height="1" className="raster-pick" style={{strokeWidth:line*1.6}}/>
    </svg>;
}
const defaultPick=(n:number):[number,number]=>[Math.floor(n*.62),Math.floor(n*.62)];
const clampPick=(p:[number,number],n:number):[number,number]=>[Math.min(p[0],n-1),Math.min(p[1],n-1)];
function centerPick(s:PipelineState):[number,number]{const all=rasterSamples(s),cx=all.reduce((t,p)=>t+p.x,0)/all.length,cy=all.reduce((t,p)=>t+p.y,0)/all.length,best=all.reduce((a,p)=>Math.hypot(p.x-cx,p.y-cy)<Math.hypot(a.x-cx,a.y-cy)?p:a,all[0]);return best?[best.x,best.y]:defaultPick(s.size)}

export function CoverageDemo(){
    const [s,S]=useState<PipelineState>(initialPipeline),[rawPick,Pick]=useState<[number,number]>(defaultPick(initialPipeline.size)),set=(p:Partial<PipelineState>)=>S(o=>({...o,...p}));
    const pick=clampPick(rawPick,s.size),covered=rasterSamples(s).length,inside=rasterSamples(s).some(p=>p.x===pick[0]&&p.y===pick[1]);
    return <div className="lab-grid"><section className="stage-wrap"><div className="pipeline-visual raster-visual"><RasterGrid s={s} mode="coverage" pick={pick} onPick={Pick} label="Покрытие выборок треугольником"/></div><div className="stage-caption">Одна выборка в центре каждой ячейки. Щёлкните ячейку.</div></section>
    <aside className="controls"><h2>Параметры</h2><Readout label="Выборка в центре ячейки">({fmt(pick[0]+.5,1)}; {fmt(pick[1]+.5,1)})</Readout><Readout label="Результат">{inside?'Центр внутри → фрагмент есть':'Центр снаружи → фрагмента нет'}</Readout><Readout label="Покрыто выборок">{covered}</Readout><Range label="Перенос по X" value={s.tx} min={-1} max={1} onChange={tx=>set({tx})}/><Range label="Поворот вокруг Y" value={s.rotation} min={-65} max={65} step={1} unit="°" precision={0} onChange={rotation=>set({rotation})}/><Range label="Сетка viewport" value={s.size} min={12} max={32} step={2} precision={0} onChange={size=>set({size})}/></aside></div>;
}

function WeightBars({lambda}:{lambda:number[]}){return <div className="weight-bars">{lambda.map((l,i)=><div key={i} className="weight-bar"><span>λ{'ABC'[i]}</span><i><b style={{width:Math.max(0,Math.min(1,l))*100+'%',background:['#ff704f','#68d7bf','#829bff'][i]}}/></i><strong>{fmt(l)}</strong></div>)}<div className="weight-sum">Сумма = {fmt(lambda.reduce((a,b)=>a+b,0))}</div></div>}
export function InterpolationDemo(){
    const [size,Size]=useState(24),[attr,Attr]=useState<'color'|'uv'>('color'),[rawPick,Pick]=useState<[number,number]>(defaultPick(24));
    const s={...initialPipeline,size},pick=clampPick(rawPick,size),sel=rasterSamples(s).find(p=>p.x===pick[0]&&p.y===pick[1]);
    return <div className="lab-grid"><section className="stage-wrap"><div className="pipeline-visual raster-visual"><RasterGrid s={s} mode={attr} pick={pick} onPick={Pick} weights label="Интерполированные значения в выборках"/></div><div className="stage-caption">Площадь цветного участка — вес вершины того же цвета. Щёлкните ячейку внутри треугольника.</div></section>
    <aside className="controls"><h2>Параметры</h2><Choices label="Показать" value={attr} options={[['color','Цвет вершин'],['uv','Сетка UV']]} onChange={Attr}/>{sel?<><span className="field-label">Веса выборки</span><WeightBars lambda={sel.weights}/><Readout label="Color = λA·A + λB·B + λC·C"><span className="color-chip" style={{background:cssColor(sel.color)}}/>{vec(sel.color)}</Readout><Readout label="UV">{vec(sel.uv)}</Readout></>:<p className="control-note">Выбранная выборка снаружи: фрагмента нет.</p>}<Range label="Сетка viewport" value={size} min={12} max={32} step={2} precision={0} onChange={Size}/></aside></div>;
}

export function PerspectiveDemo(){
    const [rotation,R]=useState(45),[size,Size]=useState(24),[rawPick,Pick]=useState<[number,number]>(()=>centerPick({...initialPipeline,rotation:45}));
    const s={...initialPipeline,rotation,size},pick=clampPick(rawPick,size),at=(correct:boolean)=>rasterSamples(s,correct).find(p=>p.x===pick[0]&&p.y===pick[1]);
    const flat=at(false),right=at(true);
    return <div className="lab-grid"><section className="stage-wrap"><div className="pipeline-visual raster-pair">{([[false,'По экранным расстояниям'],[true,'С учётом w']] as const).map(([correct,title])=><figure key={title} className={correct?'correct':'affine'}><figcaption>{title}</figcaption><RasterGrid s={s} mode="uv" perspective={correct} pick={pick} onPick={Pick} label={'UV '+title}/></figure>)}</div><div className="stage-caption">Контур одинаковый, отличаются только UV внутри.</div></section>
    <aside className="controls"><h2>Параметры</h2><Range label="Поворот вокруг Y" value={rotation} min={-65} max={65} step={1} unit="°" precision={0} onChange={R}/><Range label="Сетка viewport" value={size} min={12} max={32} step={2} precision={0} onChange={Size}/>{flat&&right?<><Readout label="UV по экрану">{vec(flat.uv)}</Readout><Readout label="UV с учётом w">{vec(right.uv)}</Readout></>:<p className="control-note">Щёлкните ячейку внутри треугольника.</p>}<p className="control-note">Ближняя к камере часть проекции крупнее дальней. Поправка учитывает w каждой вершины.</p></aside></div>;
}

// Slide visuals use a fixed small grid so the idea reads at a glance.
const slideTri=[[1.2,8.8],[8.8,8.8],[8.8,1.2]];
function insideTri([x,y]:number[]){const [a,b,c]=slideTri,s=(p:number[],q:number[],r:number[])=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);const d1=s(a,b,[x,y]),d2=s(b,c,[x,y]),d3=s(c,a,[x,y]);return!((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0))}
function MiniGrid({stage}:{stage:number}){const cells=Array.from({length:100},(_,i)=>[i%10,Math.floor(i/10)]);return <svg viewBox="-.3 -.3 10.6 10.6" aria-hidden="true">{cells.map(([x,y])=><rect key={x+':'+y} x={x} y={y} width="1" height="1" className={stage===2&&insideTri([x+.5,y+.5])?'mini-frag':'mini-cell'}/>)}{stage>=1&&cells.map(([x,y])=><circle key={'c'+x+':'+y} cx={x+.5} cy={y+.5} r=".12" className={insideTri([x+.5,y+.5])?'sample-in':'sample-out'}/>)}<polygon className="mini-tri" points={slideTri.map(p=>p.join(',')).join(' ')}/></svg>}
export function FragmentsSlide(){return <div className="fragments-slide"><div className="fragment-steps">{['Непрерывный контур','Центры-выборки','Покрытые → фрагменты'].map((t,i)=><figure key={t}><MiniGrid stage={i}/><figcaption>{t}</figcaption></figure>)}</div><dl className="fragment-terms"><div><dt>Pixel</dt><dd>Ячейка изображения. Хранит итоговый цвет.</dd></div><div><dt>Sample</dt><dd>Точка проверки покрытия. У нас — центр ячейки.</dd></div><div><dt>Fragment</dt><dd>Данные одной покрытой выборки: положение, глубина, атрибуты.</dd></div></dl></div>}

export function WeightsSlide(){
    const V=[[40,250],[300,250],[300,30]],l=[.2,.5,.3],P=[0,1].map(k=>V.reduce((t,v,i)=>t+v[k]*l[i],0)),colors=['#ff704f','#68d7bf','#829bff'];
    return <div className="weights-slide"><svg viewBox="0 0 340 280" role="img" aria-label="Точка P делит треугольник на три части, площади частей — веса вершин">{[0,1,2].map(i=>{const [j,k]=[(i+1)%3,(i+2)%3];return <polygon key={i} points={`${P.join(',')} ${V[j].join(',')} ${V[k].join(',')}`} fill={colors[i]} fillOpacity=".45" stroke="#0b1020" strokeWidth="1.5"/>})}<polygon points={V.map(v=>v.join(',')).join(' ')} fill="none" stroke="#ffee55" strokeWidth="3"/>{V.map((v,i)=><g key={i}><circle cx={v[0]} cy={v[1]} r="7" fill={colors[i]}/><text x={v[0]+(i===0?-18:16)} y={v[1]+(i===2?-6:20)} className="weights-name">{'ABC'[i]}</text></g>)}<circle cx={P[0]} cy={P[1]} r="6" fill="#fff"/><text x={P[0]-22} y={P[1]-10} className="weights-name">P</text></svg>
    <div className="weights-info"><WeightBars lambda={l}/><p className="slide-formula">Color(P) = λA·A + λB·B + λC·C</p><p>Color(P) = {vec(l)} · UV(P) = (0,8; 0,3)</p><p className="visual-footnote">Чем ближе P к вершине, тем больше её участок и её вклад.</p></div></div>;
}
