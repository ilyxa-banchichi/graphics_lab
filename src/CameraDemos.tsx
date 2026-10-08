import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {atlasCanvas} from './SceneView';
import {initialPipeline,matrices,triangle,vertexSpaces,vertexOutputs,clipPolygon,type PipelineState} from './pipelineModel';
import {Range,Toggle,Choices,Readout,vec} from './ui';

const HELPERS=1;
const onHelperLayer=(o:T.Object3D)=>{o.traverse(c=>c.layers.set(HELPERS));return o};

function makeTexture(){const t=new T.CanvasTexture(atlasCanvas());t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;return t}
function addLights(scene:T.Scene){scene.add(new T.AmbientLight(0xffffff,1.1));const sun=new T.DirectionalLight(0xffffff,1.8);sun.position.set(2,3,4);scene.add(sun)}

// Local corners of the visible volume: near rectangle, then far rectangle.
function frustumCorners(camera:T.PerspectiveCamera|T.OrthographicCamera,far:number){
    const rect=(z:number,hw:number,hh:number)=>[[-hw,-hh,-z],[hw,-hh,-z],[hw,hh,-z],[-hw,hh,-z]];
    if(camera instanceof T.PerspectiveCamera){const t=Math.tan(camera.fov*Math.PI/360);return[...rect(camera.near,camera.near*t*camera.aspect,camera.near*t),...rect(far,far*t*camera.aspect,far*t)]}
    return[...rect(camera.near,camera.right,camera.top),...rect(far,camera.right,camera.top)];
}
function cameraGizmo(camera:T.PerspectiveCamera|T.OrthographicCamera,far:number,opacity=.08){
    const g=new T.Group(),c=frustumCorners(camera,far),v=c.map(p=>new T.Vector3(...p));
    const edges=[0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7];
    if(camera instanceof T.PerspectiveCamera)edges.push(...[0,1,2,3].flatMap(i=>[8,i]));
    const lines=new T.BufferGeometry().setFromPoints(edges.map(i=>i===8?new T.Vector3():v[i]));
    g.add(new T.LineSegments(lines,new T.LineBasicMaterial({color:'#ffc066'})));
    const fill=new T.BufferGeometry().setFromPoints(v);fill.setIndex([0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,0,2,1,0,3,2,4,5,6,4,6,7]);
    g.add(new T.Mesh(fill,new T.MeshBasicMaterial({color:'#ffc066',transparent:true,opacity,side:T.DoubleSide,depthWrite:false})));
    const body=new T.Mesh(new T.BoxGeometry(.22,.16,.26),new T.MeshBasicMaterial({color:'#a6b2ff'}));body.position.z=.15;g.add(body);
    const lens=new T.Mesh(new T.ConeGeometry(.09,.14,16),new T.MeshBasicMaterial({color:'#c1caff'}));lens.rotation.x=Math.PI/2;lens.position.z=-.04;g.add(lens);
    g.matrixAutoUpdate=false;g.matrix.copy(camera.matrixWorld);
    return onHelperLayer(g);
}
function disposeTree(o:T.Object3D){o.traverse(c=>{if(c instanceof T.Mesh||c instanceof T.Line){c.geometry.dispose();(Array.isArray(c.material)?c.material:[c.material]).forEach(m=>m.dispose())}})}

// Thick outline and vertex labels drawn over the canvas, as in the scene overview.
function outline(host:HTMLElement,camera:T.Camera,points:T.Vector3[],labels=true){
    host.querySelectorAll('.scene-triangle').forEach(n=>n.remove());
    if(points.some(p=>p.clone().applyMatrix4(camera.matrixWorldInverse).z>-.01))return;
    const w=host.clientWidth,h=host.clientHeight,px=points.map(p=>{const q=p.clone().project(camera);return[(q.x*.5+.5)*w,(.5-q.y*.5)*h]});
    const cx=px.reduce((t,p)=>t+p[0],0)/3,cy=px.reduce((t,p)=>t+p[1],0)/3;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('scene-triangle');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    svg.innerHTML=`<polygon points="${px.map(p=>p.join(',')).join(' ')}"/>`+(labels?px.map(([x,y],i)=>{const d=Math.hypot(x-cx,y-cy)||1;return`<circle cx="${x}" cy="${y}" r="4"/><text x="${x+(x-cx)/d*16}" y="${y+(y-cy)/d*16}">${'ABC'[i]}</text>`}).join(''):'');
    host.appendChild(svg);
}
function label(host:HTMLElement,camera:T.Camera,text:string,point:T.Vector3,className='scene-label'){const q=point.clone().project(camera),n=document.createElement('span');n.className=className;n.dataset.sceneLabel='true';n.textContent=text;n.style.left=(q.x*.5+.5)*100+'%';n.style.top=(.5-q.y*.5)*100+'%';host.appendChild(n)}
function makeRenderer(host:HTMLElement){const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(r.domElement);return r}
const triangleWorld=(model:T.Matrix4)=>triangle.positions.map(p=>new T.Vector3(...p).applyMatrix4(model));

