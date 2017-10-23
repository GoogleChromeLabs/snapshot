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

import constants from '../constants';
import ImageRecord from '../image-record';
import pubsub from '../pubsub';
import router from '../router';
import {login, logout, user} from '../sync/auth';
import {ChangeType, IChangeEvent} from '../sync/sync';
import View from './view';

export default class BrowseView extends View {
  private captureButton: HTMLButtonElement;
  private uploadButton: HTMLButtonElement;
  private loginButton: HTMLButtonElement;
  private logoutButton: HTMLButtonElement;
  private loginBar: HTMLElement;
  private userName: HTMLSpanElement;
  private userImage: HTMLImageElement;
  private emptyListElement: HTMLElement;
  private listElement: HTMLElement;
  private thumbnails: Map<number, HTMLElement>;
  private blobURLs: Set<string>;

  constructor() {
    super(document.getElementById('browse-view')!);

    this.captureButton = document.getElementById('browse-capture-button') as HTMLButtonElement;
    this.uploadButton = document.getElementById('browse-upload-button') as HTMLButtonElement;
    this.loginButton = document.getElementById('login-button') as HTMLButtonElement;
    this.logoutButton = document.getElementById('logout-button') as HTMLButtonElement;
    this.loginBar = document.getElementById('login-bar')!;
    this.userName = document.getElementById('user-name')!;
    this.userImage = document.getElementById('user-image') as HTMLImageElement;
    this.emptyListElement = document.getElementById('empty-browse-list')!;
    this.listElement = document.getElementById('browse-list')!;

    if (!constants.SUPPORTS_MEDIA_DEVICES) {
      this.captureButton.classList.add('hidden');
    }

    this.captureButton.addEventListener('click', () => this.captureClick());
    this.uploadButton.addEventListener('click', () => this.uploadClick());
    this.loginButton.addEventListener('click', () => this.loginClick());
    this.logoutButton.addEventListener('click', () => this.logoutClick());

    this.thumbnails = new Map();
    this.blobURLs = new Set();

    pubsub.subscribe('login', () => this.authChanged());
    pubsub.subscribe('logout', () => this.authChanged());
    pubsub.subscribe('sync', (action) => this.syncHandler(action.data));
  }

  async show() {
    const photos = await ImageRecord.getAll();

    for (const record of photos) {
      this.addThumbnail(record);
    }

    this.setListVisibility();

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
    this.thumbnails.clear();
    this.blobURLs.clear();
  }

  captureClick() {
    router.visit('/capture');
  }

  uploadClick() {
    router.visit('/upload');
  }

  loginClick() {
    login();
  }

  logoutClick() {
    logout();
  }

  authChanged() {
    if (user.token === '') {
      this.loginBar.classList.remove('is-logged-in');
    } else {
      this.loginBar.classList.add('is-logged-in');
      this.userName.innerText = user.name;
      this.userImage.src = user.imageURL;
    }
  }

  private setListVisibility() {
    if (this.thumbnails.size === 0) {
      this.emptyListElement.classList.remove('hidden');
      this.listElement.classList.add('hidden');
    } else {
      this.emptyListElement.classList.add('hidden');
      this.listElement.classList.remove('hidden');
    }
  }

  private async addThumbnail(record: ImageRecord) {
    const thumb = document.createElement('div');
    thumb.classList.add('element');
    thumb.addEventListener('click', () => router.visit(`/edit/${record.id}`));

    this.thumbnails.set(record.id!, thumb);

    const blob = await record.getThumbnail();
    if (blob) {
      const url = URL.createObjectURL(blob);
      this.blobURLs.add(url);

      if (record.isVideo) {
        // TODO: Currently, `edited` is always an image, but it will be a
        // video. So edited will change from thumbnail to video.
        const videoBlob = await record.getOriginal();
        if (videoBlob) {
          const videoURL = URL.createObjectURL(videoBlob);
          this.blobURLs.add(videoURL);
          const video = document.createElement('video');
          video.muted = true;
          video.src = videoURL;
          video.loop = true;
          video.onloadedmetadata = () => {
            thumb.addEventListener('mouseover', () => video.play());
            thumb.addEventListener('mouseout', () => video.pause());
          };

          video.poster = url;

          thumb.appendChild(video);
          const overlay = document.createElement('svg');
          thumb.appendChild(overlay);

          overlay.outerHTML = `<svg class="video-thumbnail-overlay" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none"></path>
            <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
          </svg>`;

        } else {
          // TODO: Handle this error condition
        }
      } else {
        const image = document.createElement('img');
        image.src = url;
        thumb.appendChild(image);
      }
    } else {
      // TODO: Handle this error condition
    }
    this.listElement.appendChild(thumb);
  }

  private async syncHandler(event: IChangeEvent) {
    switch (event.type) {
      case ChangeType.REMOVE:
        if (this.thumbnails.has(event.id)) {
          this.listElement.removeChild(this.thumbnails.get(event.id)!);
          this.thumbnails.delete(event.id);
        }
        break;
      case ChangeType.ADD:
        this.addThumbnail(await ImageRecord.fromDatabase(event.id));
        break;
      case ChangeType.UPDATE:
        // TODO: Should update the image in place, this is going to swap the order
        if (this.thumbnails.has(event.id)) {
          this.listElement.removeChild(this.thumbnails.get(event.id)!);
        }
        this.addThumbnail(await ImageRecord.fromDatabase(event.id));
        break;
    }
    this.setListVisibility();
  }
}
