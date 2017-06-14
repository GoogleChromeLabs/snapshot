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

declare class ImageCapture {
  readonly videoStreamTrack: MediaStreamTrack;
  constructor(track: MediaStreamTrack);
  takePhoto(): Promise<Blob>;
  getPhotoCapabilities(): Promise<PhotoCapabilities>;
  setOptions(photoSettings: PhotoSettings | null): Promise<void>;
  grabFrame(): Promise<ImageBitmap>;
}

interface PhotoCapabilities {
  readonly whiteBalanceMode: MeteringMode;
  readonly colorTemperature: MediaSettingsRange;
  readonly exposureMode: MeteringMode;
  readonly exposureCompensation: MediaSettingsRange;
  readonly iso: MediaSettingsRange;
  readonly redEyeReduction: boolean;
  readonly focusMode: MeteringMode;

  readonly brightness: MediaSettingsRange;
  readonly contrast: MediaSettingsRange;
  readonly saturation: MediaSettingsRange;
  readonly sharpness: MediaSettingsRange;
  readonly imageHeight: MediaSettingsRange;
  readonly imageWidth: MediaSettingsRange;
  readonly zoom: MediaSettingsRange;
  readonly fillLightMode: FillLightMode;
}

interface PhotoSettings {
  whiteBalanceMode: MeteringMode;
  colorTemperature: number;
  exposureMode: MeteringMode;
  exposureCompensation: number;
  iso: number;
  redEyeReduction: boolean;
  focusMode: MeteringMode;
  pointsOfInterest: Point2D[];

  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  zoom: number;
  imageHeight: number;
  imageWidth: number;
  fillLightMode: FillLightMode;
}

interface MediaSettingsRange {
  readonly max: number;
  readonly min: number;
  readonly current: number;
  readonly step: number;
}

declare enum FillLightMode {
  "unavailable",
  "auto",
  "off",
  "flash",
  "torch"
}

declare enum MeteringMode {
  "none",
  "manual",
  "single-shot",
  "continuous"
}

interface Point2D {
  x: number;
  y: number;
}