type Rig={x:number;y:number;rotation:number;scale:number;z:number;fov:number;near:number;far:number;ortho:boolean};
const rigDefaults:Rig={x:0,y:0,rotation:25,scale:1,z:3,fov:45,near:.5,far:5,ortho:false};

function RigViews({rig}:{rig:Rig}){
    const view=useRef<HTMLDivElement>(null),side=useRef<HTMLDivElement>(null),draw=useRef<(r:Rig)=>void>(()=>{}),latest=useRef(rig);latest.current=rig;
    useEffect(()=>{
        const viewHost=view.current!,sideHost=side.current!;let left:T.WebGLRenderer,right:T.WebGLRenderer;
        try{left=makeRenderer(viewHost);right=makeRenderer(sideHost)}catch{viewHost.textContent='WebGL недоступен.';return}
        const scene=new T.Scene(),texture=makeTexture();addLights(scene);
        const cube=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({map:texture}));scene.add(cube);
        const axes=onHelperLayer(new T.AxesHelper(.8));scene.add(axes);
        let gizmo:T.Object3D|null=null;
        const sideCamera=new T.OrthographicCamera(-1,1,1,-1,.1,50);sideCamera.layers.enableAll();
        const render=(r:Rig)=>{
            const vw=viewHost.clientWidth,vh=viewHost.clientHeight,sw=sideHost.clientWidth,sh=sideHost.clientHeight;if(!vw||!vh||!sw||!sh)return;
            cube.position.set(r.x,r.y,0);cube.rotation.set(0,r.rotation*Math.PI/180,0);cube.scale.setScalar(r.scale);cube.updateMatrixWorld();
            const aspect=vw/vh,camera=r.ortho?new T.OrthographicCamera(-aspect,aspect,1,-1,r.near,r.far):new T.PerspectiveCamera(r.fov,aspect,r.near,r.far);
            camera.position.set(0,0,r.z);camera.lookAt(0,0,r.z-1);camera.updateMatrixWorld();camera.layers.set(0);
            if(gizmo){scene.remove(gizmo);disposeTree(gizmo)}gizmo=cameraGizmo(camera,r.far);scene.add(gizmo);
            const farHalf=r.ortho?1:r.far*Math.tan(r.fov*Math.PI/360),zMin=Math.min(r.z-r.far,-1.2)-.4,zMax=r.z+.6;
            let width=zMax-zMin,height=Math.max(width*sh/sw,2*Math.max(farHalf,1.2)+.6);width=height*sw/sh;
            sideCamera.left=-width/2;sideCamera.right=width/2;sideCamera.top=height/2;sideCamera.bottom=-height/2;sideCamera.updateProjectionMatrix();
            sideCamera.position.set(20,0,(zMin+zMax)/2);sideCamera.lookAt(0,0,(zMin+zMax)/2);sideCamera.updateMatrixWorld();
            scene.background=new T.Color('#10192e');left.setSize(vw,vh,false);left.render(scene,camera);
            scene.background=new T.Color('#0c1424');right.setSize(sw,sh,false);right.render(scene,sideCamera);
            const tri=triangleWorld(cube.matrixWorld);outline(viewHost,camera,tri);outline(sideHost,sideCamera,tri,false);
            sideHost.querySelectorAll('[data-scene-label]').forEach(n=>n.remove());
            label(sideHost,sideCamera,'Камера',new T.Vector3(0,.32,r.z+.1));label(sideHost,sideCamera,'Near',new T.Vector3(0,-(r.ortho?1:r.near*Math.tan(r.fov*Math.PI/360))-.18,r.z-r.near));label(sideHost,sideCamera,'Far',new T.Vector3(0,-farHalf-.18,r.z-r.far));
        };
        draw.current=render;render(latest.current);
        const resize=new ResizeObserver(()=>render(latest.current));resize.observe(viewHost);resize.observe(sideHost);
        return()=>{resize.disconnect();if(gizmo)disposeTree(gizmo);disposeTree(scene);texture.dispose();for(const r of[left,right]){r.dispose();r.forceContextLoss();r.domElement.remove()}draw.current=()=>{}};
    },[]);
    useEffect(()=>draw.current(rig),[rig]);
    return <div className="rig-pair"><div className="overview-panel"><h3>Изображение камеры</h3><div className="rig-host scene-host" ref={view} role="img" aria-label="Изображение с камеры"/></div><div className="overview-panel"><h3>Вид сбоку</h3><div className="rig-host scene-host" ref={side} role="img" aria-label="Вид сбоку на камеру и область видимости"/></div></div>;
}
export function CameraRigDemo(){
    const [r,R]=useState<Rig>(rigDefaults),set=(p:Partial<Rig>)=>R(o=>({...o,...p}));
    return <div className="lab-grid"><section className="stage-wrap"><div className="pipeline-visual rig-visual"><RigViews rig={r}/></div><div className="stage-caption">Жёлтая область — то, что видит камера. Всё вне её не попадёт в кадр.</div></section>
    <aside className="controls"><h2>Модель · Transform</h2><Range label="Позиция X" value={r.x} min={-1.5} max={1.5} onChange={x=>set({x})}/><Range label="Позиция Y" value={r.y} min={-1} max={1} onChange={y=>set({y})}/><Range label="Поворот Y" value={r.rotation} min={-90} max={90} step={1} unit="°" precision={0} onChange={rotation=>set({rotation})}/><Range label="Масштаб" value={r.scale} min={.5} max={1.5} onChange={scale=>set({scale})}/>
    <h2 className="controls-subtitle">Камера</h2><Range label="Позиция Z" value={r.z} min={1.5} max={6} onChange={z=>set({z})}/>{!r.ortho&&<Range label="FOV" value={r.fov} min={20} max={100} step={1} unit="°" precision={0} onChange={fov=>set({fov})}/>}<Range label="Near" value={r.near} min={.1} max={3} onChange={near=>set({near:Math.min(near,r.far-.2)})}/><Range label="Far" value={r.far} min={1} max={8} onChange={far=>set({far:Math.max(far,r.near+.2)})}/><Toggle label="Orthographic" value={r.ortho} onChange={ortho=>set({ortho})}/></aside></div>;
}

