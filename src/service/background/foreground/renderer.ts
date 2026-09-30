import { VIEWPORT_PRESENTATION as viewport } from '../../../configs/viewportConfig';
import { FOREGROUND_MOTION as config } from '../../../configs/backgrounds/foregroundMotionConfig';
import { getBackgroundAssetUrl } from '../backgroundAssets';
import { createMeshIndices, updateMesh, type ForegroundMesh } from './mesh';

const vertexSource = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform vec2 u_size;
varying vec2 v_uv;
void main() {
  vec2 clip = a_position / u_size * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = a_uv;
}`;
const fragmentSource = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() { gl_FragColor = texture2D(u_texture, v_uv); }
`;

/** One context and reusable buffers; source images are uploaded once, positions only while active. */
export function createForegroundRenderer(canvas: HTMLCanvasElement, directory: string, meshes: ForegroundMesh[]) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return null;
  const shaders: WebGLShader[] = [], buffers: WebGLBuffer[] = [], textures: WebGLTexture[] = [];
  const program = gl.createProgram()!;
  let disposed = false, ready = false;
  const destroy = () => {
    disposed = true;
    for (const texture of textures) gl.deleteTexture(texture);
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteProgram(program);
  };
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Foreground shader compilation failed');
    gl.attachShader(program, shader);
  };
  try {
    compile(gl.VERTEX_SHADER, vertexSource); compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Foreground shader link failed');
  } catch (error) { destroy(); throw error; }
  const buffer = (target: number, data: Float32Array | Uint16Array, usage: number) => {
    const resource = gl.createBuffer()!; buffers.push(resource);
    gl.bindBuffer(target, resource); gl.bufferData(target, data, usage);
    return resource;
  };
  const indices = createMeshIndices();
  const indexBuffer = buffer(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  const positionBuffer = buffer(gl.ARRAY_BUFFER, meshes[0]?.positions ?? new Float32Array(), gl.DYNAMIC_DRAW);
  const uvBuffer = buffer(gl.ARRAY_BUFFER, meshes[0]?.uv ?? new Float32Array(), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position'), uv = gl.getAttribLocation(program, 'a_uv');
  const sizeUniform = gl.getUniformLocation(program, 'u_size'), textureUniform = gl.getUniformLocation(program, 'u_texture');
  const files = [...new Set(meshes.map(mesh => mesh.file))];
  const textureByFile = new Map<string, WebGLTexture>();
  const loaded = Promise.all(files.map(async file => {
    const image = new Image(); image.src = getBackgroundAssetUrl(directory, file);
    await image.decode();
    return { file, image };
  })).then(images => {
    if (disposed || gl.isContextLost()) return false;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    for (const { file, image } of images) {
      const texture = gl.createTexture()!; textures.push(texture); textureByFile.set(file, texture);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    ready = true;
    return true;
  });
  return {
    loaded, destroy,
    resize(scale: number) {
      const ratio = Math.min(config.mesh.maxPixelRatio, scale * window.devicePixelRatio);
      const width = Math.max(1, Math.round(viewport.referenceWidth * ratio));
      const height = Math.max(1, Math.round(viewport.referenceHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    },
    render(bends: Float32Array) {
      if (!ready || disposed || gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(sizeUniform, viewport.referenceWidth, viewport.referenceHeight);
      gl.uniform1i(textureUniform, 0); gl.activeTexture(gl.TEXTURE0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer); gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      for (const mesh of meshes) {
        updateMesh(mesh, bends[mesh.body]);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.positions);
        gl.bindTexture(gl.TEXTURE_2D, textureByFile.get(mesh.file)!);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      }
    },
  };
}
