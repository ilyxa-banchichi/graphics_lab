import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=s=>createHash('sha256').update(s).digest('hex');
const files=['shaders/Multipass.hlsl','shaders/ScreenPass.hlsl','scripts/compile-multipass.mjs'];
const sourceHash=hash(files.map(f=>f+readFileSync(f,'utf8')).join(''));
const target='src/generated/multipass.json';
if(process.argv.includes('--verify')){const d=JSON.parse(readFileSync(target));if(d.sourceHash!==sourceHash)throw Error('Multipass HLSL needs recompilation');for(const [k,h]of Object.entries(d.hashes))if(hash(d[k])!==h)throw Error('Generated shader mismatch: '+k);console.log('Multipass HLSL verified');process.exit(0)}
mkdirSync('.work/multipass',{recursive:true});const out={};
for(const [key,file,entry,vertex]of [['objectVertex','Multipass','VertexMain',true],['objectFragment','Multipass','FragmentMain',false],['gbufferFragment','Multipass','GBufferMain',false],['screenVertex','ScreenPass','VertexMain',true],['screenFragment','ScreenPass','FragmentMain',false]]) {
 const spv='.work/multipass/'+key+'.spv';execFileSync(process.env.GRAPHICS_DXC||'dxc',['-spirv','-T',vertex?'vs_6_0':'ps_6_0','-E',entry,'-fvk-use-gl-layout','-Fo',spv,'shaders/'+file+'.hlsl']);
 const args=[spv,'--version','300','--es','--flatten-ubo'];const rename=(io,loc,name)=>args.push('--rename-interface-variable',io,String(loc),name);
 if(vertex){rename('in',0,'position');rename('in',1,'uv');if(file==='Multipass'){rename('in',2,'normal');for(let j=0;j<4;j++)rename('in',j+3,'instance'+j)}rename('out',0,'vUV');if(file==='Multipass'){rename('out',1,'vNormal');rename('out',2,'vWorld')}}else{rename('in',0,'vUV');if(file==='Multipass'){rename('in',1,'vNormal');rename('in',2,'vWorld')}}
 out[key]=execFileSync(process.env.GRAPHICS_SPIRV_CROSS||'spirv-cross',args,{encoding:'utf8'});
}
writeFileSync(target,JSON.stringify({sourceHash,...out,hashes:Object.fromEntries(Object.entries(out).map(([k,v])=>[k,hash(v)]))},null,2)+'\n');console.log('Five multipass HLSL programs compiled');
