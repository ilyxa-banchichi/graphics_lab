cbuffer ScreenFrame : register(b0) {
 float4x4 worldFromClip;
 float4x4 lightFromWorld;
 float4 settings; // mode: display/extract/blur/composite/deferred/UI, threshold, bloom, exposure
 float4 texel; // inverse width/height, horizontal, UI-before-post
 float4 lightSettings;
};
Texture2D source : register(t0);SamplerState sourceSampler : register(s0);
Texture2D extra : register(t1);SamplerState extraSampler : register(s1);
Texture2D normalMap : register(t2);SamplerState normalSampler : register(s2);
Texture2D depthMap : register(t3);SamplerState depthSampler : register(s3);
Texture2D shadowMap : register(t4);SamplerState shadowSampler : register(s4);
struct Input { [[vk::location(0)]] float3 position:POSITION; [[vk::location(1)]] float2 uv:TEXCOORD0; };
struct Output {float4 position:SV_POSITION; [[vk::location(0)]] float2 uv:TEXCOORD0;};
Output VertexMain(Input i) {Output o;o.position=float4(i.position,1);o.uv=i.uv;return o;}
float3 Encode(float3 c) {return pow(max(c,0),1.0/2.2);}
float3 UI(float2 uv,float3 c) {if(uv.x>0.05&&uv.x<0.37&&uv.y>0.82&&uv.y<0.91) return float3(0.15,0.9,0.7);return c;}
float4 FragmentMain(Output i):SV_TARGET {
 float2 uv=i.uv;float3 c=source.Sample(sourceSampler,uv).rgb;
 if(settings.x>8.5)return float4(UI(uv,c),1);
 if(settings.x<0.5) return float4(Encode(c),1);
 if(settings.x<1.5) {float b=max(c.r,max(c.g,c.b));return float4(c*max(b-settings.y,0)/max(b,0.0001),1);}
 if(settings.x<2.5) {
  float2 d=texel.xy*(texel.z>0.5?float2(1,0):float2(0,1));
  c=c*0.375+(source.Sample(sourceSampler,uv+d).rgb+source.Sample(sourceSampler,uv-d).rgb)*0.25;
  c+=(source.Sample(sourceSampler,uv+2*d).rgb+source.Sample(sourceSampler,uv-2*d).rgb)*0.0625;return float4(c,1);
 }
 if(settings.x<3.5) {if(texel.w>0.5)c=UI(uv,c);c=(c+extra.Sample(extraSampler,uv).rgb*settings.z)*settings.w;c=c/(1+c);return float4(Encode(c),1);}
 if(settings.x<4.5) {
  float depth=depthMap.Sample(depthSampler,uv).r;
  if(depth>=0.99999)return float4(0.0015176,0.0021247,0.0040247,1);
  float4 w=mul(worldFromClip,float4(uv*2-1,depth*2-1,1));float3 world=w.xyz/w.w;
  float4 base=source.Sample(sourceSampler,uv);float3 n=normalize(normalMap.Sample(normalSampler,uv).xyz*2-1);
  float a=lightSettings.x;float3 l=normalize(float3(sin(a),1.5,cos(a)));float visibility=1;
  if(lightSettings.z>0.5) {float4 p=mul(lightFromWorld,float4(world,1));float3 q=p.xyz/p.w*0.5+0.5;if(all(q>=0)&&all(q<=1)) visibility=q.z-lightSettings.w<=shadowMap.Sample(shadowSampler,q.xy).r?1:0.15;}
  c=base.rgb*(0.12+max(0,dot(n,l))*visibility)+base.rgb*base.a*8.0;
  for(int k=1;k<4;k++){if(k>=lightSettings.y)break;float3 d=normalize(float3(cos(k*2.1),0.65,sin(k*2.1)));float3 tint=k==1?float3(0.2,0.4,1):k==2?float3(1,0.25,0.1):float3(0.25,1,0.5);c+=base.rgb*tint*max(0,dot(n,d))*0.65;}
  return float4(c,1);
 }
 if(settings.x<5.5) {float3 u=UI(uv,float3(0,0,0));if(max(u.r,max(u.g,u.b))<0.01)discard;return float4(u,1);}
 // Raw previews for encoded normals and depth: no tone mapping or gamma.
 if(settings.x<6.5)return float4(c,1);
 if(settings.x<7.5)return float4(pow(c.rrr,2),1);
 return float4(pow(c.rrr,60),1);
}