type Frame='object'|'world'|'view';
const frameInfo:Record<Frame,{name:string;origin:string;from:string}>={object:{name:'Object Space',origin:'O — центр куба',from:'Исходные данные вершин'},world:{name:'World Space',origin:'O — начало мира',from:'Object → World: матрица Model'},view:{name:'View Space',origin:'O — камера, взгляд вдоль −Z',from:'World → View: матрица View'}};

function SpacesView({s,frame}:{s:PipelineState;frame:Frame}){
    const host=useRef<HTMLDivElement>(null),draw=useRef<(s:PipelineState,f:Frame)=>void>(()=>{}),latest=useRef({s,frame});latest.current={s,frame};
    useEffect(()=>{
        const el=host.current!;let renderer:T.WebGLRenderer;try{renderer=makeRenderer(el)}catch{el.textContent='WebGL недоступен.';return}
        const scene=new T.Scene(),texture=makeTexture();scene.background=new T.Color('#10192e');addLights(scene);
        const world=new T.Group();world.matrixAutoUpdate=false;scene.add(world);
        const cube=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({map:texture}));cube.matrixAutoUpdate=false;world.add(cube);
        const grid=new T.GridHelper(8,16,'#3b4763','#26314a');grid.position.y=-.5;world.add(grid);
        const frameAxes=new T.AxesHelper(1.4);const axisMaterial=frameAxes.material as T.LineBasicMaterial;axisMaterial.depthTest=false;frameAxes.renderOrder=10;scene.add(frameAxes);
        const observer=new T.PerspectiveCamera(40,1,.1,60);observer.layers.enableAll();
        let gizmo:T.Object3D|null=null;
        const render=(st:PipelineState,f:Frame)=>{
            const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;
            const {model,camera}=matrices(st,1.6);
            const shown=camera instanceof T.PerspectiveCamera?new T.PerspectiveCamera(camera.fov,1.6,camera.near,camera.far):camera;shown.position.copy(camera.position);shown.quaternion.copy(camera.quaternion);shown.updateMatrixWorld();
            if(gizmo){world.remove(gizmo);disposeTree(gizmo)}gizmo=cameraGizmo(shown as T.PerspectiveCamera,st.distance,.03);world.add(gizmo);
            cube.matrix.copy(model);
            const toFrame=f==='object'?model.clone().invert():f==='view'?camera.matrixWorldInverse.clone():new T.Matrix4();
            world.matrix.copy(toFrame);world.updateMatrixWorld(true);
            const focus=f==='view'?new T.Vector3(0,0,-st.distance/2):new T.Vector3(0,0,f==='world'?st.distance/2-.3:0);
            observer.aspect=w/h;observer.updateProjectionMatrix();observer.position.copy(focus).add(new T.Vector3(3.1,2.3,3.9));observer.lookAt(focus);observer.updateMatrixWorld();
            renderer.setSize(w,h,false);renderer.render(scene,observer);
            el.querySelectorAll('[data-scene-label]').forEach(n=>n.remove());
            label(el,observer,'X',new T.Vector3(1.6,0,0),'axis-label x');label(el,observer,'Y',new T.Vector3(0,1.6,0),'axis-label y');label(el,observer,'Z',new T.Vector3(0,0,1.6),'axis-label z');label(el,observer,frameInfo[f].origin,new T.Vector3(-.2,-.75,.6));
            const tri=triangleWorld(model).map(p=>p.applyMatrix4(toFrame));outline(el,observer,tri);
        };
        draw.current=render;render(latest.current.s,latest.current.frame);
        const resize=new ResizeObserver(()=>render(latest.current.s,latest.current.frame));resize.observe(el);
        return()=>{resize.disconnect();disposeTree(scene);texture.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();draw.current=()=>{}};
    },[]);
    useEffect(()=>draw.current(s,frame),[s,frame]);
    return <div className="scene-host" ref={host} role="img" aria-label={'Сцена в системе координат '+frameInfo[frame].name}/>;
}
export function SpacesDemo(){
    const [s,S]=useState<PipelineState>({...initialPipeline,tx:.5}),[frame,Frame]=useState<Frame>('world'),set=(p:Partial<PipelineState>)=>S(o=>({...o,...p}));
    const spaces=vertexSpaces(s),column={object:'object',world:'world',view:'view'} as const;
    return <><div className="lab-grid"><section className="stage-wrap"><div className="pipeline-visual"><SpacesView s={s} frame={frame}/></div><div className="stage-caption">{frameInfo[frame].name}: {frameInfo[frame].origin}. Сцена та же, меняется точка отсчёта.</div></section>
    <aside className="controls"><h2>Параметры</h2><Choices label="Система координат" value={frame} options={[['object','Object'],['world','World'],['view','View']]} onChange={Frame}/><Readout label={'A в '+frameInfo[frame].name}>{vec(spaces[0][column[frame]].slice(0,3))}</Readout><Readout label="Откуда">{frameInfo[frame].from}</Readout><Range label="Перенос по X" value={s.tx} min={-1.5} max={1.5} onChange={tx=>set({tx})}/><Range label="Поворот вокруг Y" value={s.rotation} min={-90} max={90} step={1} unit="°" precision={0} onChange={rotation=>set({rotation})}/><Toggle label="Сначала перенос, затем поворот" value={s.rotateAfterTranslation} onChange={rotateAfterTranslation=>set({rotateAfterTranslation})}/><Range label="Камера · Z" value={s.distance} min={1.2} max={5} onChange={distance=>set({distance})}/></aside></div>
    <section className="stage-data"><h2>Координаты вершин</h2><table className="spaces-table"><thead><tr><th>Вершина</th><th className={frame==='object'?'current':undefined}>Object (w = 1)</th><th className={frame==='world'?'current':undefined}>World</th><th className={frame==='view'?'current':undefined}>View</th><th>Clip</th></tr></thead><tbody>{spaces.map(v=><tr key={v.name}><th>{v.name}</th><td className={frame==='object'?'current':undefined}>{vec(v.object)}</td><td className={frame==='world'?'current':undefined}>{vec(v.world)}</td><td className={frame==='view'?'current':undefined}>{vec(v.view)}</td><td>{vec(v.clip)}</td></tr>)}</tbody></table></section></>;
}

