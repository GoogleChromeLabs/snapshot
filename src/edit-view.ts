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

import db from './image-db';
import fragmentShader from './filter-fragment-shader.glsl';
import ImageShader from './image-shader';
import router from './router';
import View from './view';
import ViewState from './view-state';

export default class EditView extends View {
  private destElement: HTMLDivElement;
  private imageElement: HTMLImageElement;
  private sliders: Map<string, HTMLInputElement>;
  private animationFrame: number;
  private imageShader: ImageShader;

  constructor() {
    super(document.getElementById('edit-view')!);

    this.destElement = document.getElementById('edit-dest')! as HTMLDivElement;

    this.sliders = new Map();

    for (const slider of [...this.viewElement.getElementsByTagName('input')]) {
      this.sliders.set(slider.id, slider);
    }

    this.imageShader = new ImageShader();
    this.imageShader.setFragmentShader(fragmentShader);
    this.destElement.appendChild(this.imageShader.canvas);
  }

  show() {
    const state = this.getState();

    if (!state.id) {
      // TODO: Better handling of errors?
      throw new Error(`Couldn't get id of image`);
    }

    this.imageElement = document.createElement('img');
    this.imageElement.onload = () => {
      URL.revokeObjectURL(this.imageElement.src);
      this.imageShader.setImage(this.imageElement);
      this.animationFrame = requestAnimationFrame(() => this.draw());
    }
    db.retrieve(state.id).then((blob) => {
      this.imageElement.src = URL.createObjectURL(blob);
    });
    super.show();
  }

  hide() {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    super.hide();
  }

  getState(): ViewState {
    const state = super.getState();
    state.sliderValues = new Map();
    for (const [name, slider] of this.sliders) {
      state.sliderValues.set(name, Number(slider.value));
    }
    return state;
  }

  setState(state: ViewState) {
    for (const [name, slider] of this.sliders) {
      slider.value = slider.defaultValue;
    }
    if (state.sliderValues) {
      for (let [name, value] of state.sliderValues) {
        if (this.sliders.has(name)) {
          this.sliders.get(name)!.value = String(value);
        }
      }
    }
    super.setState(state);
  }

  private draw() {
    const canvas = this.imageShader.canvas;

    canvas.width = this.imageElement.naturalWidth;
    canvas.height = this.imageElement.naturalHeight;

    this.imageShader.setUniform('sourceSize', new Float32Array([1 / canvas.width, 1 / canvas.height]));

    for (const [name, slider] of this.sliders) {
      const value = Number(slider.value) / 50;
      this.imageShader.setUniform(name, value);
    }

    this.imageShader.render();

    this.animationFrame = requestAnimationFrame(() => this.draw());
  }
}
