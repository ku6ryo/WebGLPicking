
type Vert = {
  index: number
  position: [number, number, number]
}

function createTriangles(ring0: Vert[], ring1: Vert[]) {
  const verts = ring0.length
  const triangles: [number, number, number][] = []
  for (let i = 0; i < ring0.length; i++) {
    triangles.push([
      ring0[i].index,
      ring1[(i + 1) % verts].index,
      ring0[(i + 1) % verts].index,
    ])
    triangles.push([
      ring0[i].index,
      ring1[i].index,
      ring1[(i + 1) % verts].index,
    ])
  }
  return triangles
}

export function createTorus (
  radialRadius: number,
  tubularRadius: number,
  radialSegments: number,
  tubularSegments: number
) {
  const rings: Vert[][] = []
  const uvs: [number, number][] = []
  let index = 0
  for (let i = 0; i < radialSegments; i++) {
    const ring: Vert[] = []
    for (let j = 0; j < tubularSegments; j++) {
      const rr = (i / radialSegments) * Math.PI * 2
      const tr = (j / tubularSegments) * Math.PI * 2
      const x = (radialRadius + tubularRadius * Math.cos(tr)) * Math.cos(rr)
      const y = (radialRadius + tubularRadius * Math.cos(tr)) * Math.sin(rr)
      const z = tubularRadius * Math.sin(tr)
      ring.push({ index, position: [x, y, z] })
      uvs.push(
        [j / (tubularSegments - 1), i / (radialSegments - 1)]
      )
      index += 1
    }
    rings.push(ring)
  }
  const positions = rings.flat().map((v) => v.position)
  const trianglesArray: [number, number, number][][] = []
  for (let k = 0; k < rings.length; k++) {
    trianglesArray.push(
      createTriangles(rings[k], rings[(k + 1) % rings.length])
    )
  }
  const triangles = trianglesArray.flat()
  return {
    positions,
    triangles,
    uvs,
  }
}