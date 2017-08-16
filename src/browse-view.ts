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
import ImageRecord from './image-record';
import router from './router';
import View from './view';
import ViewState from './view-state';

export default class BrowseView extends View {
  private captureButton: HTMLButtonElement;
  private uploadButton: HTMLButtonElement;
  private emptyListElement: HTMLElement;
  private listElement: HTMLElement;
  private blobURLs: Set<string>;

  constructor() {
    super(document.getElementById('browse-view')!);

    this.captureButton = document.getElementById('browse-capture-button') as HTMLButtonElement;
    this.uploadButton = document.getElementById('browse-upload-button') as HTMLButtonElement;
    this.emptyListElement = document.getElementById('empty-browse-list') as HTMLButtonElement;
    this.listElement = document.getElementById('browse-list') as HTMLButtonElement;

    if (!('mediaDevices' in navigator)) {
      this.captureButton.classList.add('hidden');
    }

    this.captureButton.addEventListener('click', () => this.captureClick());
    this.uploadButton.addEventListener('click', () => this.uploadClick());

    this.blobURLs = new Set();
  }

  async show() {
    const photos = await db.all();

    if (photos.length === 0) {
      this.emptyListElement.classList.remove('hidden');
      this.listElement.classList.add('hidden');
    } else {
      this.emptyListElement.classList.add('hidden');
      this.listElement.classList.remove('hidden');

      for (const record of photos) {
        const thumb = document.createElement('div');
        thumb.classList.add('element');
        thumb.addEventListener('click', () => router.visit(`/edit/${record.id}`));
        const buffer = record.thumbnail || record.edited || record.original;
        if (buffer) {
          const blob = new Blob([buffer], {type: 'image/jpg'});
          const url = URL.createObjectURL(blob);
          this.blobURLs.add(url);
          thumb.style.backgroundImage = `url(${url})`;
        }
        this.listElement.appendChild(thumb);
      }
    }

    super.show();
  }

  hide() {
    super.hide();
    // TODO: Have a good think about this. The strategy here is to remove all
    // child elements when we hide, because smaller DOM seems like a win for the
    // rest of the app. But really we probably want a recycler instead...
    while (this.listElement.hasChildNodes()) {
      this.listElement.removeChild(this.listElement.lastChild!);
    }
    for (const url of this.blobURLs) {
      URL.revokeObjectURL(url);
    }
    this.blobURLs.clear();
  }

  captureClick() {
    router.visit('/capture');
  }

  uploadClick() {
    router.visit('/upload');
  }
}
