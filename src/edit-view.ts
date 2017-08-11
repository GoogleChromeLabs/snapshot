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
import db from './image-db';
import ImageRecord from './image-record';
import ImageShader from './image-shader';
import router from './router';
import View from './view';
import ViewState from './view-state';

export default class EditView extends View {
  private destElement: HTMLDivElement;
  private imageElement: HTMLImageElement;
  private closeButton: HTMLButtonElement;
  private sliders: Map<string, HTMLInputElement>;
  private effectButtons: Set<HTMLButtonElement>;
  private animationFrame: number;
  private imageShader: ImageShader;
  private currentRecord: ImageRecord | null;
  private currentPanel: Element | null;
  private pendingSave: boolean;

  constructor() {
    super(document.getElementById('edit-view')!);

    this.destElement = document.getElementById('edit-dest')! as HTMLDivElement;
    this.closeButton = document.getElementById('edit-view-close')! as HTMLButtonElement;

    this.closeButton.addEventListener('click', () => this.closeClick());

    this.sliders = new Map();

    for (const slider of [...this.viewElement.getElementsByTagName('input')]) {
      this.sliders.set(slider.id, slider);
      slider.addEventListener('input', () => {
        if (!this.animationFrame) {
          this.animationFrame = requestAnimationFrame(() => this.draw());
        }
      });
    }

    this.effectButtons = new Set(this.viewElement.querySelectorAll("button.effect-button")) as Set<HTMLButtonElement>;

    for (const effectButton of this.effectButtons) {
      effectButton.addEventListener('click', () => this.effectButtonClick(effectButton));
    }

    this.imageShader = new ImageShader();
    this.imageShader.setFragmentShader(fragmentShader);
    this.destElement.appendChild(this.imageShader.canvas);

    this.currentPanel = null;
    this.currentRecord = null;
    this.pendingSave = false;
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
    };
    db.retrieve(state.id).then((record: ImageRecord) => {
      this.currentRecord = record;
      this.imageElement.src = URL.createObjectURL(record.original);
    });
    super.show();
  }

  hide() {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.currentRecord = null;
    if (this.currentPanel) {
      this.currentPanel.classList.add('hidden');
    }
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
      for (const [name, value] of state.sliderValues) {
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

    this.animationFrame = 0;

    this.imageShader.render();

    this.triggerSave();
  }

  private effectButtonClick(button: HTMLButtonElement) {
    const parent = button.parentElement!;
    const panel = parent.querySelector('.slider-panel')!;

    if (this.currentPanel) {
      this.currentPanel.classList.add('hidden');

      if (this.currentPanel !== panel) {
        this.currentPanel = panel;
        panel.classList.remove('hidden');
      } else {
        this.currentPanel = null;
      }
    } else {
      this.currentPanel = panel;
      panel.classList.remove('hidden');
    }
  }

  private triggerSave() {
    if (this.pendingSave) {
      return;
    }

    this.pendingSave = true;

    setTimeout(() => this.save(), 500);
  }

  private save() {
    // TODO: Defer the toBlob call till after the rAF
    // BUG: crbug.com/752460
    this.pendingSave = false;
    this.draw();
    this.imageShader.canvas.toBlob((blob: Blob) => {
      if (this.currentRecord) {
        this.currentRecord.edited = blob;
        db.store(this.currentRecord);
      }
    }, 'image/jpeg');
  }

  private closeClick() {
    router.visit(`/browse`);
  }
}
