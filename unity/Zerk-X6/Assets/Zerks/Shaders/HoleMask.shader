// The opening of a building dug down into the ground (the clay pit, Joro, 11.11.2026: "the pit is something dug down,
// not a hill"). Drawn before the ground, it marks the opening in the stencil and draws nothing; the ground (Ground.shader)
// is not drawn where the mark is, so the pit under it shows. The same as the stencil in game/src/view/world.ts.
Shader "Zerks/HoleMask"
{
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry-10" }
        Pass
        {
            Name "HoleMask"
            Tags { "LightMode" = "UniversalForward" }
            ColorMask 0
            ZWrite Off
            Cull Off
            Stencil { Ref 1 Comp Always Pass Replace }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct Attributes { float4 positionOS : POSITION; };
            struct Varyings { float4 positionCS : SV_POSITION; };
            Varyings vert (Attributes v) { Varyings o; o.positionCS = TransformObjectToHClip(v.positionOS.xyz); return o; }
            half4 frag (Varyings i) : SV_Target { return 0; }
            ENDHLSL
        }
    }
}
