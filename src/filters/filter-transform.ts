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

import fragmentShader from './filter-fragment-shader.glsl';
import ImageShader from './image-shader';

const shader = new ImageShader();
shader.setFragmentShader(fragmentShader);

const random = (min: number, max: number): number => {
  let result = Math.random();
  result *= (max - min);
  result += min;
  return result;
};

export default class FilterTransform {
  static from(data: {[name: string]: number} | null) {
    const result = new FilterTransform();

    if (data) {
      result.saturation = data.saturation || result.saturation;
      result.warmth = data.warmth || result.warmth;
      result.sharpen = data.sharpen || result.sharpen;
      result.blur = data.blur || result.blur;
      result.brightness = data.brightness || result.brightness;
      result.contrast = data.contrast || result.contrast;
      result.grey = data.grey || result.grey;
      result.vignette = data.vignette || result.vignette;
    }

    return result;
  }

  saturation: number;
  warmth: number;
  sharpen: number;
  blur: number;
  brightness: number;
  contrast: number;
  grey: number;
  vignette: number;

  constructor() {
    this.saturation = 1;
    this.warmth = 0;
    this.sharpen = 0;
    this.blur = 1;
    this.brightness = 1;
    this.contrast = 1;
    this.grey = 0.5;
    this.vignette = 2;
  }

  randomize() {
    this.saturation = random(0, 2);
    this.warmth = random(-0.08, 0.08);
    this.sharpen = random(-2, 2);
    this.blur = random(0.01, 4);
    this.brightness = random(0, 2);
    this.contrast = random(0, 2);
    this.grey = random(0, 1);
    this.vignette = random(0.2, 2);
  }

  apply(source: ImageSource, dest: HTMLCanvasElement, height?: number) {
    let sourceWidth: number;
    let sourceHeight: number;
    let relativeSize = 1;

    if (source instanceof HTMLImageElement) {
      sourceWidth = source.naturalWidth;
      sourceHeight = source.naturalHeight;
    } else if (source instanceof HTMLVideoElement) {
      sourceWidth = source.videoWidth;
      sourceHeight = source.videoHeight;
    } else {
      sourceWidth = source.width;
      sourceHeight = source.height;
    }

    if (height && height !== sourceHeight) {
      const resized = document.createElement('canvas');
      const aspectRatio = sourceWidth / sourceHeight;
      resized.height = height * devicePixelRatio;
      resized.width = resized.height * aspectRatio;
      resized.getContext('2d')!.drawImage(source, 0, 0, resized.width, resized.height);
      shader.setImage(resized);
      relativeSize = resized.height / sourceHeight;
      dest.width = resized.width;
      dest.height = resized.height;
    } else {
      shader.setImage(source);
      dest.width = sourceWidth;
      dest.height = sourceHeight;
    }

    shader.canvas.width = dest.width;
    shader.canvas.height = dest.height;
    shader.setUniform('sourceSize', new Float32Array([1 / dest.width, 1 / dest.height]));

    // Reduce the blur value relative to the size of the output
    shader.setUniform('blur', relativeSize * this.blur);
    shader.setUniform('brightness', this.brightness);
    shader.setUniform('contrast', this.contrast);
    shader.setUniform('grey', this.grey);
    shader.setUniform('saturation', this.saturation);
    shader.setUniform('sharpen', this.sharpen);
    shader.setUniform('vignette', this.vignette);
    shader.setUniform('warmth', this.warmth);
    shader.render();

    const context = dest.getContext('2d')!;
    context.drawImage(
      shader.canvas,
      0, 0, shader.canvas.width, shader.canvas.height,
      0, 0, dest.width, dest.height);
  }
}
