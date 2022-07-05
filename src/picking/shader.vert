precision mediump float;

attribute vec3 aPosition;

uniform mat4 uMvpMatrix;

void main() {
  gl_Position = uMvpMatrix * vec4(aPosition, 1.0);
}