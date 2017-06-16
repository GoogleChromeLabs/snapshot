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

export default class ImageView extends View {
  private imageElement: HTMLImageElement;
  private editButton: HTMLButtonElement;

  constructor() {
    super(document.getElementById('image-view')!);
    this.imageElement = document.getElementById('output-image')! as HTMLImageElement;
    this.editButton = document.getElementById('image-edit-button')! as HTMLButtonElement;
    this.editButton.addEventListener('click', () => this.edit());
  }

  show() {
    const state = this.getState();

    if (!state.id) {
      // TODO: Better handling of errors?
      throw new Error(`Couldn't get id of image`);
    }
    this.imageElement.onload = () => URL.revokeObjectURL(this.imageElement.src);
    db.retrieve(state.id).then((blob) => {
      this.imageElement.src = URL.createObjectURL(blob);
    });
    super.show();
  }

  edit() {
    const state = this.getState();

    if (!state.id) {
      // TODO: Better handling of errors?
      throw new Error(`Couldn't get id of image`);
    }

    router.visit(`/edit/${state.id}`);
  }
}