// Clip-space polygon back to world space through the inverse of Projection · View.
function clipToWorld(camera:T.Camera,clip:number[]){const v=new T.Vector4(...clip).applyMatrix4(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).invert());return new T.Vector3(v.x/v.w,v.y/v.w,v.z/v.w)}
function polygonOverlay(host:HTMLElement,parts:{points:number[][];className:string;names?:string[]}[]){
    host.querySelectorAll('.clip-overlay').forEach(n=>n.remove());
    const w=host.clientWidth,h=host.clientHeight,svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('clip-overlay');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    svg.innerHTML=parts.filter(p=>p.points.length>1).map(({points,className,names})=>{const cx=points.reduce((t,p)=>t+p[0],0)/points.length,cy=points.reduce((t,p)=>t+p[1],0)/points.length;return`<g class="${className}"><polygon points="${points.map(p=>p.join(',')).join(' ')}"/>`+(names?points.map(([x,y],i)=>{const d=Math.hypot(x-cx,y-cy)||1,fresh=names[i]==='Пересечение';return`<circle class="${fresh?'fresh':''}" cx="${x}" cy="${y}" r="${fresh?5:4}"/><text class="${fresh?'fresh':''}" x="${x+(x-cx)/d*16}" y="${y+(y-cy)/d*16}">${fresh?'+':names[i]}</text>`}).join(''):'')+'</g>'}).join('');
    host.appendChild(svg);
}
function triangleMesh(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(triangle.positions.flat(),3));g.setAttribute('color',new T.Float32BufferAttribute(triangle.colors.flat(),3));return new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}))}

