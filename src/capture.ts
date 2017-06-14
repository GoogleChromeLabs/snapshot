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

const streamConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    height: {ideal: 1080},
    width: {ideal: 1920},
  },
};

export default class Capture {
  videoElement: HTMLVideoElement;
  capture: ImageCapture;

  constructor(videoElement) {
    this.videoElement = videoElement;
  }

  start(): Promise<void> {
    // TODO: navigator.mediaDevices.enumerateDevices() method, then
    // set deviceId in getUserMedia() constraints to pick camera
    return navigator.mediaDevices.getUserMedia(streamConstraints).then((stream) => {
      this.videoElement.srcObject = stream;

      const track = stream.getVideoTracks()[0];
      this.capture = new ImageCapture(track);
    });
  }

  takePhoto() {
    return this.capture.takePhoto();
  }
}
