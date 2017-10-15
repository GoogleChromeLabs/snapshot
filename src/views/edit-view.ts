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

import FilterTransform from '../filters/filter-transform';
import {NamedFilter, namedFilters} from '../filters/named-filter';
import ImageRecord from '../image-record';
import router from '../router';
import ViewState from '../view-state';
import View from './view';

export default class EditView extends View {
  private destElement: HTMLCanvasElement;
  private sourceElement: HTMLImageElement | null;
  private closeButton: HTMLButtonElement;
  private acceptButton: HTMLButtonElement;
  private sliders: Map<string, HTMLInputElement>;
  private effectButtons: Set<HTMLButtonElement>;
  private filterSectionButton: HTMLButtonElement;
  private tuneSectionButton: HTMLButtonElement;
  private filterSection: HTMLDivElement;
  private tuneSection: HTMLDivElement;
  private animationFrame: number;
  private currentRecord: ImageRecord | null;
  private currentPanel: Element | null;
  private transform: FilterTransform;

  constructor() {
    super(document.getElementById('edit-view')!);

    this.destElement = document.getElementById('edit-dest')! as HTMLCanvasElement;
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

    this.effectButtons = new Set(this.viewElement.querySelectorAll('button.effect-button')) as Set<HTMLButtonElement>;

    for (const effectButton of this.effectButtons) {
      effectButton.addEventListener('click', () => this.effectButtonClick(effectButton));
    }

    this.sourceElement = null;

    this.currentPanel = null;
    this.currentRecord = null;
  }

  async show() {
    const state = this.getState();

    this.setTransform(state.transform || new FilterTransform());

    if (!state.id) {
      // TODO: Better handling of errors?
      throw new Error(`Couldn't get id of image`);
    }

    const record: ImageRecord = await ImageRecord.fromDatabase(state.id);
    this.currentRecord = record;
    this.setTransform(record.transform || new FilterTransform());
    const blob = await record.getOriginal();

    const source = document.createElement('img');
    this.sourceElement = source;
    source.onload = () => {
      URL.revokeObjectURL(source.src);
      this.transform.apply(source, this.destElement);
      this.animationFrame = requestAnimationFrame(() => this.draw());
      this.renderThumbnails();
    };
    source.src = URL.createObjectURL(blob);
    super.show();
  }

  hide() {
    cancelAnimationFrame(this.animationFrame);
    this.sourceElement = null;
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

  private renderThumbnails() {
    if (!this.sourceElement) {
      return;
    }

    for (const filter of namedFilters) {
      const output =
        document.querySelector(`#filter-button-${filter.name.toLowerCase()} .filter-thumbnail`) as HTMLCanvasElement;
      if (!output) {
        console.error(`No output thumbnail for filter ${filter.name}`);
      } else {
        setTimeout(() => {
          filter.values.apply(this.sourceElement!, output, 100);
        }, 0);
      }
    }
  }

  private setTransform(transform: FilterTransform | {[name: string]: number}) {
    if (transform instanceof FilterTransform) {
      this.transform = transform;
    } else {
      for (const name of Object.getOwnPropertyNames(this.transform)) {
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
    if (this.sourceElement) {
      this.transform.apply(this.sourceElement, this.destElement);
    }

    this.animationFrame = 0;
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

  private async save(): Promise<void> {
    if (this.currentRecord) {
      this.currentRecord.transform = this.transform;
      this.currentRecord.save();
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
