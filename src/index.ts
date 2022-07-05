import { mat4 } from "gl-matrix"
import matVertexShader from "./material/shader.vert?raw"
import matFragmentShader from "./material/shader.frag?raw"
import pickVertexShader from "./picking/shader.vert?raw"
import pickFragmentShader from "./picking/shader.frag?raw"
import { createShader, createProgram } from "./shader"
import { Torus } from "./Torus"
import Stats from "stats.js"

const stats = new Stats()
document.body.appendChild(stats.dom)

export async function main() {

  const toruses = Array(30).fill(null).map(() => {
    const scale = (Math.random() * 0.9 + 0.1) * 0.5
    return new Torus(
      [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3],
      [Math.random(), Math.random(), Math.random()],
      [scale, scale, scale],
    )
  })

  const width = 600
  const height = 400
  const fov = Math.PI / 4
  const aspect = width / height
  const near = 0.1
  const far = 100

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  document.body.appendChild(canvas)
  const gl = canvas.getContext("webgl")!

  const projectionMatrix = mat4.perspective(
    mat4.identity(mat4.create()),
    fov,
    aspect,
    near,
    far,
  )
  const viewMatrix = mat4.lookAt(
    mat4.identity(mat4.create()),
    [0, 0, -4],
    [0, 0, 0],
    [0, 1, 0]
  )

  const matProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, matVertexShader), createShader(gl, gl.FRAGMENT_SHADER, matFragmentShader))
  const pickProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, pickVertexShader), createShader(gl, gl.FRAGMENT_SHADER, pickFragmentShader))

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.frontFace(gl.CCW)
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.LEQUAL)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

    // Create a texture to render to
  const targetTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, targetTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  // create a depth renderbuffer
  const depthBuffer = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)

  const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)

  // attach the texture as the first color attachment
  const attachmentPoint = gl.COLOR_ATTACHMENT0
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0)

  // make a depth buffer and the same size as the targetTexture
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer)

  gl.bindTexture(gl.TEXTURE_2D, targetTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)

  function renderForPick() {
    gl.useProgram(pickProgram)
    toruses.forEach((t, i) => {
      const mvpLocation = gl.getUniformLocation(pickProgram, "uMvpMatrix")
      const positionLocation = gl.getAttribLocation(pickProgram, "aPosition")
      const idLocation = gl.getUniformLocation(pickProgram, "uId")

      const positionBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, t.positions, gl.STATIC_DRAW)
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(positionLocation)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)

      const modelMatrix = mat4.create()
      mat4.translate(modelMatrix, modelMatrix, t.position)
      mat4.scale(modelMatrix, modelMatrix, t.scale)
      mat4.rotateX(modelMatrix, modelMatrix, t.rotation[0])
      mat4.rotateY(modelMatrix, modelMatrix, t.rotation[1])
      mat4.rotateZ(modelMatrix, modelMatrix, t.rotation[2])

      const modelViewProjectionMatrix = mat4.identity(mat4.create())
      mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix)
      mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, modelMatrix)
      gl.uniformMatrix4fv(mvpLocation, false, modelViewProjectionMatrix)

      const id = i + 1
      gl.uniform4f(
        idLocation, 
        ((id >>  0) & 0xFF) / 0xFF,
        ((id >>  8) & 0xFF) / 0xFF,
        ((id >> 16) & 0xFF) / 0xFF,
        1,
      )

      const indexBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        t.indices,
        gl.STATIC_DRAW
      )
      gl.drawElements(gl.TRIANGLES, t.indices.length, gl.UNSIGNED_SHORT, 0)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
    })
  }

  let pickedId = -1

  function renderFinal() {
    gl.useProgram(matProgram)
    toruses.forEach((t, i) => {
      const mvpLocation = gl.getUniformLocation(matProgram, "uMvpMatrix")
      const miLocation = gl.getUniformLocation(matProgram, "uMiMatrix")
      const colorLocation = gl.getUniformLocation(matProgram, "uColor")
      const positionLocation = gl.getAttribLocation(matProgram, "aPosition")
      const normalLocation = gl.getAttribLocation(matProgram, "aNormal")

      const positionBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, t.positions, gl.STATIC_DRAW)
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(positionLocation)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)

      const normalBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, t.normals, gl.STATIC_DRAW)
      gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(normalLocation)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)

      const modelMatrix = mat4.create()
      mat4.translate(modelMatrix, modelMatrix, t.position)
      mat4.scale(modelMatrix, modelMatrix, t.scale)
      mat4.rotateX(modelMatrix, modelMatrix, t.rotation[0])
      mat4.rotateY(modelMatrix, modelMatrix, t.rotation[1])
      mat4.rotateZ(modelMatrix, modelMatrix, t.rotation[2])

      const modelViewProjectionMatrix = mat4.identity(mat4.create())
      mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix)
      mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, modelMatrix)
      gl.uniformMatrix4fv(mvpLocation, false, modelViewProjectionMatrix)


      const modelInverseMatrix = mat4.create()
      mat4.invert(modelInverseMatrix, modelMatrix)
      gl.uniformMatrix4fv(miLocation, false, modelInverseMatrix)

      if (pickedId === i + 1) {
        gl.uniform3f(colorLocation, 1, 0, 0)
      } else {
        gl.uniform3f(colorLocation, 0, 0, 1)
      }

      const indexBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        t.indices,
        gl.STATIC_DRAW
      )
      gl.drawElements(gl.TRIANGLES, t.indices.length, gl.UNSIGNED_SHORT, 0)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
    })
  }

  let mouseX = -1
  let mouseY = -1

  window.addEventListener("mousemove", (e) => {
    mouseX = e.x
    mouseY = e.y
  })

  async function process() {
    stats.begin()

    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    renderForPick()

    const pixelX = mouseX * gl.canvas.width / gl.canvas.clientWidth
    const pixelY = gl.canvas.height - mouseY * gl.canvas.height / gl.canvas.clientHeight - 1
    const data = new Uint8Array(4)
    gl.readPixels(
        pixelX,            // x
        pixelY,            // y
        1,                 // width
        1,                 // height
        gl.RGBA,           // format
        gl.UNSIGNED_BYTE,  // type
        data)             // typed array to hold result
    pickedId = data[0] + (data[1] << 8) + (data[2] << 16)// + (data[3] << 24)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    renderFinal()
    stats.end()
    requestAnimationFrame(process)
  }
  requestAnimationFrame(process)
}
main()
