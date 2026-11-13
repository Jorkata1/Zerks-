// Soft round light (lamp pools, the laser, the beacon) and soft dust: a radial falloff with no texture,
// so no coloured dots in Safari-like samplers (docs/practices.md: softTexture).
Shader "Zerks/Glow"
{
    Properties
    {
        _Color ("Colour", Color) = (1, 0.78, 0.48, 1)
        _Alpha ("Strength", Range(0, 2)) = 0.5
        [Toggle] _Additive ("Additive", Float) = 1
        _Soft ("Round falloff (1) or flat (0)", Range(0, 1)) = 1
    }
    SubShader
    {
        Tags { "RenderType" = "Transparent" "Queue" = "Transparent" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            Name "Glow"
            Tags { "LightMode" = "UniversalForward" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                half4 _Color;
                half _Alpha;
                half _Additive;
                half _Soft;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; };
            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = v.uv;
                return o;
            }
            half4 frag (Varyings i) : SV_Target
            {
                float2 d = i.uv * 2 - 1;
                half r = saturate(1 - dot(d, d));
                // soft = 0: flat (the laser); soft > 0: a round falloff that reaches zero at the edge of the quad
                half fall = _Soft > 0.001 ? pow(r, lerp(0.35, 2.0, _Soft)) : 1;
                half a = saturate(_Alpha * fall);
                return half4(_Color.rgb * (1 + _Additive), a);
            }
            ENDHLSL
        }
    }
}
