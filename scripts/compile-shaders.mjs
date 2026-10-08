import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=x=>createHash('sha256').update(x).digest('hex');
const files=['shaders/LectureEffects.hlsl','shaders/Scene.hlsl','shaders/Pipeline.hlsl','scripts/compile-shaders.mjs'];
const sourceHash=digest(files.map(f=>f+readFileSync(path.join(root,f))).join(''));
const target=path.join(root,'src/generated/shaders.json');
if(process.argv.includes('--verify')){const data=JSON.parse(readFileSync(target,'utf8'));if(data.sourceHash!==sourceHash)throw Error('Recompile changed HLSL: npm run shaders');for(const key of ['sceneVertex','sceneFragment','pipelineVertex','pipelineFragment'])if(digest(data[key])!==data.outputHashes[key])throw Error('Generated shader changed');console.log('All four generated shaders match HLSL.');process.exit(0)}
mkdirSync(path.join(root,'.work/shaders'),{recursive:true});
const dxc=process.env.LECTURE_DXC||'dxc',cross=process.env.LECTURE_SPIRV_CROSS||'spirv-cross';
const compiled={};
for(const scene of [true,'pipeline'])for(const vertex of [true,false]){const key=(scene==='pipeline'?'pipeline':'scene')+(vertex?'Vertex':'Fragment');const spv=path.join(root,'.work/shaders',key+'.spv');execFileSync(dxc,['-spirv','-T',vertex?'vs_6_0':'ps_6_0','-E',vertex?'VertexMain':'FragmentMain','-fvk-use-gl-layout','-Fo',spv,path.join(root,scene==='pipeline'?'shaders/Pipeline.hlsl':'shaders/Scene.hlsl')]);const args=[spv,'--version','300','--es','--flatten-ubo'];const rename=(side,loc,name)=>args.push('--rename-interface-variable',side,String(loc),name);if(vertex){rename('in',0,'position');rename('in',1,'uv');if(scene)rename('in',2,'normal');if(scene==='pipeline')rename('in',3,'color');rename('out',0,'vUV');if(scene){rename('out',1,'vNormal');rename('out',2,'vWorld');if(scene==='pipeline')rename('out',3,'vColor')}}else{rename('in',0,'vUV');if(scene){rename('in',1,'vNormal');rename('in',2,'vWorld');if(scene==='pipeline')rename('in',3,'vColor')}}compiled[key]=execFileSync(cross,args,{encoding:'utf8'});}
writeFileSync(target,JSON.stringify({sourceHash,compiler:execFileSync(dxc,['--version'],{encoding:'utf8'}).trim(),target:'GLSL ES 3.00 / WebGL 2',...compiled,outputHashes:Object.fromEntries(Object.entries(compiled).map(([k,v])=>[k,digest(v)]))},null,2)+'\n');console.log('Compiled four HLSL entry points.');
