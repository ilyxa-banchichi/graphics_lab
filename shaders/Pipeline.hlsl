#include "LectureEffects.hlsl"
cbuffer PipelineFrame : register(b0)
{
    float4x4 clipFromObject;
    float4x4 worldFromObject;
    float4x4 normalFromObject;
    float4 baseColor;
    float4 light;
    float4 settings; // mode, metallic, roughness, viewport height
    float4 eye; // xyz eye position, viewport width
    float4 parameters; // time, reserved
};
Texture2D image : register(t0);
SamplerState imageSampler : register(s0);
struct Input
{
    [[vk::location(0)]] float3 position : POSITION;
    [[vk::location(1)]] float2 uv : TEXCOORD0;
    [[vk::location(2)]] float3 normal : NORMAL;
    [[vk::location(3)]] float3 color : COLOR0;
};
struct Output
{
    float4 position : SV_POSITION;
    [[vk::location(0)]] float2 uv : TEXCOORD0;
    [[vk::location(1)]] float3 normalWS : TEXCOORD1;
    [[vk::location(2)]] float3 world : TEXCOORD2;
    [[vk::location(3)]] float3 color : COLOR0;
};
Output VertexMain(Input input)
{
    Output output;
    output.position = mul(clipFromObject, float4(input.position,1.0));
    output.world = mul(worldFromObject, float4(input.position,1.0)).xyz;
    output.normalWS = mul(normalFromObject, float4(input.normal,0.0)).xyz;
    output.uv = input.uv;
    output.color = input.color;
    return output;
}
float3 EncodeOutput(float3 c)
{
    c = max(c,0.0);
    return float3(c.r <= .0031308 ? 12.92*c.r : 1.055*pow(c.r,1.0/2.4)-.055,
                  c.g <= .0031308 ? 12.92*c.g : 1.055*pow(c.g,1.0/2.4)-.055,
                  c.b <= .0031308 ? 12.92*c.b : 1.055*pow(c.b,1.0/2.4)-.055);
}
float4 FragmentMain(Output input) : SV_TARGET
{
    // The display pass encodes an already linear color attachment.
    if(settings.x > 7.5 && settings.x < 8.5) return float4(EncodeOutput(image.Sample(imageSampler,input.uv).rgb),1.0);
    float3 color = baseColor.rgb;
    if(settings.x > .5 && settings.x < 1.5) color *= input.color;
    if(settings.x > 1.5 && settings.x < 2.5) color *= image.Sample(imageSampler,input.uv).rgb;
    if(settings.x > 2.5 && settings.x < 3.5) color = LambertColor(color,input.normalWS,light.xyz,light.w);
    if(settings.x > 3.5 && settings.x < 4.5) color = MaterialColor(color,input.normalWS,light.xyz,eye.xyz-input.world,settings.y,settings.z);
    if(settings.x > 4.5 && settings.x < 5.5) color = float3(abs(sin(parameters.x)),0.0,0.0);
    if(settings.x > 5.5 && settings.x < 6.5) color = float3(input.position.xy/float2(eye.w,settings.w),0.0);
    if(settings.x > 6.5 && settings.x < 7.5) color = float3(input.uv,0.0);
    if(settings.x > 8.5 && settings.x < 9.5) color = float3(0.5+0.5*sin(parameters.x),0.0,0.0);
    return float4(color,baseColor.a);
}
