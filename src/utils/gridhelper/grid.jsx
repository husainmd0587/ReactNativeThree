import { Grid } from '@react-three/drei'

function GridPlane() {
  return (
    <Grid
      infiniteGrid
      cellSize={1}
      cellThickness={.05}
      cellColor="#6f6f6f"
      sectionSize={3}
      sectionThickness={1.5}
      sectionColor="#9d4b4b"
      fadeDistance={30}
      fadeStrength={1}
    />
  )
}
export default GridPlane;