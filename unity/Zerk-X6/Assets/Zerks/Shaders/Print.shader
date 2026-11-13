// The drone's print (docs/build-sequence.md): the building appears layer by layer from a paste of crushed stone
// and carbon. Everything above the printed height is cut away; a warm band marks the layer being laid now.
Shader "Zerks/Print"
{
    Properties
    {
        _BaseColor ("Paste", Color) = (0.93, 0.87, 0.78, 1)
        _Height ("Printed height (world Y)", Float) = 0
        _BandColor ("Fresh layer", Color) = (1, 0.62, 0.3, 1)
        _Band ("Band width", Float) = 0.35
        _Layers ("Layer lines per metre", Float) = 3
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
                half4 _BaseColor;
                float _Height;
                half4 _BandColor;
                float _Band;
                float _Layers;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 positionWS : TEXCOORD0; float3 normalWS : TEXCOORD1; };

            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionWS = TransformObjectToWorld(v.positionOS.xyz);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                o.normalWS = TransformObjectToWorldNormal(v.normalOS);
                return o;
            }

            half4 frag (Varyings i, bool front : SV_IsFrontFace) : SV_Target
            {
                clip(_Height - i.positionWS.y);
                float3 n = normalize(i.normalWS) * (front ? 1 : -1);
                Light sun = GetMainLight(TransformWorldToShadowCoord(i.positionWS));
                half lambert = saturate(dot(n, sun.direction)) * sun.shadowAttenuation;
                half3 ambient = SampleSH(n);
                half lines = 0.92 + 0.08 * step(0.5, frac(i.positionWS.y * _Layers));
                half3 col = _BaseColor.rgb * lines * (ambient + lambert * sun.color);
                half band = saturate(1 - (_Height - i.positionWS.y) / max(0.001, _Band));
                col = lerp(col, _BandColor.rgb * 1.6, band * 0.8);
                return half4(col, 1);
            }
            ENDHLSL
        }
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                half4 _BaseColor;
                float _Height;
                half4 _BandColor;
                float _Band;
                float _Layers;
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
            half4 frag (Varyings i) : SV_Target { clip(_Height - i.positionWS.y); return 0; }
            ENDHLSL
        }
    }
}
