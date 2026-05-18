import { NativeModules } from 'react-native'
const { NativeCSG } = NativeModules

async function testCSG() {
  try {
    // Simple cube stock: 8 vertices, 12 triangles
    // A 2x2x2 box centred at origin
    const stockVerts = [
      -1,-1,-1,  1,-1,-1,  1,1,-1,  -1,1,-1,  // front face
      -1,-1, 1,  1,-1, 1,  1,1, 1,  -1,1, 1,  // back face
    ]
    const stockInds = [
      0,1,2, 0,2,3,  // front
      4,6,5, 4,7,6,  // back
      0,4,5, 0,5,1,  // bottom
      2,6,7, 2,7,3,  // top
      0,3,7, 0,7,4,  // left
      1,5,6, 1,6,2,  // right
    ]

    console.log('🔶 Testing C++ Manifold CSG...')

    // Test 1 — subtract a small sphere from centre of cube
    const result = await NativeCSG.subtractShape(
      stockVerts, stockInds,
      2,           // sphere
      0.6, 0, 0,   // radius=0.6, segments=auto
      0, 0, 0      // position = centre
    )

    if (result.success) {
      console.log('✅ CSG works!')
      console.log('   Vertices:', result.vertices.length / 3, 'points')
      console.log('   Triangles:', result.indices.length / 3)
    } else {
      console.log('❌ CSG failed:', result.error)
    }

    // Test 2 — subtract a cylinder
    const result2 = await NativeCSG.subtractShape(
      stockVerts, stockInds,
      0,            // cylinder
      0.3, 2, 0,    // radius=0.3, height=2, segments=auto
      0, 0, 0
    )
    console.log('✅ Cylinder subtract:', result2.success,
      '→', result2.vertices?.length / 3, 'verts')

  } catch (e) {
    console.log('❌ Exception:', e.message)
  }
}
export default testCSG
// Call it on mount:
// useEffect(() => { testCSG() }, [])