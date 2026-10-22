// Matrices use the browser's OpenGL coordinate convention. Linear working color.
cbuffer ObjectFrame : register(b0) {
 float4x4 clipFromWorld;
 float4x4 worldFromObject;
 float4x4 lightFromWorld;
 float4 baseColor;
 float4 lightSettings; // angle, number of lights, shadows enabled, shadow bias
 float4 objectSettings; // output mode, emissive strength, reserved, instanced
};
Texture2D shadowMap : register(t0);
SamplerState shadowSampler : register(s0);
struct Input {
 [[vk::location(0)]] float3 position : POSITION;
 [[vk::location(1)]] float2 uv : TEXCOORD0;
 [[vk::location(2)]] float3 normal : NORMAL;
 [[vk::location(3)]] float4 instance0 : TEXCOORD3;
 [[vk::location(4)]] float4 instance1 : TEXCOORD4;
 [[vk::location(5)]] float4 instance2 : TEXCOORD5;
 [[vk::location(6)]] float4 instance3 : TEXCOORD6;
};
struct Output {
 float4 position : SV_POSITION;
 [[vk::location(0)]] float2 uv : TEXCOORD0;
 [[vk::location(1)]] float3 normalWS : TEXCOORD1;
 [[vk::location(2)]] float3 world : TEXCOORD2;
};
Output VertexMain(Input input) {
 Output o;
 float4 p=float4(input.position,1);
 if(objectSettings.w>0.5) p=input.instance0*p.x+input.instance1*p.y+input.instance2*p.z+input.instance3;
 float4 w=mul(worldFromObject,p);
 o.position=mul(clipFromWorld,w);o.world=w.xyz;
 o.normalWS=normalize(mul((float3x3)worldFromObject,input.normal));o.uv=input.uv;return o;
}
float3 Surface(Output i) {
 float3 c=baseColor.rgb;
 if(baseColor.a<0) c*=0.72+0.28*fmod(floor(i.world.x*2)+floor(i.world.z*2)+100,2);
 return c;
}
float Visibility(float3 world) {
 if(lightSettings.z<0.5) return 1;
 float4 p=mul(lightFromWorld,float4(world,1));float3 q=p.xyz/p.w*0.5+0.5;
 if(any(q<0)||any(q>1)) return 1;
 float stored=shadowMap.Sample(shadowSampler,q.xy).r;
 return q.z-lightSettings.w<=stored?1:0.15;
}
float3 Shade(float3 base,float3 n,float3 world,float emission) {
 n=normalize(n);float a=lightSettings.x;
 float3 l=normalize(float3(sin(a),1.5,cos(a)));
 float3 c=base*(0.12+max(0,dot(n,l))*Visibility(world));
 for(int k=1;k<4;k++) {
  if(k>=lightSettings.y) break;
  float3 d=normalize(float3(cos(k*2.1),0.65,sin(k*2.1)));
  float3 tint=k==1?float3(0.2,0.4,1):k==2?float3(1,0.25,0.1):float3(0.25,1,0.5);
  c+=base*tint*max(0,dot(n,d))*0.65;
 }
 return c+base*emission;
}
float4 FragmentMain(Output i) : SV_TARGET {
 if(objectSettings.x>2.5) return float4(i.position.zzz,1);
 if(objectSettings.x>1.5) return float4(normalize(i.normalWS)*0.5+0.5,1);
 if(objectSettings.x>0.5) return float4(Surface(i),objectSettings.y);
 return float4(Shade(Surface(i),i.normalWS,i.world,objectSettings.y),max(baseColor.a,0.0));
}
struct GBuffer {float4 albedo:SV_TARGET0;float4 normal:SV_TARGET1;};
GBuffer GBufferMain(Output i) {GBuffer o;o.albedo=float4(Surface(i),objectSettings.y/8.0);o.normal=float4(normalize(i.normalWS)*0.5+0.5,1);return o;}
