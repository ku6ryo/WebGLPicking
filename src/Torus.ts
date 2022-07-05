import { createTorus } from "./createTorus"
import { vec3 } from "gl-matrix"

export class Torus {
  positions: Float32Array
  indices: Uint16Array
  normals: Float32Array

  position: [number, number, number]
  scale: [number, number, number]
  rotation: [number, number, number]

  constructor(
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
  ) {
    const {
      positions,
      triangles,
    } = createTorus(1, 0.2, 50, 50)
    const tmpNormals: [number, number, number][] = []
    triangles.forEach(t => {
      const i0 = t[0]
      const i1 = t[1]
      const i2 = t[2]
      const v0 = positions[i0]
      const v1 = positions[i1]
      const v2 = positions[i2]

      const vv01 = vec3.create()
      vec3.subtract(vv01, v1, v0)
      const vv02 = vec3.create()
      vec3.subtract(vv02, v2, v0)
      const cross = vec3.create()
      vec3.cross(cross, vv02, vv01)
      ;[i0, i1, i2].forEach((i) => {
        tmpNormals[i] = tmpNormals[i] || [0, 0, 0]
        vec3.add(tmpNormals[i], tmpNormals[i], cross)
      })
    })
    const normals = tmpNormals.map(n => {
      vec3.normalize(n, n)
      return n
    })
    this.positions = new Float32Array(positions.flat())
    this.indices = new Uint16Array(triangles.flat())
    this.normals = new Float32Array(normals.flat())
    this.position = position
    this.rotation = rotation
    this.scale = scale
  }
}