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

import Capture from './capture';
import ImageDB from './image-db';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

const video = document.getElementById('capture-preview')! as HTMLVideoElement;
const button = document.getElementById('capture-button')! as HTMLButtonElement;
const outputImage = document.getElementById('output-image')! as HTMLImageElement;

const db = new ImageDB();
const capture = new Capture(video);
capture.start();

button.addEventListener('click', () => {
  capture.takePhoto().then((blob: Blob) => {
    video.style.display = 'none';
    outputImage.style.display = 'inline';
    outputImage.onload = () => { URL.revokeObjectURL(outputImage.src); };
    outputImage.src = URL.createObjectURL(blob);

    db.store(blob, 'photo');
  });
});
