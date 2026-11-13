// The plan of the building on light layers (docs/build-sequence.md), and the light pools under the lamps.
// Additive, no depth write: it glows over the plot and never hides what is behind it.
Shader "Zerks/Hologram"
{
    Properties
    {
        _Color ("Colour", Color) = (0.37, 0.89, 0.82, 1)
        _Alpha ("Strength", Range(0, 1)) = 0.5
        _Layers ("Layers per metre", Float) = 2
        _Top ("Top of the shown plan (world Y)", Float) = 100
    }
    SubShader
    {
        Tags { "RenderType" = "Transparent" "Queue" = "Transparent" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            Name "Hologram"
            Tags { "LightMode" = "UniversalForward" }
            Blend One One
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                half4 _Color;
                half _Alpha;
                float _Layers;
                float _Top;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 positionWS : TEXCOORD0; };
            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionWS = TransformObjectToWorld(v.positionOS.xyz);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                return o;
            }
            half4 frag (Varyings i) : SV_Target
            {
                clip(_Top - i.positionWS.y);
                half stripe = smoothstep(0.82, 1.0, frac(i.positionWS.y * _Layers));
                half a = _Alpha * (0.25 + 0.75 * stripe);
                return half4(_Color.rgb * a, a);
            }
            ENDHLSL
        }
    }
}
