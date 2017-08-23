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
import FilterTransform from './filter-transform';
import db from './image-db';
import ImageRecord from './image-record';
import ImageShader from './image-shader';
import {NamedFilter, namedFilters} from './named-filter';
import router from './router';
import View from './view';
import ViewState from './view-state';

export default class EditView extends View {
  private destElement: HTMLDivElement;
  private imageElement: HTMLImageElement;
  private closeButton: HTMLButtonElement;
  private acceptButton: HTMLButtonElement;
  private sliders: Map<string, HTMLInputElement>;
  private effectButtons: Set<HTMLButtonElement>;
  private filterSectionButton: HTMLButtonElement;
  private tuneSectionButton: HTMLButtonElement;
  private filterSection: HTMLDivElement;
  private tuneSection: HTMLDivElement;
  private animationFrame: number;
  private imageShader: ImageShader;
  private currentRecord: ImageRecord | null;
  private currentPanel: Element | null;
  private transform: FilterTransform;

  constructor() {
    super(document.getElementById('edit-view')!);

    this.destElement = document.getElementById('edit-dest')! as HTMLDivElement;
    this.closeButton = document.getElementById('edit-view-close')! as HTMLButtonElement;
    this.acceptButton = document.getElementById('edit-view-accept')! as HTMLButtonElement;
    this.filterSectionButton = document.getElementById('edit-select-filters')! as HTMLButtonElement;
    this.tuneSectionButton = document.getElementById('edit-select-tuning')! as HTMLButtonElement;
    this.filterSection = document.getElementById('edit-filter')! as HTMLDivElement;
    this.tuneSection = document.getElementById('edit-tune')! as HTMLDivElement;

    this.closeButton.addEventListener('click', () => this.closeClick());
    this.acceptButton.addEventListener('click', () => this.acceptClick());
    this.filterSectionButton.addEventListener('click', () => this.toggleSection());
    this.tuneSectionButton.addEventListener('click', () => this.toggleSection());

    this.transform = new FilterTransform();

    this.sliders = new Map();

    const sliderElements = this.viewElement.getElementsByTagName('input');

    for (const slider of Array.from(sliderElements)) {
      this.sliders.set(slider.id, slider);

      slider.addEventListener('input', () => {
        this.transform[slider.id] = Number(slider.value) / 50;
        if (!this.animationFrame) {
          this.animationFrame = requestAnimationFrame(() => this.draw());
        }
      });
    }

    for (const filter of namedFilters) {
      filter.values.randomize();

      const button = document.createElement('button');
      button.classList.add('filter-button');
      button.id = `filter-button-${filter.name.toLowerCase()}`;
      button.setAttribute('aria-label', filter.name);
      button.tabIndex = 0;
      button.addEventListener('click', () => this.filterButtonClick(filter));

      const canvas = document.createElement('canvas');
      canvas.classList.add('filter-thumbnail');
      button.appendChild(canvas);

      this.filterSection.appendChild(button);
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
  }

  show() {
    const state = this.getState();

    this.setTransform(state.transform || new FilterTransform());

    if (!state.id) {
      // TODO: Better handling of errors?
      throw new Error(`Couldn't get id of image`);
    }

    this.imageElement = document.createElement('img');
    this.imageElement.onload = () => {
      URL.revokeObjectURL(this.imageElement.src);
      this.imageShader.setImage(this.imageElement);
      this.animationFrame = requestAnimationFrame(() => this.draw());

      const aspectRatio = this.imageElement.naturalWidth / this.imageElement.naturalHeight;

      const thumbnail = document.createElement('canvas');
      thumbnail.height = 100 * devicePixelRatio;
      thumbnail.width = thumbnail.height * aspectRatio;
      thumbnail.getContext('2d')!.drawImage(this.imageElement, 0, 0, thumbnail.width, thumbnail.height);
      const thumbShader = new ImageShader();
      thumbShader.setFragmentShader(fragmentShader);
      thumbShader.setImage(thumbnail);

      const relativeSize = thumbnail.height / this.imageElement.naturalHeight;

      for (const filter of namedFilters) {
        const output =
          document.querySelector(`#filter-button-${filter.name.toLowerCase()} .filter-thumbnail`) as HTMLCanvasElement;
        if (!output) {
          console.error(`No output thumbnail for filter ${filter.name}`);
        } else {
          setTimeout(() => {
            output.width = thumbnail.width;
            output.height = thumbnail.height;
            const context = output.getContext('2d') as CanvasRenderingContext2D;
            thumbShader.setUniform('sourceSize', new Float32Array([1 / thumbnail.width, 1 / thumbnail.height]));

            const transform = filter.values;
            // Reduce the blur value relative to the size of the thumbnail
            thumbShader.setUniform('blur', relativeSize * transform.blur);
            thumbShader.setUniform('brightness', transform.brightness);
            thumbShader.setUniform('contrast', transform.contrast);
            thumbShader.setUniform('grey', transform.grey);
            thumbShader.setUniform('saturation', transform.saturation);
            thumbShader.setUniform('sharpen', transform.sharpen);
            thumbShader.setUniform('vignette', transform.vignette);
            thumbShader.setUniform('warmth', transform.warmth);
            thumbShader.render();
            context.drawImage(
              thumbShader.canvas,
              0, 0, thumbShader.canvas.width, thumbShader.canvas.height,
              0, 0, output.width, output.height);
          }, 0);
        }
      }
    };
    db.retrieve(state.id).then((record: ImageRecord) => {
      this.currentRecord = record;
      this.setTransform(record.transform || new FilterTransform());
      const buffer = record.original;
      const blob = new Blob([buffer], {type: 'image/jpeg'});
      this.imageElement.src = URL.createObjectURL(blob);
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
    state.transform = state.transform || new FilterTransform();
    return state;
  }

  setState(state: ViewState) {
    if (state.transform) {
      this.setTransform(state.transform);
    }
    super.setState(state);
  }

  private setTransform(transform: FilterTransform | {}) {
    if (transform instanceof FilterTransform) {
      this.transform = transform;
    } else {
      for (const [name] of this.transform) {
        if (transform[name]) {
          this.transform[name] = transform[name];
        }
      }
    }
    for (const [id, slider] of this.sliders) {
      slider.value = String(this.transform[id] * 50);
    }
  }

  private draw() {
    const canvas = this.imageShader.canvas;

    canvas.width = this.imageElement.naturalWidth;
    canvas.height = this.imageElement.naturalHeight;

    this.imageShader.setUniform('sourceSize', new Float32Array([1 / canvas.width, 1 / canvas.height]));

    for (const [name, value] of this.transform) {
      this.imageShader.setUniform(name, value);
    }

    this.animationFrame = 0;

    this.imageShader.render();
  }

  private filterButtonClick(filter: NamedFilter) {
    this.setTransform(filter.values);

    if (!this.animationFrame) {
      this.animationFrame = requestAnimationFrame(() => this.draw());
    }
  }

  private effectButtonClick(button: HTMLButtonElement) {
    const panel = this.viewElement.querySelector(`#${button.id}-panel`)!;

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

  private toggleSection() {
    this.filterSection.classList.toggle('selected');
    this.tuneSection.classList.toggle('selected');
    this.filterSectionButton.classList.toggle('selected');
    this.tuneSectionButton.classList.toggle('selected');
    if (this.currentPanel) {
      this.currentPanel.classList.add('hidden');
      this.currentPanel = null;
    }
  }

  private dataUrlToArrayBuffer(dataURI: string): ArrayBuffer {
    const byteString = atob(dataURI.split(',')[1]);
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return ia.buffer;
  }

  private BlobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('loadend', () => resolve(reader.result));
      reader.readAsArrayBuffer(blob);
    });
  }

  private canvasToArrayBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
    if (canvas.toBlob) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob: Blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.addEventListener('loadend', () => resolve(reader.result));
            reader.readAsArrayBuffer(blob);
          } else {
            reject();
          }
        }, 'image/jpeg');
      });
    } else {
      const dataURL = canvas.toDataURL('image/jpeg');
      const buffer = this.dataUrlToArrayBuffer(dataURL);
      return Promise.resolve(buffer);
    }
  }

  private async save(): Promise<void> {
    this.draw();
    const buffer = await this.canvasToArrayBuffer(this.imageShader.canvas);

    if (this.currentRecord) {
      this.currentRecord.edited = buffer;
      this.currentRecord.transform = this.transform;

      db.store(this.currentRecord);
    }
  }

  private closeClick() {
    router.visit(`/browse`);
  }

  private acceptClick() {
    this.save().then(() => {
      router.visit(`/browse`);
    });
  }
}
