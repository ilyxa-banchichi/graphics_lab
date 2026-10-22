import {CoverSlide} from './PipelineSlides';
import type {RenderSlide} from './frameContent';
function Flow({items,notes}:{items:string[];notes?:string[]}){return <div className="render-flow">{items.map((t,i)=><div key={t}><small>{String(i+1).padStart(2,'0')}</small><strong>{t}</strong>{notes?.[i]&&<p>{notes[i]}</p>}{i<items.length-1&&<span aria-hidden="true">→</span>}</div>)}</div>}
function ShadowDiagram(){return <figure className="shadow-explanation"><svg className="render-shadow" viewBox="0 0 960 370" role="img" aria-labelledby="shadow-diagram-title shadow-diagram-description">
 <title id="shadow-diagram-title">Камера видит поверхность, карта теней проверяет доступность света</title>
 <desc id="shadow-diagram-description">Синие линии соединяют игровую камеру с точками P и Q. Обе точки видны камере. На пути света к P находится объект: его глубина меньше глубины P. До Q свет доходит без препятствий.</desc>
 <defs><marker id="shadow-light-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#ffc066"/></marker><marker id="shadow-camera-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#a6b2ff"/></marker></defs>
 <path d="M55 260H900" stroke="#657697" strokeWidth="3"/>
 <path d="M380 160L534 260H380Z" fill="#ff704f" fillOpacity=".12"/>
 <path d="M380 260H534" stroke="#ff704f" strokeWidth="7"/>
 <circle cx="80" cy="56" r="15" fill="#ffc066"/><text x="55" y="25">Направление света</text>
 <path d="M130 26L336 160M290 26L650 260" stroke="#ffc066" strokeWidth="2.5" markerEnd="url(#shadow-light-arrow)"/>
 <path d="M336 160L490 260" stroke="#ff704f" strokeWidth="2.5" strokeDasharray="7 6"/>
 <path d="M300 160V260H380V160Z" fill="#68d7bf"/>
 <circle cx="336" cy="160" r="6" fill="#ffc066" stroke="#10192e" strokeWidth="2"/>
 <text x="205" y="139">Объект</text><text x="347" y="147">S</text>
 <path d="M774 90L490 260M774 90L650 260" stroke="#a6b2ff" strokeWidth="2.5" markerEnd="url(#shadow-camera-arrow)"/>
 <path d="M776 68H820V104H776Z M776 77L760 70V102L776 95Z" fill="#27304a" stroke="#a6b2ff" strokeWidth="2.5"/>
 <text x="703" y="45">Игровая камера</text>
 <circle cx="490" cy="260" r="6" fill="#ff704f"/><circle cx="650" cy="260" r="6" fill="#ffc066"/>
 <text x="480" y="288">P</text><text x="640" y="288">Q</text>
 <text x="55" y="328">P: глубина точки &gt; глубины S в карте → тень</text>
 <text x="55" y="356">Q: глубины совпадают → точка освещена</text>
 </svg><figcaption>Камера видит обе точки. В карте со стороны света сохранили глубину S: она меньше глубины P, поэтому P в тени. Синие линии показывают связь камеры с поверхностью; в этом алгоритме лучи не трассируем.</figcaption></figure>}
export function FrameSlide({slide:s}:{slide:RenderSlide}){if(s.visual==='cover')return <CoverSlide title={s.title} lead={s.lead}/>;return <article className="lecture-slide render-slide" aria-labelledby="slide-title"><h2 id="slide-title">{s.title}</h2><p className="slide-lead">{s.lead}</p><div className="render-visual">{s.definition&&<p className="render-definition">{s.definition}</p>}{s.visual==='shadow'&&<ShadowDiagram/>}{s.examples&&<div className="render-examples"><h3>Примеры проходов</h3><ul>{s.examples.map(example=><li key={example}>{example}</li>)}</ul></div>}{s.flow&&<Flow items={s.flow} notes={s.flowNotes}/>} {s.rows&&<table><thead><tr>{s.rows[0].map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{s.rows.slice(1).map((row,i)=><tr key={i}>{row.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table>}{s.code&&<pre>{s.code}</pre>}</div>{s.points.length>0&&<ul className="slide-points">{s.points.map(p=><li key={p}>{p}</li>)}</ul>}</article>}
