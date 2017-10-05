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

import CameraHelper from '../camera-helper';
import constants from '../constants';
import db from '../image-db';
import ImageRecord from '../image-record';
import {blobToArrayBuffer} from '../promise-helpers';
import router from '../router';
import ViewState from '../view-state';
import View from './view';

export default class CaptureView extends View {
  private videoElement: HTMLVideoElement;
  private videoElement2: HTMLVideoElement;
  private takePhotoButton: HTMLButtonElement;
  private cameraChooseButton: HTMLButtonElement;
  private mirrorButton: HTMLButtonElement;
  private flashButton: HTMLButtonElement;
  private closeButton: HTMLButtonElement;

  private cameraHelper: CameraHelper;

  private devicesPromise: Promise<MediaDeviceInfo[]>;
  private currentDevice: MediaDeviceInfo | null;

  constructor() {
    super(document.getElementById('capture-view')!);
    this.videoElement = this.viewElement.querySelector('video#preview')! as HTMLVideoElement;
    this.videoElement2 = this.viewElement.querySelector('video#preview2')! as HTMLVideoElement;
    this.takePhotoButton = document.getElementById('capture-button')! as HTMLButtonElement;
    this.cameraChooseButton = document.getElementById('camera-choose-button')! as HTMLButtonElement;
    this.mirrorButton = document.getElementById('capture-mirror-button')! as HTMLButtonElement;
    this.flashButton = document.getElementById('capture-flash-button')! as HTMLButtonElement;
    this.closeButton = document.getElementById('capture-view-close')! as HTMLButtonElement;

    this.videoElement2.classList.add('hidden');

    this.cameraHelper = new CameraHelper();

    this.takePhotoButton.addEventListener('click', () => this.takePhoto());
    this.cameraChooseButton.addEventListener('click', () => this.toggleCameraChooser());
    this.mirrorButton.addEventListener('click', () => this.toggleMirror());
    this.flashButton.addEventListener('click', () => this.toggleFlash());
    this.closeButton.addEventListener('click', () => this.close());

    this.devicesPromise = this.getDevices();
    this.currentDevice = null;
  }

  show() {
    this.devicesPromise.then((devices) => {
      this.chooseCamera(devices[0]);
    });
    super.show();
  }

  hide() {
    this.cameraHelper.stopStream();
    this.videoElement.pause();
    super.hide();
  }

  async getDevices() {
    const cameras = await this.cameraHelper.getCameras();

    if (cameras.length < 2) {
      this.cameraChooseButton.classList.add('hidden');
    } else {
      this.cameraChooseButton.classList.remove('hidden');
    }

    return cameras;
  }

  async takePhoto() {
    const blob = await this.cameraHelper.takePhoto(this.videoElement);
    if (blob) {
      this.storeResult(blob);
    } else {
      // TODO: This is an unhandled error condition
    }
  }

  async toggleCameraChooser() {
    // Four possible cases
    // 1. No camera! This view shouldn't even come up, we need a fallback UI
    // 2. One camera. Button should be hidden.
    // 3. Two cameras. Clicking button is a simple toggle.
    // 4. Three or more cameras. Present a chooser with the names and/or
    //    features of the cameras.
    // TODO: Need to change the button to reflect the kind of camera that will
    // be selected.
    // TODO: Need to decide what happens if we change camera while recording
    const devices = await this.devicesPromise;
    if (devices.length < 2) {
      return;
    }

    if (this.currentDevice) {
      const currentIndex = devices.indexOf(this.currentDevice);

      // TODO: Should show chooser for many devices, not just cycle
      this.chooseCamera(devices[(currentIndex + 1) % devices.length]);
    } else {
      this.chooseCamera(devices[0]);
    }
  }

  close() {
    router.visit(`/browse`);
  }

  private async chooseCamera(camera: MediaDeviceInfo) {
    this.currentDevice = camera;
    await this.startStream(this.currentDevice.deviceId);
    const photoCapabilities = this.cameraHelper.getPhotoCapabilities();
    const settings = this.cameraHelper.getSettings();
    if (settings.facingMode === 'user') {
      this.videoElement.classList.add('mirror');
    } else {
      this.videoElement.classList.remove('mirror');
    }
    this.flashButton.classList.remove('flash-flash', 'flash-off', 'flash-auto');
    this.flashButton.classList.add(`flash-${this.cameraHelper.flash}`);
    if (photoCapabilities.flash.length > 0) {
      this.flashButton.classList.remove('hidden');
    } else {
      this.flashButton.classList.add('hidden');
    }
  }

  private async storeResult(blob: Blob) {
    const buffer = await blobToArrayBuffer(blob);
    const record = new ImageRecord(buffer);
    const id = await db.store(record);
    router.visit(`/edit/${id}`);
  }

  private async startStream(deviceId: string) {
    const stream = await this.cameraHelper.startStream(deviceId);
    this.videoElement2.srcObject = stream;
    return new Promise((resolve) => {
      this.videoElement2.onloadedmetadata = () => {
        const temp = this.videoElement;
        this.videoElement = this.videoElement2;
        this.videoElement2 = temp;
        this.videoElement.play();
        this.videoElement.classList.remove('hidden');
        this.videoElement2.classList.add('hidden');
        this.videoElement2.pause();
        resolve();
      };
    });
  }

  private toggleMirror() {
    this.videoElement.classList.toggle('mirror');
  }

  private toggleFlash() {
    this.flashButton.classList.remove(`flash-${this.cameraHelper.flash}`);
    const photoCapabilities = this.cameraHelper.getPhotoCapabilities();
    let index = photoCapabilities.flash.indexOf(this.cameraHelper.flash);
    index = (index + 1) % photoCapabilities.flash.length;
    this.cameraHelper.flash = photoCapabilities.flash[index];
    this.flashButton.classList.add(`flash-${this.cameraHelper.flash}`);
  }
}
