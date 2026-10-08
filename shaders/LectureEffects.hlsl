#ifndef LECTURE_EFFECTS_INCLUDED
#define LECTURE_EFFECTS_INCLUDED

// Shared shading functions for the browser shaders.
float4 ConstantColor(float3 color)
{
    return float4(color, 1.0);
}

float4 GradientColor(float2 uv)
{
    return float4(uv.x, uv.y, 0.0, 1.0);
}

float4 PulseColor(float time)
{
    float red = 0.5 + 0.5 * sin(time);
    return float4(red, 0.0, 0.0, 1.0);
}

float3 WavePosition(float3 position, float time, float amplitude, float frequency)
{
    position.y += amplitude * sin(frequency * position.x + time);
    return position;
}

float3 AlphaColor(float3 foreground, float3 background, float alpha)
{
    return alpha * foreground + (1.0-alpha) * background;
}

float3 LambertColor(float3 color, float3 normal, float3 toLight, float ambient)
{
    float direct = max(0.0, dot(normalize(normal),normalize(toLight)));
    return color * (direct + ambient);
}

// A fixed procedural environment: broad sky and two bright areas.
float3 EnvironmentColor(float3 direction, float roughness)
{
    float band = pow(saturate(1.0-abs(direction.y-0.2)),lerp(40.0,2.0,roughness));
    float window = pow(saturate(dot(direction,normalize(float3(-1.0,0.5,1.0)))),lerp(70.0,3.0,roughness));
    float3 sky = lerp(float3(0.06,0.1,0.2),float3(0.55,0.68,0.9),saturate(direction.y*0.5+0.5));
    return sky + (band*0.45+window*1.5)*(1.0-roughness*0.5);
}

float3 MaterialColor(float3 color, float3 normal, float3 toLight, float3 toEye, float metallic, float roughness)
{
    float3 n=normalize(normal),l=normalize(toLight),v=normalize(toEye),h=normalize(l+v);
    float nl=max(dot(n,l),0.0),nv=max(dot(n,v),0.001),nh=max(dot(n,h),0.0),vh=max(dot(v,h),0.0);
    float r=max(roughness,0.08),a=r*r,a2=a*a;
    float denom=nh*nh*(a2-1.0)+1.0;
    float distribution=a2/(3.14159265*denom*denom);
    float k=(r+1.0)*(r+1.0)/8.0;
    float geometry=(nl/(nl*(1.0-k)+k))*(nv/(nv*(1.0-k)+k));
    float3 f0=lerp(float3(0.04,0.04,0.04),color,metallic);
    float3 fresnel=f0+(1.0-f0)*pow(1.0-vh,5.0);
    float3 diffuse=(1.0-fresnel)*(1.0-metallic)*color/3.14159265;
    float3 specular=distribution*geometry*fresnel/max(4.0*nl*nv,0.001);
    float3 environment=EnvironmentColor(reflect(-v,n),r)*lerp(f0,fresnel,0.5);
    return (diffuse+specular)*nl*2.5+environment+color*(1.0-metallic)*0.05;
}

#endif
