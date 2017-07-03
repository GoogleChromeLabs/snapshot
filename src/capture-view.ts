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

const streamConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'user',
    height: {ideal: 1080},
    width: {ideal: 1920},
  },
};

export default class CaptureView extends View {
  private videoElement: HTMLVideoElement;
  private videoElement2: HTMLVideoElement;
  private takePhotoButton: HTMLButtonElement;
  private closeButton: HTMLButtonElement;
  private capture: ImageCapture | null;

  private devicesPromise: Promise<MediaDeviceInfo[]>;
  private currentDevice: MediaDeviceInfo | null;

  constructor() {
    super(document.getElementById('capture-view')!);
    this.videoElement = this.viewElement.querySelector('video#preview')! as HTMLVideoElement;
    this.videoElement2 = this.viewElement.querySelector('video#preview2')! as HTMLVideoElement;
    this.takePhotoButton = document.getElementById('capture-button')! as HTMLButtonElement;
    this.closeButton = document.getElementById('capture-view-close')! as HTMLButtonElement;

    this.videoElement2.classList.add('hidden');

    this.takePhotoButton.addEventListener('click', () => this.takePhoto());
    this.closeButton.addEventListener('click', () => this.close());

    this.devicesPromise = this.getDevices();
    this.currentDevice = null;
  }

  show() {
    this.devicesPromise.then((devices) => {
      this.currentDevice = devices[0];
      this.startStream(devices[0].deviceId);
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

  async getDevices() {
    let devices = await navigator.mediaDevices.enumerateDevices() as MediaDeviceInfo[];
    devices = devices.filter((device) => device.kind === 'videoinput');

    return devices;
  }

  takePhoto() {
    if (this.capture) {
      this.capture.takePhoto().then((blob: Blob) => this.storeResult(blob));
    } else {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      context.drawImage(this.videoElement, 0, 0);

      canvas.toBlob((blob: Blob) => this.storeResult(blob), 'image/jpg');
    }
  }

  close() {
    router.visit(`/browse`);
  }

  private storeResult(blob: Blob) {
    const record = new ImageRecord(blob);
    db.store(record).then((id) => router.visit(`/image/${id}`));
  }

  private stopStream(stream: MediaStream) {
    if (stream) {
      for (const track of stream.getVideoTracks()) {
        track.stop();
      }
    }
  }

  private startStream(deviceId) {
    const current = this.videoElement.srcObject;
    if (current) {
      this.stopStream(current);
    }

    (streamConstraints.video as MediaTrackConstraints).deviceId = deviceId;

    navigator.mediaDevices.getUserMedia(streamConstraints).then((stream) => {
      this.videoElement2.srcObject = stream;
      this.videoElement2.onloadedmetadata = () => {
        const temp = this.videoElement;
        this.videoElement = this.videoElement2;
        this.videoElement2 = temp;
        this.videoElement.play();
        this.videoElement.classList.remove('hidden');
        this.videoElement2.classList.add('hidden');
        this.videoElement2.pause();
      };

      if ('ImageCapture' in window) {
        const track = stream.getVideoTracks()[0];
        this.capture = new ImageCapture(track);
      }
    });

  }
}
