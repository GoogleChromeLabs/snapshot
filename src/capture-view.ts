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
    facingMode: 'user',
  },
};

export default class CaptureView extends View {
  private videoElement: HTMLVideoElement;
  private buttonElement: HTMLButtonElement;
  private capture: ImageCapture | null;

  constructor() {
    super(document.getElementById('capture-view')!);
    this.videoElement = this.viewElement.querySelector('video#capture-preview')! as HTMLVideoElement;
    this.buttonElement = document.getElementById('capture-button')! as HTMLButtonElement;

    this.buttonElement.addEventListener('click', () => this.takePhoto());
  }

  show() {
    navigator.mediaDevices.enumerateDevices().then((devices: MediaDeviceInfo[]) => {
      devices = devices.filter((device) => device.kind === 'videoinput');

      // TODO: navigator.mediaDevices.enumerateDevices() method, then
      // set deviceId in getUserMedia() constraints to pick camera
      navigator.mediaDevices.getUserMedia(streamConstraints).then((stream) => {
        this.videoElement.srcObject = stream;
        this.videoElement.onloadedmetadata = () => this.videoElement.play();

        let mirror = false;

        if ('ImageCapture' in window) {
          const track = stream.getVideoTracks()[0];
          const constraints = track.getConstraints();

          if (constraints.facingMode === 'user') {
            mirror = true;
          }

          this.capture = new ImageCapture(track);
        }

        if (mirror) {
          this.videoElement.classList.add('mirror');
        } else {
          this.videoElement.classList.remove('mirror');
        }
      });
    });
    super.show();
  }

  hide() {
    // TODO: Tear down video and stream
    if (this.capture) {
      this.capture.track.stop();
    }
    this.videoElement.pause();
    super.hide();
  }

  takePhoto() {
    if (this.capture) {
      this.capture.takePhoto().then((blob: Blob) => {
        db.store(blob).then((id) => router.visit(`/image/${id}`));
      });
    } else {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      context.drawImage(this.videoElement, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          db.store(blob).then((id) => router.visit(`/image/${id}`));
        } else {
          // TODO: something?
        }
      }, 'image/jpg');
    }
  }
}
