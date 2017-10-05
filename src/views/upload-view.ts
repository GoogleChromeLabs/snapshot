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

import ImageRecord from '../image-record';
import router from '../router';
import View from './view';

export default class UploadView extends View {
  private uploadInput: HTMLInputElement;
  private uploadButton: HTMLButtonElement;
  private uploadDropTarget: HTMLDivElement;
  private closeButton: HTMLButtonElement;

  constructor() {
    super(document.getElementById('upload-view')!);

    this.uploadInput = document.getElementById('upload-file-input')! as HTMLInputElement;
    this.uploadButton = document.getElementById('upload-button')! as HTMLButtonElement;
    this.uploadDropTarget = document.getElementById('upload-drop-target')! as HTMLDivElement;
    this.closeButton = document.getElementById('upload-view-close')! as HTMLButtonElement;

    this.uploadInput.addEventListener('change', () => this.inputChange());
    this.uploadButton.addEventListener('click', () => this.triggerUpload());
    this.uploadDropTarget.addEventListener('drop', (e) => this.dropHandler(e));
    this.uploadDropTarget.addEventListener('dragover', (e) => this.dragOverHandler(e));
    this.closeButton.addEventListener('click', () => this.close());
  }

  inputChange() {
    this.ingest(this.uploadInput.files!);
  }

  triggerUpload() {
    this.uploadInput.click();
  }

  dragOverHandler(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  dropHandler(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();

    this.ingest(e.dataTransfer.files);
  }

  async ingest(files: FileList) {
    if (files.length === 0) {
      return;
    }
    const file = files[0];
    const record = new ImageRecord();
    record.setOriginal(file);
    await record.save();
    router.visit(`/edit/${record.id}`);
  }

  close() {
    router.visit(`/browse`);
  }
}
