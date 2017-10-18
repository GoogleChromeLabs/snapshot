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

export function dataUrlToArrayBuffer(dataURI: string): ArrayBuffer {
  const byteString = atob(dataURI.split(',')[1]);
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }
  return ia.buffer as ArrayBuffer;
}

export async function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  if (canvas.toBlob) {
    const result: Promise<Blob> = new Promise((resolve) => {
      canvas.toBlob((blob: Blob) => resolve(blob), type);
    });
    return result;
  } else {
    const dataURL = canvas.toDataURL(type);
    const buffer = dataUrlToArrayBuffer(dataURL);
    return new Blob([buffer], {type});
  }
}

export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', async (e: ProgressEvent) => {
      resolve(reader.result);
    });
    reader.addEventListener('error', reject);
    reader.readAsArrayBuffer(blob);
  });
}
