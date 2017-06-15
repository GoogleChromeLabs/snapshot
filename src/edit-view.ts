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

class EditViewState extends ViewState {
}

export default class EditView implements View {
  private destElement: HTMLDivElement;
  private viewElement: HTMLElement;
  private imageElement: HTMLImageElement;
  private sliders: HTMLInputElement[];
  private animationFrame: number;
  private imageShader: ImageShader;

  constructor() {
    this.viewElement = document.getElementById('edit-view')!;

    this.destElement = document.getElementById('edit-dest')! as HTMLDivElement;

    this.sliders = [...this.viewElement.getElementsByTagName('input')];

    this.imageShader = new ImageShader();
    this.imageShader.setFragmentShader(fragmentShader);
    this.destElement.appendChild(this.imageShader.canvas);
  }

  show(state: EditViewState) {
    this.imageElement = document.createElement('img');
    this.imageElement.onload = () => {
      URL.revokeObjectURL(this.imageElement.src);
      this.imageShader.setImage(this.imageElement);
      this.animationFrame = requestAnimationFrame(() => this.draw());
    }
    db.retrieve(state.id).then((blob) => {
      this.imageElement.src = URL.createObjectURL(blob);
    });
    this.viewElement.style.display = 'block';
  }

  hide() {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.viewElement.style.display = 'none';
  }

  getState() {
    return new EditViewState();
  }

  private draw() {
    const canvas = this.imageShader.canvas;

    canvas.width = this.imageElement.naturalWidth;
    canvas.height = this.imageElement.naturalHeight;

    this.imageShader.setUniform('sourceSize', new Float32Array([1 / canvas.width, 1 / canvas.height]));

    for (const slider of this.sliders) {
      const value = Number(slider.value) / 50;
      this.imageShader.setUniform(slider.id, value);
    }

    this.imageShader.render();

    this.animationFrame = requestAnimationFrame(() => this.draw());
  }
}
