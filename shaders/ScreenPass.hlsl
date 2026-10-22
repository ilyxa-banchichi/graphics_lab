cbuffer ScreenFrame : register(b0) {
 float4x4 worldFromClip;
 float4x4 lightFromWorld;
 float4 settings; // mode: display/extract/blur/composite/deferred/UI, threshold, bloom, exposure
 float4 texel; // inverse width/height, horizontal, UI-before-post
 float4 lightSettings;
 float4 shadowFiltering; // inverse shadow size xy, PCF radius in texels, enabled
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
float ShadowVisibility(float3 world) {
 if(lightSettings.z<0.5) return 1;
 float4 p=mul(lightFromWorld,float4(world,1));float3 q=p.xyz/p.w*0.5+0.5;
 if(any(q<0)||any(q>1)) return 1;
 if(shadowFiltering.w<0.5) return q.z-lightSettings.w<=shadowMap.SampleLevel(shadowSampler,q.xy,0).r?1:0.15;
 // PCF averages visibility comparisons, not the stored depth values.
 float visibility=0;
 [unroll] for(int y=-1;y<=1;y++) {
  [unroll] for(int x=-1;x<=1;x++) {
   float2 uv=q.xy+float2(x,y)*shadowFiltering.xy*shadowFiltering.z;
   float stored=shadowMap.SampleLevel(shadowSampler,uv,0).r;
   visibility+=q.z-lightSettings.w<=stored?1:0.15;
  }
 }
 return visibility/9.0;
}
float4 FragmentMain(Output i):SV_TARGET {
 float2 uv=i.uv;float3 c=source.Sample(sourceSampler,uv).rgb;
 if(settings.x>9.5)return float4(source.Sample(sourceSampler,uv).aaa,1);
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
  visibility=ShadowVisibility(world);
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

// Draw the sky at the far plane, retaining opaque color and camera depth.
Output SkyVertexMain(Input i) {Output o;o.position=float4(i.position.xy,1,1);o.uv=i.uv;return o;}
float4 SkyFragmentMain(Output i):SV_TARGET {
 float2 xy=i.uv*2-1;
 float4 nearPoint=mul(worldFromClip,float4(xy,-1,1));
 float4 farPoint=mul(worldFromClip,float4(xy,1,1));
 float3 ray=normalize(farPoint.xyz/farPoint.w-nearPoint.xyz/nearPoint.w);
 float elevation=saturate(ray.y*0.8+0.45);
 float3 sky=lerp(float3(0.34,0.53,0.74),float3(0.035,0.16,0.42),pow(elevation,0.7));
 float2 cloudUV=ray.xz/max(0.22,ray.y+0.65);
 float cloud=saturate((sin(cloudUV.x*2.7+sin(cloudUV.y*2.1))*sin(cloudUV.y*3.3)+0.1)*1.8);
 float cloudBand=1-smoothstep(0.25,0.9,abs(ray.y+0.05));
 sky=lerp(sky,float3(0.72,0.82,0.92),cloud*cloudBand*0.6);
 return float4(sky,1);
}
