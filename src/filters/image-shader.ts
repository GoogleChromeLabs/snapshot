/*
  Copyright 2017 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const BASE_VERTEX_SHADER = `
attribute vec2 position;
attribute vec2 uv;

varying vec2 texCoords;

void main() {
  gl_Position = vec4(position, 0, 1.0);
  texCoords = uv;
}`;

const BASE_FRAGMENT_SHADER = `
precision highp float;

varying vec2 texCoords;

uniform sampler2D textureSampler;

void main() {
  gl_FragColor = texture2D(textureSampler, texCoords);
}`;

const POSITIONS = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
const UVS = new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]);
const INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

class UniformInfo {
  type: GLenum;
  location: WebGLUniformLocation;
}

export default class ImageShader {
  canvas: HTMLCanvasElement;
  context: WebGLRenderingContext;

  private textureId: WebGLTexture;
  private programId: WebGLProgram;
  private vertShader: string;
  private fragShader: string;

  private uniformLocations: Map<string, UniformInfo>;
  private dirtyProgram: boolean;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('webgl');

    if (context === null) {
      throw new Error(`Couldn't get a WebGL context`);
    }

    const gl: WebGLRenderingContext = context as WebGLRenderingContext;
    this.context = gl;
    const textureId = gl.createTexture();

    if (textureId === null) {
      throw new Error('Error getting texture ID');
    }

    this.textureId = textureId;
    this.programId = 0;

    this.vertShader = BASE_VERTEX_SHADER;
    this.fragShader = BASE_FRAGMENT_SHADER;

    this.uniformLocations = new Map();

    this.createVAO(INDEX, POSITIONS, UVS);

    gl.clearColor(1, 1, 1, 1);

    this.dirtyProgram = true;
  }

  setImage(image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    const gl = this.context;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textureId);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    // gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  setVertexShader(source: string) {
    this.vertShader = source;
    this.dirtyProgram = true;
  }

  setFragmentShader(source: string) {
    this.fragShader = source;
    this.dirtyProgram = true;
  }

  setUniform(name: string, value: any) {
    const gl = this.context;

    if (this.dirtyProgram) {
      this.createProgram();
    }

    if (!this.uniformLocations.has(name)) {
      console.warn(`Tried to set unknown uniform ${name}`);
      return;
    }

    const info = this.uniformLocations.get(name)!;

    switch (info.type) {
      case gl.FLOAT:
        gl.uniform1fv(info.location, [value]);
        break;
      case gl.FLOAT_VEC2:
        gl.uniform2fv(info.location, value);
        break;
      case gl.FLOAT_VEC3:
        gl.uniform3fv(info.location, value);
        break;
      case gl.FLOAT_VEC4:
        gl.uniform4fv(info.location, value);
        break;
      case gl.BOOL:
      case gl.INT:
        gl.uniform1iv(info.location, [value]);
        break;
      case gl.BOOL_VEC2:
      case gl.INT_VEC2:
        gl.uniform2iv(info.location, value);
        break;
      case gl.BOOL_VEC3:
      case gl.INT_VEC3:
        gl.uniform3iv(info.location, value);
        break;
      case gl.BOOL_VEC4:
      case gl.INT_VEC4:
        gl.uniform4iv(info.location, value);
        break;
      default:
        console.error(`Couldn't set uniform, unsupported type`);
    }
  }

  render() {
    const gl = this.context;

    if (this.dirtyProgram) {
      this.createProgram();
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.flush();
  }

  private createProgram() {
    const gl = this.context;

    const vertexShaderId = this.compileShader(this.vertShader, gl.VERTEX_SHADER);
    const fragmentShaderId = this.compileShader(this.fragShader, gl.FRAGMENT_SHADER);
    const programId = gl.createProgram();
    if (programId === null) {
      throw new Error(`Couldn't get a program ID`);
    }
    this.programId = programId;
    gl.attachShader(programId, vertexShaderId);
    gl.attachShader(programId, fragmentShaderId);
    gl.linkProgram(programId);
    if (!gl.getProgramParameter(programId, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(programId);
      throw new Error('Could not link shader program. \n\n' + info);
    }
    gl.validateProgram(programId);
    if (!gl.getProgramParameter(programId, gl.VALIDATE_STATUS)) {
      const info = gl.getProgramInfoLog(programId);
      throw new Error('Could not validate shader program. \n\n' + info);
    }
    gl.useProgram(programId);
    this.uniformLocations = new Map();
    this.getUniformLocations();

    this.dirtyProgram = false;
  }

  private compileShader(source: string, type: number): WebGLShader {
    const gl = this.context;
    const shader = gl.createShader(type);

    if (shader === null) {
      throw new Error('Error creating shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Couldn't compiler shader: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  private getUniformLocations() {
    const gl = this.context;
    const numUniforms = gl.getProgramParameter(this.programId, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(this.programId, i);
      if (info === null) {
        throw new Error(`Couldn't get uniform info`);
      }
      const location = gl.getUniformLocation(this.programId, info.name);
      if (location) {
        this.uniformLocations.set(info.name, {type: info.type, location});
      }
    }
  }

  private createVAO(index, positions, uvs) {
    const gl = this.context;
    const ext = gl.getExtension('OES_vertex_array_object');
    if (!ext) {
      throw new Error(`Browser doesn't support VAOs`);
    }
    const vaoId = ext.createVertexArrayOES();
    ext.bindVertexArrayOES(vaoId);
    this.bindIndicesBuffer(index);
    this.bindAttributeBuffer(0, 2, positions);
    this.bindAttributeBuffer(1, 2, uvs);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
  }

  private bindAttributeBuffer(attributeNumber, size, data) {
    const gl = this.context;
    const id = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, id);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.vertexAttribPointer(attributeNumber, size, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private bindIndicesBuffer(data) {
    const gl = this.context;
    const id = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, id);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }
}
