import { Box } from './Box'

export function Scene() {
  return (
    <>
      {/* Ambient light provides base illumination */}
      <ambientLight intensity={0.5} />
      
      {/* Directional light creates depth and shadows */}
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      <Box />
    </>
  )
}
