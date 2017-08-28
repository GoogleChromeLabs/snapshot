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
  audio: false,
  video: {
    deviceId: '',
    facingMode: ['user', 'environment'],
    height: {ideal: 1080},
    width: {ideal: 1920},
  },
};

export default class CameraHelper {
  private stream: MediaStream | null;

  constructor() {
    this.stream = null;
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
      return await capture.takePhoto();
    } else {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      return await canvasToBlob(canvas, constants.IMAGE_TYPE);
    }
  }

  stop() {
    this.stopStream();
  }

  stopStream() {
    if (this.stream) {
      for (const track of this.stream.getVideoTracks()) {
        track.stop();
      }
    }
  }

  async startStream(deviceId) {
    this.stopStream();

    (streamConstraints.video as MediaTrackConstraints).deviceId = deviceId;

    const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
    this.stream = stream;
    return stream;
  }
}
