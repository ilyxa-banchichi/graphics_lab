import {useEffect,useRef} from 'react';
import * as T from 'three';
import shader from './generated/multipass.json';
import {passPlan,targetBytes,type FrameSpec,type FrameReport,type PassRecord} from './frameModel';
const strip=(s:string)=>s.replace(/^#version[^\n]*\n/,'');
type Item={mesh:T.Mesh;forward:T.RawShaderMaterial;gbuffer:T.RawShaderMaterial;color:number[];emission:number;alpha:number;batch:boolean};
export function FrameCanvas({spec,onReport}:{spec:FrameSpec;onReport:(r:FrameReport)=>void}){
 const host=useRef<HTMLDivElement>(null),draw=useRef<(s:FrameSpec)=>void>(()=>{}),latest=useRef(spec),callback=useRef(onReport);latest.current=spec;callback.current=onReport;const serialized=JSON.stringify(spec);
 useEffect(()=>{
 const el=host.current!;let r:T.WebGLRenderer;
 try{r=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});}catch{el.textContent='Для демонстрации нужен WebGL 2.';return}
 r.outputColorSpace=T.LinearSRGBColorSpace;r.setPixelRatio(1);r.autoClear=false;r.info.autoReset=false;el.appendChild(r.domElement);r.domElement.setAttribute('aria-label','Кадр из нескольких проходов на GPU');
 const hdr=r.extensions.has('EXT_color_buffer_float'),type=hdr?T.HalfFloatType:T.UnsignedByteType;
 const sceneTarget=new T.WebGLRenderTarget(1,1,{type,depthBuffer:true});sceneTarget.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
 const gtarget=new T.WebGLRenderTarget(1,1,{count:2,type:T.UnsignedByteType,depthBuffer:true});gtarget.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
 const shadowTarget=new T.WebGLRenderTarget(512,512,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true});
 const bright=new T.WebGLRenderTarget(1,1,{type,depthBuffer:false}),blurA=bright.clone(),blurB=bright.clone(),uiTarget=new T.WebGLRenderTarget(1,1,{type,depthBuffer:false});
 const black=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);black.needsUpdate=true;
 const scene=new T.Scene(),screenScene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,30),lightCamera=new T.OrthographicCamera(-4,4,4,-4,.1,18);
 camera.position.set(5,3.6,6);camera.lookAt(0,.25,0);camera.updateMatrixWorld();
 const screenMat=new T.RawShaderMaterial({glslVersion:T.GLSL3,vertexShader:strip(shader.screenVertex),fragmentShader:strip(shader.screenFragment),depthTest:false,depthWrite:false,uniforms:{type_ScreenFrame:{value:new Float32Array(48)},SPIRV_Cross_CombinedsourcesourceSampler:{value:black},SPIRV_Cross_CombinedextraextraSampler:{value:black},SPIRV_Cross_CombinednormalMapnormalSampler:{value:black},SPIRV_Cross_CombineddepthMapdepthSampler:{value:black},SPIRV_Cross_CombinedshadowMapshadowSampler:{value:black}}});
 const skyMat=new T.RawShaderMaterial({glslVersion:T.GLSL3,vertexShader:strip(shader.skyVertex),fragmentShader:strip(shader.skyFragment),depthTest:true,depthWrite:false,depthFunc:T.LessEqualDepth,uniforms:{type_ScreenFrame:{value:new Float32Array(48)}}});
 const skyScene=new T.Scene(),skyQuad=new T.Mesh(new T.PlaneGeometry(2,2),skyMat);skyQuad.frustumCulled=false;skyScene.add(skyQuad);
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),screenMat);screenScene.add(quad);const screenCamera=new T.Camera();
 function material(gbuffer=false){return new T.RawShaderMaterial({glslVersion:T.GLSL3,vertexShader:strip(shader.objectVertex),fragmentShader:strip(gbuffer?shader.gbufferFragment:shader.objectFragment),uniforms:{type_ObjectFrame:{value:new Float32Array(64)},SPIRV_Cross_CombinedshadowMapshadowSampler:{value:black}},side:T.DoubleSide})}
 function identityAttributes(g:T.BufferGeometry){for(let j=0;j<4;j++){const a=new Float32Array(g.getAttribute('position').count*4);for(let i=0;i<a.length;i+=4)a[i+j]=1;g.setAttribute('instance'+j,new T.BufferAttribute(a,4))}return g}
 const items:Item[]=[],owned:T.BufferGeometry[]=[];
 function item(g:T.BufferGeometry,pos:number[],color:number[],alpha=1,emission=0,batch=false){identityAttributes(g);owned.push(g);const forward=material(),gbuffer=material(true),mesh=new T.Mesh(g,forward);mesh.position.set(...pos as [number,number,number]);mesh.frustumCulled=false;mesh.updateMatrixWorld();scene.add(mesh);const obj={mesh,forward,gbuffer,color,emission,alpha,batch};items.push(obj);return obj}
 item(new T.BoxGeometry(7,.12,5),[0,-.1,0],[.17,.23,.34],-1);
 const cube=item(new T.BoxGeometry(1.2,1.2,1.2),[-.85,.6,0],[.95,.27,.12]);
 item(new T.SphereGeometry(.65,32,20),[.85,.62,.1],[.18,.72,.62]);
 item(new T.SphereGeometry(.18,20,12),[.1,1.7,-.5],[1,.6,.12],1,6);
 const panels=[item(new T.PlaneGeometry(1.4,1.5),[-.3,.8,1.25],[.18,.42,1],.4),item(new T.PlaneGeometry(1.4,1.5),[.3,.8,.9],[1,.25,.48],.4)];
 let copies:Item[]=[];let lastCopies=-1,lastInstance=false;
 function makeCopies(s:FrameSpec){if(lastCopies===s.copies&&lastInstance===s.instanced)return;lastCopies=s.copies;lastInstance=s.instanced;for(const o of copies){scene.remove(o.mesh);o.forward.dispose();o.gbuffer.dispose();o.mesh.geometry.dispose();items.splice(items.indexOf(o),1)}copies=[];
 const positions=Array.from({length:s.copies},(_,i)=>[(i%6-2.5)*.42,.18,-1.1-Math.floor(i/6)*.42]);
 if(s.instanced){const base=new T.BoxGeometry(.28,.32,.28),g=new T.InstancedBufferGeometry();g.index=base.index;g.attributes={...base.attributes};g.instanceCount=s.copies;
 for(let j=0;j<4;j++){const a=new Float32Array(s.copies*4);for(let i=0;i<s.copies;i++){a[i*4+j]=1;if(j===3)a.set([...positions[i],1],i*4)}g.setAttribute('instance'+j,new T.InstancedBufferAttribute(a,4))}
 // Instanced transforms are supplied as four explicit columns to HLSL.
 const forward=material(),gbuffer=material(true),mesh=new T.Mesh(g,forward);mesh.frustumCulled=false;scene.add(mesh);const o={mesh,forward,gbuffer,color:[.55,.43,.92],emission:0,alpha:1,batch:true};copies.push(o);items.push(o);
 }else for(const p of positions)copies.push(item(new T.BoxGeometry(.28,.32,.28),p,[.55,.43,.92]));
 }
 let current:FrameSpec;const lightVP=new T.Matrix4(),viewProjection=new T.Matrix4();
 function fill(o:Item,mat:T.RawShaderMaterial,cam:T.Camera,mode:number){const d=mat.uniforms.type_ObjectFrame.value as Float32Array;d.set(new T.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse).elements,0);d.set(o.mesh.matrixWorld.elements,16);d.set(lightVP.elements,32);d.set([...o.color,o.alpha],48);d.set([current.angle*Math.PI/180,current.lights,current.shadows?1:0,current.bias],52);d.set([mode,o.emission,0,o.batch?1:0],56);d.set([1/current.shadowSize,1/current.shadowSize,current.shadowRadius,current.softShadows?1:0],60);mat.uniforms.SPIRV_Cross_CombinedshadowMapshadowSampler.value=mode===3?black:shadowTarget.texture;mat.uniformsNeedUpdate=true}
 for(const o of items)o.mesh.onBeforeRender=(_r,_s,cam)=>fill(o,o.mesh.material as T.RawShaderMaterial,cam,0);
 function setItems(list:Item[],mode:number,gbuffer=false,cam:T.Camera=camera){const chosen=new Set(list);for(const o of items){o.mesh.visible=chosen.has(o);if(!o.mesh.visible)continue;o.mesh.material=gbuffer?o.gbuffer:o.forward;const mat=o.mesh.material as T.RawShaderMaterial;mat.depthTest=true;mat.depthWrite=o.alpha>=1||o.alpha<0;mat.transparent=o.alpha>0&&o.alpha<1;mat.blending=mat.transparent?T.NormalBlending:T.NoBlending;o.mesh.onBeforeRender=()=>fill(o,mat,cam,mode)} }
 function screen(source:T.Texture,dest:T.WebGLRenderTarget|null,mode:number,extra:T.Texture=black,horizontal=false){const d=screenMat.uniforms.type_ScreenFrame.value as Float32Array;d.set(viewProjection.clone().invert().elements,0);d.set(lightVP.elements,16);d.set([mode,current.threshold,current.bloom?current.strength:0,current.exposure],32);d.set([1/Math.max(1,bright.width),1/Math.max(1,bright.height),horizontal?1:0,0],36);d.set([current.angle*Math.PI/180,current.lights,current.shadows?1:0,current.bias],40);d.set([1/current.shadowSize,1/current.shadowSize,current.shadowRadius,current.softShadows?1:0],44);screenMat.uniforms.SPIRV_Cross_CombinedsourcesourceSampler.value=source;screenMat.uniforms.SPIRV_Cross_CombinedextraextraSampler.value=extra;screenMat.uniforms.SPIRV_Cross_CombinednormalMapnormalSampler.value=gtarget.textures[1];screenMat.uniforms.SPIRV_Cross_CombineddepthMapdepthSampler.value=gtarget.depthTexture;screenMat.uniforms.SPIRV_Cross_CombinedshadowMapshadowSampler.value=shadowTarget.texture;screenMat.uniformsNeedUpdate=true;r.setRenderTarget(dest);r.render(screenScene,screenCamera)}
 function render(s:FrameSpec){current=s;makeCopies(s);for(const panel of panels){panel.mesh.scale.y=s.panelHeight/1.5;panel.mesh.position.y=.05+s.panelHeight/2;}const width=Math.max(160,Math.round(Math.min(1000,el.clientWidth)*s.scale)),height=Math.round(width*.62);r.setSize(Math.max(160,el.clientWidth),Math.round(Math.max(160,el.clientWidth)*.62),true);
 camera.aspect=width/height;camera.updateProjectionMatrix();viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 const a=s.angle*Math.PI/180;lightCamera.position.set(Math.sin(a)*5,7,Math.cos(a)*5);lightCamera.lookAt(0,0,0);lightCamera.updateMatrixWorld();lightVP.multiplyMatrices(lightCamera.projectionMatrix,lightCamera.matrixWorldInverse);
 for(const t of [sceneTarget,gtarget,uiTarget])if(t.width!==width||t.height!==height)t.setSize(width,height);
 for(const t of [bright,blurA,blurB])if(t.width!==Math.floor(width/2)||t.height!==Math.floor(height/2))t.setSize(Math.max(1,Math.floor(width/2)),Math.max(1,Math.floor(height/2)));
 if(shadowTarget.width!==s.shadowSize)shadowTarget.setSize(s.shadowSize,s.shadowSize);
 r.info.reset();const passes:PassRecord[]=[],opaque=items.filter(o=>o.alpha<0||o.alpha>=1);let output:T.Texture=sceneTarget.texture,previewMode=0;
 const clear=(t:T.WebGLRenderTarget,color:number)=>{r.setRenderTarget(t);r.setClearColor(color,1);r.clear(true,true,false)};
 clear(sceneTarget,0x05070d);clear(shadowTarget,0xffffff);clear(gtarget,0x000000);
 const plan=passPlan(s);
 for(const p of plan){const before=r.info.render.calls,tris=r.info.render.triangles;
 switch(p.id){
 case 'shadow':setItems(opaque,3,false,lightCamera);r.setRenderTarget(shadowTarget);r.render(scene,lightCamera);output=shadowTarget.texture;previewMode=7;break;
 case 'gbuffer':setItems(opaque,0,true);r.setRenderTarget(gtarget);r.render(scene,camera);output=gtarget.textures[0];previewMode=0;break;
 case 'opaque':if(s.path==='deferred'){screen(gtarget.textures[0],sceneTarget,4); const gl=r.getContext() as WebGL2RenderingContext;const props=r.properties as unknown as {get:(x:unknown)=>{__webglFramebuffer:WebGLFramebuffer}};
 gl.bindFramebuffer(gl.READ_FRAMEBUFFER,props.get(gtarget).__webglFramebuffer);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,props.get(sceneTarget).__webglFramebuffer);gl.blitFramebuffer(0,0,width,height,0,0,width,height,gl.DEPTH_BUFFER_BIT,gl.NEAREST);r.resetState();}else{setItems(opaque,0);r.setRenderTarget(sceneTarget);r.render(scene,camera)}output=sceneTarget.texture;previewMode=0;break;
 case 'sky':{const d=skyMat.uniforms.type_ScreenFrame.value as Float32Array;d.set(viewProjection.clone().invert().elements,0);skyMat.uniformsNeedUpdate=true;r.setRenderTarget(sceneTarget);r.render(skyScene,screenCamera);output=sceneTarget.texture;previewMode=0;break;}
 case 'transparent': setItems(panels,0);[...panels].sort((a,b)=>s.reverse?a.mesh.position.distanceToSquared(camera.position)-b.mesh.position.distanceToSquared(camera.position):b.mesh.position.distanceToSquared(camera.position)-a.mesh.position.distanceToSquared(camera.position)).forEach((o,i)=>o.mesh.renderOrder=i);r.setRenderTarget(sceneTarget);r.render(scene,camera);output=sceneTarget.texture;break;
 case 'ui-before':screen(sceneTarget.texture,uiTarget,9);output=uiTarget.texture;break;
 case 'extract':screen(s.ui&&s.uiBefore?uiTarget.texture:sceneTarget.texture,bright,1);output=bright.texture;break;
 case 'blur-x':screen(bright.texture,blurA,2,black,true);output=blurA.texture;break;
 case 'blur-y':screen(blurA.texture,blurB,2);output=blurB.texture;break;
 case 'composite':screen(s.ui&&s.uiBefore?uiTarget.texture:sceneTarget.texture,null,3,s.bloom?blurB.texture:black);output=sceneTarget.texture;break;
 case 'ui':screen(black,null,5);break;
 }
 passes.push({...p,draws:r.info.render.calls-before,triangles:r.info.render.triangles-tris});if(s.stop===p.id)break;
 }
 if(s.stop!=='all'&&s.stop!=='composite'&&s.stop!=='ui')screen(output,null,previewMode);
 if(s.preview!=='result'){
 const views:Record<string,[T.Texture,number]>={'shadow':[shadowTarget.texture,7],'depth':[(s.path==='deferred'?gtarget.depthTexture:sceneTarget.depthTexture)!,8],'albedo':[gtarget.textures[0],0],'normal':[gtarget.textures[1],6],'emission':[gtarget.textures[0],10],'bright':[bright.texture,0],'blur':[blurB.texture,0],'color':[sceneTarget.texture,0]};
 const v=views[s.preview];if(v)screen(v[0],null,v[1]);
 }
 const calls=passes.reduce((v,p)=>v+p.draws,0),triangles=passes.reduce((v,p)=>v+p.triangles,0);r.domElement.dataset.calls=String(calls);r.domElement.dataset.passCount=String(passes.length);r.domElement.dataset.path=s.path;r.domElement.dataset.sky=String(s.sky);r.domElement.dataset.width=String(width);r.domElement.dataset.height=String(height);
 const colorFormat=hdr?'RGBA16F':'RGBA8';
 const resourceInfo=(name:string,t:T.WebGLRenderTarget,format:string)=>({name,width:t.width,height:t.height,format});
 const resources={
  color:resourceInfo('Цвет сцены (Scene Color)',sceneTarget,colorFormat),
  depth:resourceInfo('Глубина камеры (Camera Depth)',s.path==='deferred'?gtarget:sceneTarget,'DEPTH_COMPONENT24'),
  shadow:resourceInfo('Карта теней (Shadow Depth)',shadowTarget,'RGBA8 · кодированная глубина'),
  albedo:resourceInfo('Базовый цвет (Albedo)',gtarget,'RGBA8'),
  emission:resourceInfo('Самосвечение · альфа-канал',gtarget,'RGBA8 · канал A'),
  normal:resourceInfo('Нормали (Normal)',gtarget,'RGBA8'),
  bright:resourceInfo('Яркие области (Bright)',bright,colorFormat),
  blur:resourceInfo('Размытие (Blur B)',blurB,colorFormat),
  blurA:resourceInfo('Размытие (Blur A)',blurA,colorFormat),
  uiBefore:resourceInfo('Сцена с интерфейсом',uiTarget,colorFormat),
  display:{name:'Итоговый кадр',width:r.domElement.width,height:r.domElement.height,format:'RGBA8'}
 };
 const stoppedResource:Record<string,keyof typeof resources>={shadow:'shadow',gbuffer:'albedo',opaque:'color',sky:'color',transparent:'color','ui-before':'uiBefore',extract:'bright','blur-x':'blurA','blur-y':'blur',composite:'display',ui:'display'};
 const target=s.preview!=='result'?resources[s.preview as keyof typeof resources]:resources[stoppedResource[passes.at(-1)?.id??'']??'display'];
 callback.current({passes,width,height,hdr,calls,triangles,memory:targetBytes(width,height,hdr,s.path==='deferred',s.bloom,s.shadows?s.shadowSize:0),selected:s.preview,target});
 }
 draw.current=render;render(latest.current);const resize=new ResizeObserver(()=>render(latest.current));resize.observe(el);
 return()=>{resize.disconnect();draw.current=()=>{};for(const o of items){o.mesh.geometry.dispose();o.forward.dispose();o.gbuffer.dispose()}for(const t of [sceneTarget,gtarget,shadowTarget,bright,blurA,blurB,uiTarget])t.dispose();quad.geometry.dispose();screenMat.dispose();skyQuad.geometry.dispose();skyMat.dispose();black.dispose();r.dispose();r.forceContextLoss();el.replaceChildren()};
 },[]);
 useEffect(()=>{draw.current(spec)},[serialized]);
 return <div className="frame-canvas" ref={host}/>;
}
