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

import constants from './constants';
import {canvasToBlob} from './promise-helpers';

const streamConstraints: MediaStreamConstraints = {
  video: {
    deviceId: '',
    facingMode: ['user', 'environment'],
    height: {ideal: 1080},
    width: {ideal: 1920},
  },
};

let supportedConstraints: MediaTrackSupportedConstraints = {};

if (constants.SUPPORTS_MEDIA_DEVICES) {
  supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
}

export default class CameraHelper {
  flash: FillLightMode;

  private stream: MediaStream | null;
  private track: MediaStreamTrack | null;
  private trackConstraints: MediaTrackSettings;
  private photoCapabilities: PhotoCapabilities | null;

  constructor() {
    this.stream = null;
    this.track = null;

    this.photoCapabilities = null;
    this.trackConstraints = {};

    this.flash = 'off';
  }

  async getCameras() {
    let devices: MediaDeviceInfo[] = [];

    if (constants.SUPPORTS_MEDIA_DEVICES) {
      devices = await navigator.mediaDevices.enumerateDevices();
      devices = devices.filter((device) => device.kind === 'videoinput');
    }

    return devices;
  }

  async takePhoto(video: HTMLVideoElement): Promise<Blob | null> {
    if (!constants.SUPPORTS_MEDIA_DEVICES) {
      return null;
    }

    if (constants.SUPPORTS_IMAGE_CAPTURE) {
      const stream = video.srcObject;

      if (!stream) {
        return null;
      }

      const track = stream.getVideoTracks()[0];
      const capture = new ImageCapture(track);
      const settings: PhotoSettings = {};

      if (this.photoCapabilities) {
        if (this.photoCapabilities.fillLightMode.includes(this.flash)) {
          settings.fillLightMode = this.flash;
        }
      }

      return await capture.takePhoto(settings);
    } else {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      return await canvasToBlob(canvas, constants.IMAGE_TYPE);
    }
  }

  stopStream() {
    if (this.stream) {
      for (const track of this.stream.getVideoTracks()) {
        track.stop();
      }
    }
  }

  async startStream(deviceId: string) {
    this.stopStream();

    (streamConstraints.video as MediaTrackConstraints).deviceId = deviceId;

    const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
    this.stream = stream;
    this.track = stream.getVideoTracks()[0];

    if (constants.SUPPORTS_IMAGE_CAPTURE) {
      const capture = new ImageCapture(this.track);
      this.photoCapabilities = await capture.getPhotoCapabilities();
    }

    this.trackConstraints = {};
    return stream;
  }

  getPhotoCapabilities(): {flash: FillLightMode[], redEyeReduction: boolean} {
    if (this.photoCapabilities) {
      return {
        flash: this.photoCapabilities.fillLightMode,
        redEyeReduction: this.photoCapabilities.redEyeReduction === 'controllable',
      };
    }

    return {
      flash: [],
      redEyeReduction: false,
    };
  }

  getSettings(): MediaTrackSettings {
    if (!this.track || !this.track.getSettings) {
      return {};
    }
    return this.track.getSettings();
  }
}