function ClipViews({s}:{s:PipelineState}){
    const view=useRef<HTMLDivElement>(null),top=useRef<HTMLDivElement>(null),draw=useRef<(s:PipelineState)=>void>(()=>{}),latest=useRef(s);latest.current=s;
    useEffect(()=>{
        const viewHost=view.current!,topHost=top.current!;let left:T.WebGLRenderer,right:T.WebGLRenderer;
        try{left=makeRenderer(viewHost);right=makeRenderer(topHost)}catch{viewHost.textContent='WebGL недоступен.';return}
        const scene=new T.Scene(),mesh=triangleMesh();mesh.matrixAutoUpdate=false;scene.add(mesh);
        const topCamera=new T.OrthographicCamera(-1,1,1,-1,.1,50);topCamera.layers.enableAll();topCamera.up.set(0,0,-1);let gizmo:T.Object3D|null=null;
        const render=(st:PipelineState)=>{
            const vw=viewHost.clientWidth,vh=viewHost.clientHeight,tw=topHost.clientWidth,th=topHost.clientHeight;if(!vw||!vh||!tw||!th)return;
            const side=Math.min(vw,vh)*.82,ox=(vw-side)/2,oy=(vh-side)/2;
            const {model,camera}=matrices(st,1);mesh.matrix.copy(model);mesh.updateMatrixWorld(true);
            if(gizmo){scene.remove(gizmo);disposeTree(gizmo)}const reach=Math.min(12,st.distance+1.5);gizmo=cameraGizmo(camera as T.PerspectiveCamera,reach,.06);scene.add(gizmo);
            const half=reach*Math.tan(st.fov*Math.PI/360),zMin=st.distance-reach-.4,zMax=st.distance+.7;
            let height=zMax-zMin,width=Math.max(height*tw/th,2*Math.max(half,Math.abs(st.tx)+1)+.6);height=width*th/tw;
            topCamera.left=-width/2;topCamera.right=width/2;topCamera.top=height/2;topCamera.bottom=-height/2;topCamera.updateProjectionMatrix();topCamera.position.set(0,20,(zMin+zMax)/2);topCamera.lookAt(0,0,(zMin+zMax)/2);topCamera.updateMatrixWorld();
            scene.background=new T.Color('#10192e');left.setSize(side,side,true);left.domElement.style.left=ox+'px';left.domElement.style.top=oy+'px';left.render(scene,camera);
            scene.background=new T.Color('#0c1424');right.setSize(tw,th,false);right.render(scene,topCamera);
            const source=vertexOutputs(st),poly=clipPolygon(source),toView=(clip:number[])=>[ox+(clip[0]/clip[3]*.5+.5)*side,oy+(.5-clip[1]/clip[3]*.5)*side];
            const frame=[[ox,oy],[ox+side,oy],[ox+side,oy+side],[ox,oy+side]];
            polygonOverlay(viewHost,[{points:frame,className:'clip-frame'},...(source.every(v=>v.clip[3]>0)?[{points:source.map(v=>toView(v.clip)),className:'clip-original'}]:[]),{points:poly.map(v=>toView(v.clip)),className:'clip-kept',names:poly.map(v=>v.name)}]);
            const toTop=(p:T.Vector3)=>{const q=p.clone().project(topCamera);return[(q.x*.5+.5)*tw,(.5-q.y*.5)*th]};
            polygonOverlay(topHost,[{points:triangleWorld(model).map(toTop),className:'clip-original'},{points:poly.map(v=>toTop(clipToWorld(camera,v.clip))),className:'clip-kept'}]);
            topHost.querySelectorAll('[data-scene-label]').forEach(n=>n.remove());
            label(topHost,topCamera,'Камера',new T.Vector3(0,0,st.distance+.4));label(topHost,topCamera,'Near',new T.Vector3(st.near*Math.tan(st.fov*Math.PI/360)+.35,0,st.distance-st.near));
        };
        draw.current=render;render(latest.current);
        const resize=new ResizeObserver(()=>render(latest.current));resize.observe(viewHost);resize.observe(topHost);
        return()=>{resize.disconnect();if(gizmo)disposeTree(gizmo);disposeTree(scene);for(const r of[left,right]){r.dispose();r.forceContextLoss();r.domElement.remove()}draw.current=()=>{}};
    },[]);
    useEffect(()=>draw.current(s),[s]);
    return <div className="rig-pair"><div className="overview-panel"><h3>Изображение камеры</h3><div className="rig-host clip-view scene-host" ref={view} role="img" aria-label="Отсечённый треугольник в кадре"/></div><div className="overview-panel"><h3>Вид сверху</h3><div className="rig-host scene-host" ref={top} role="img" aria-label="Треугольник и область видимости сверху"/></div></div>;
}
export function ClippingDemo(){
    const [s,S]=useState<PipelineState>(initialPipeline),set=(p:Partial<PipelineState>)=>S(o=>({...o,...p})),poly=clipPolygon(vertexOutputs(s));
    return <><div className="lab-grid"><section className="stage-wrap"><div className="pipeline-visual rig-visual"><ClipViews s={s}/></div><div className="stage-caption">Пунктир — исходный треугольник, сплошной контур — сохранённая часть, «+» — новые вершины.</div></section>
    <aside className="controls"><h2>Параметры</h2><Range label="Перенос по X" value={s.tx} min={-2} max={2} onChange={tx=>set({tx})}/><Range label="Поворот вокруг Y" value={s.rotation} min={-65} max={65} step={1} unit="°" precision={0} onChange={rotation=>set({rotation})}/><Range label="Near plane" value={s.near} min={.1} max={3} onChange={near=>set({near})}/><Range label="Камера · Z" value={s.distance} min={1.2} max={5} onChange={distance=>set({distance})}/><Readout label="После clipping">Вершины: {poly.length} · Треугольники: {Math.max(0,poly.length-2)}</Readout></aside></div>
    <section className="stage-data"><h2>Вершины после отсечения</h2><table className="spaces-table"><thead><tr><th>Вершина</th><th>Clip (x; y; z; w)</th><th>UV</th><th>Color</th></tr></thead><tbody>{poly.map((v,i)=><tr key={i} className={v.name==='Пересечение'?'fresh-row':undefined}><th>{v.name==='Пересечение'?'Новая':v.name}</th><td>{vec(v.clip)}</td><td>{vec(v.uv)}</td><td>{vec(v.color)}</td></tr>)}{poly.length===0&&<tr><td colSpan={4}>Треугольник целиком вне области видимости</td></tr>}</tbody></table></section></>;
}
