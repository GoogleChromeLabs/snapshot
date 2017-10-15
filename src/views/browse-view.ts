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

    this.blobURLs = new Set();

    pubsub.subscribe('login', () => this.authChanged());
    pubsub.subscribe('logout', () => this.authChanged());
  }

  async show() {
    const photos = await ImageRecord.getAll();

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

        const blob = await record.getThumbnail();
        if (blob) {
          const url = URL.createObjectURL(blob);
          const image = document.createElement('img');
          image.src = url;
          thumb.appendChild(image);
          this.blobURLs.add(url);
        } else {
          // TODO: Handle this error condition
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

  loginClick() {
    login();
  }

  logoutClick() {
    logout();
  }

  authChanged() {
    if (user.id === '') {
      this.loginBar.classList.remove('logged-in');
      this.loginBar.classList.add('logged-out');
    } else {
      this.loginBar.classList.add('logged-in');
      this.loginBar.classList.remove('logged-out');
      this.userName.innerText = user.name;
      this.userImage.src = user.imageURL;
    }
  }
}
