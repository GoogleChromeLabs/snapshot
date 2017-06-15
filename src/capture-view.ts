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

const streamConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    height: {ideal: 1080},
    width: {ideal: 1920},
  },
};

class CaptureViewState extends ViewState {
}

export default class CaptureView implements View {
  private viewElement: HTMLElement;
  private videoElement: HTMLVideoElement;
  private buttonElement: HTMLButtonElement;
  private capture: ImageCapture;

  constructor() {
    this.viewElement = document.getElementById('capture-view')!;
    this.videoElement = this.viewElement.querySelector('video#capture-preview')! as HTMLVideoElement;
    this.buttonElement = document.getElementById('capture-button')! as HTMLButtonElement;

    this.buttonElement.addEventListener('click', () => this.takePhoto());
  }

  show(state: CaptureViewState) {
    // TODO: navigator.mediaDevices.enumerateDevices() method, then
    // set deviceId in getUserMedia() constraints to pick camera
    navigator.mediaDevices.getUserMedia(streamConstraints).then((stream) => {
      this.videoElement.srcObject = stream;

      const track = stream.getVideoTracks()[0];
      this.capture = new ImageCapture(track);
    });

    this.viewElement.style.display = 'block';
  }

  hide() {
    // TODO: Tear down video and stream
    // (this.videoElement.srcObject as MediaStream).stop();
    this.capture.track.stop();
    this.viewElement.style.display = 'none';
  }

  getState() {
    return new CaptureViewState();
  }

  takePhoto() {
    this.capture.takePhoto().then((blob: Blob) => {
      // TODO: Need a way to come up with an ID
      db.store(blob).then((id) => router.visit(`/image/${id}`));
    });
  }
}
