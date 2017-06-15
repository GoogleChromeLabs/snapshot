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
import router from './router';
import View from './view';
import ViewState from './view-state';

class ImageViewState extends ViewState {
}

export default class ImageView implements View {
  private imageElement: HTMLImageElement;
  private viewElement: HTMLElement;
  private editButton: HTMLButtonElement;
  private state: ImageViewState;

  constructor() {
    this.imageElement = document.getElementById('output-image')! as HTMLImageElement;
    this.viewElement = document.getElementById('image-view')!;
    this.editButton = document.getElementById('image-edit-button')! as HTMLButtonElement;
    this.state = new ImageViewState();
    this.editButton.addEventListener('click', () => this.edit());
  }

  show(state: ImageViewState) {
    this.state = state;
    this.imageElement.onload = () => URL.revokeObjectURL(this.imageElement.src);
    db.retrieve(state.id).then((blob) => {
      this.imageElement.src = URL.createObjectURL(blob);
    });
    this.viewElement.style.display = 'block';
  }

  hide() {
    this.viewElement.style.display = 'none';
  }

  getState() {
    return this.state;
  }

  edit() {
    router.visit(`/edit/${this.state.id}`);
  }
}
