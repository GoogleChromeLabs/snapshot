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

export default class VideoRecording {
  private readonly source: MediaStream;
  private recorder: MediaRecorder | null;
  private endPromise: Promise<undefined> | null;
  private data: Blob[];

  constructor(source: MediaStream) {
    this.source = source;
    this.recorder = null;
    this.endPromise = null;
    this.data = [];
  }

  start() {
    if (!constants.SUPPORTS_MEDIA_RECORDER) {
      return;
    }
    // TODO: Do I need to check that the stream is ready?
    this.recorder = new MediaRecorder(this.source, {mimeType: constants.VIDEO_TYPE});
    this.data = [];
    this.recorder.addEventListener('dataavailable', (e: BlobEvent) => {
      this.data.push(e.data);
    });
    this.endPromise = new Promise((resolve, reject) => {
      if (!this.recorder) {
        return resolve();
      }

      this.recorder.addEventListener('stop', () => {
        resolve();
      });
    });
    this.recorder.start();
  }

  async end() {
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
    }
    await this.endPromise;
    const result = new Blob(this.data, {type: constants.VIDEO_TYPE});
    this.recorder = null;
    this.data = [];
    this.endPromise = null;
    return result;
  }

  cancel() {
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
    }
    this.recorder = null;
    this.data = [];
  }
}
