// draco3dgltf ships without types; tools/models.ts only needs the decoder module.
declare module 'draco3dgltf' {
  const draco3d: { createDecoderModule(): Promise<unknown>; createEncoderModule(): Promise<unknown> }
  export default draco3d
}
