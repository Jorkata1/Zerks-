// One layer of the dust blanket over the closed zone (Joro, 14.11.2026). The picture holds three strengths of dust:
// red over the plots of zone I, green over the back of the canyon that zone II clears, blue over what stays after
// it. _Open1 and _Open2 go from 1 to 0 as the research clears a zone, so the dust settles without new pictures. _Open3
// (zone III, the Green Belt, chapter 3) clears the blue dust up the canyon as far as _Front3 (the picture's rows, 0 at
// the far back): beyond it the head of the canyon stays under dust.
// The layer drifts slowly (_Drift, in picture units), so the blanket is never quite still. Only the alpha comes from
// the picture; the colour is the material's (docs/practices.md: soft pictures without colour).
Shader "Zerks/Dust"
{
    Properties
    {
        _BaseMap ("Strengths (r zone I, g zone II, b always)", 2D) = "black" {}
        _Color ("Colour", Color) = (1, 0.92, 0.84, 1)
        _Open1 ("Zone I still closed", Range(0, 1)) = 1
        _Open2 ("Zone II still closed", Range(0, 1)) = 1
        _Open3 ("Zone III still closed", Range(0, 1)) = 1
        _Front3 ("Where the dust stays after zone III (uv.y)", Range(0, 1)) = 0.07
        _Drift ("Drift (uv)", Vector) = (0, 0, 0, 0)
    }
    SubShader
    {
        Tags { "RenderType" = "Transparent" "Queue" = "Transparent" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            Name "Dust"
            Tags { "LightMode" = "UniversalForward" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                half4 _Color;
                half _Open1;
                half _Open2;
                half _Open3;
                float _Front3;
                float4 _Drift;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; float row : TEXCOORD1; };
            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = v.uv + _Drift.xy;
                o.row = v.uv.y;
                return o;
            }
            half4 frag (Varyings i) : SV_Target
            {
                half3 s = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv).rgb;
                half back = 1 - smoothstep(_Front3, _Front3 + 0.035, i.row);
                half a = max(s.b * lerp(back, 1, _Open3), max(s.g * _Open2, s.r * _Open1));
                return half4(_Color.rgb, a * _Color.a);
            }
            ENDHLSL
        }
    }
}
