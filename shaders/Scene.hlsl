#include "LectureEffects.hlsl"
cbuffer SceneFrame : register(b0)
{
    float4x4 clipFromObject;
    float4x4 worldFromObject;
    float4x4 normalFromObject;
    float4 baseColor;
    float4 light; // direction toward the light, ambient contribution
    float4 settings; // material mode, metallic, roughness, reserved
    float4 eye;
};
Texture2D albedo : register(t0);
SamplerState albedoSampler : register(s0);
struct SceneInput
{
    [[vk::location(0)]] float3 position : POSITION;
    [[vk::location(1)]] float2 uv : TEXCOORD0;
    [[vk::location(2)]] float3 normal : NORMAL;
};
struct SceneOutput
{
    float4 position : SV_POSITION;
    [[vk::location(0)]] float2 uv : TEXCOORD0;
    [[vk::location(1)]] float3 normalWS : TEXCOORD1;
    [[vk::location(2)]] float3 positionWS : TEXCOORD2;
};
SceneOutput VertexMain(SceneInput input)
{
    SceneOutput output;
    output.position = mul(clipFromObject, float4(input.position, 1.0));
    output.positionWS = mul(worldFromObject, float4(input.position, 1.0)).xyz;
    output.normalWS = mul(normalFromObject, float4(input.normal, 0.0)).xyz;
    output.uv = input.uv;
    return output;
}
float3 DecodeSRGB(float3 c)
{
    return float3(c.r <= 0.04045 ? c.r / 12.92 : pow((c.r + 0.055) / 1.055, 2.4),
                  c.g <= 0.04045 ? c.g / 12.92 : pow((c.g + 0.055) / 1.055, 2.4),
                  c.b <= 0.04045 ? c.b / 12.92 : pow((c.b + 0.055) / 1.055, 2.4));
}
float3 EncodeSRGB(float3 c)
{
    c = max(c, 0.0);
    float3 high = 1.055 * pow(c, 1.0 / 2.4) - 0.055;
    return float3(c.r <= 0.0031308 ? 12.92*c.r : high.r,
                  c.g <= 0.0031308 ? 12.92*c.g : high.g,
                  c.b <= 0.0031308 ? 12.92*c.b : high.b);
}
float4 FragmentMain(SceneOutput input) : SV_TARGET
{
    float3 color = baseColor.rgb;
    if(settings.x > 1.5 && settings.x < 3.5)
        color *= albedo.Sample(albedoSampler,input.uv).rgb;
    if(settings.x > 0.5 && settings.x < 2.5)
        color = LambertColor(color, input.normalWS, light.xyz, light.w);
    if(settings.x > 4.5)
        color = AlphaColor(baseColor.rgb, light.xyz, baseColor.a);
    else if(settings.x > 3.5)
        color = MaterialColor(color,input.normalWS,light.xyz,eye.xyz-input.positionWS,settings.y,settings.z);
    return float4(EncodeSRGB(color),1.0);
}
