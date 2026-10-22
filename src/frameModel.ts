export type FrameSpec={path:'forward'|'deferred';shadows:boolean;transparent:boolean;bloom:boolean;ui:boolean;uiBefore:boolean;reverse:boolean;instanced:boolean;copies:number;lights:number;scale:number;shadowSize:number;bias:number;angle:number;threshold:number;strength:number;exposure:number;preview:string;stop:string};
export const initialFrame:FrameSpec={path:'forward',shadows:true,transparent:true,bloom:true,ui:true,uiBefore:false,reverse:false,instanced:false,copies:6,lights:1,scale:1,shadowSize:512,bias:.004,angle:35,threshold:1,strength:.7,exposure:1,preview:'result',stop:'all'};
export type PassRecord={id:string;name:string;reads:string[];writes:string[];draws:number;triangles:number};
export type FrameReport={passes:PassRecord[];width:number;height:number;hdr:boolean;calls:number;triangles:number;memory:number;selected:string};
export function passPlan(s:FrameSpec){const p:{id:string;name:string;reads:string[];writes:string[]}[]=[];
 if(s.shadows)p.push({id:'shadow',name:'Shadow Map',reads:['Геометрия','Свет'],writes:['Shadow Depth']});
 const reads=s.shadows?['Геометрия','Материалы','Shadow Depth']:['Геометрия','Материалы'];
 if(s.path==='deferred'){p.push({id:'gbuffer',name:'G-buffer',reads:['Геометрия','Материалы'],writes:['Albedo','Normal','Camera Depth']});p.push({id:'opaque',name:'Deferred Lighting',reads:['Albedo','Normal','Camera Depth',...(s.shadows?['Shadow Depth']:[])],writes:['Scene Color']})}
 else p.push({id:'opaque',name:'Forward Opaques',reads,writes:['Scene Color','Camera Depth']});
 if(s.transparent)p.push({id:'transparent',name:'Transparent',reads:['Camera Depth','Scene Color'],writes:['Scene Color']});
 if(s.ui&&s.uiBefore)p.push({id:'ui-before',name:'UI до постобработки',reads:['Scene Color'],writes:['Scene + UI']});
 if(s.bloom){p.push({id:'extract',name:'Bright Extract',reads:[s.ui&&s.uiBefore?'Scene + UI':'Scene Color'],writes:['Bright']});p.push({id:'blur-x',name:'Blur X',reads:['Bright'],writes:['Blur A']});p.push({id:'blur-y',name:'Blur Y',reads:['Blur A'],writes:['Blur B']})}
 p.push({id:'composite',name:'Composite / Tone Mapping',reads:[s.ui&&s.uiBefore?'Scene + UI':'Scene Color',...(s.bloom?['Blur B']:[])],writes:['Display Color']});
 if(s.ui&&!s.uiBefore)p.push({id:'ui',name:'UI',reads:['Display Color'],writes:['Display Color']});return p;
}
export function targetBytes(width:number,height:number,hdr:boolean,deferred:boolean,bloom:boolean,shadowSize:number){const color=hdr?8:4;return width*height*(color+4+(deferred?12:0))+(bloom?Math.max(1,Math.floor(width/2))*Math.max(1,Math.floor(height/2))*color*3:0)+shadowSize*shadowSize*8;}
