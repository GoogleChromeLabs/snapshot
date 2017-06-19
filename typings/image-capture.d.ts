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
  readonly track: MediaStreamTrack;
  constructor(videoTrack: MediaStreamTrack);
  takePhoto(photoSettings?: PhotoSettings): Promise<Blob>;
  getPhotoCapabilities(): Promise<PhotoCapabilities>;
  getPhotoSettings(): Promise<PhotoSettings>;
  grabFrame(): Promise<ImageBitmap>;
}

interface PhotoCapabilities {
  readonly redEyeReduction: RedEyeReduction;
  readonly imageHeight: MediaSettingsRange;
  readonly imageWidth: MediaSettingsRange;
  readonly fillLightMode: FillLightMode[];
}

interface PhotoSettings {
  fillLightMode: FillLightMode;
  imageHeight: number;
  imageWidth: number;
  redEyeReduction: boolean;
}

interface MediaSettingsRange {
  readonly max: number;
  readonly min: number;
  readonly step: number;
}

declare enum RedEyeReduction {
  "never",
  "always",
  "controllable",
}

declare enum FillLightMode {
  "auto",
  "off",
  "flash",
}

interface MediaTrackSupportedConstraints {
  whiteBalanceMode: boolean;
  exposureMode: boolean;
  focusMode: boolean;
  pointsOfInterest: boolean;

  exposureCompensation: boolean;
  colorTemperature: boolean;
  iso: boolean;

  brightness: boolean;
  contrast: boolean;
  saturation: boolean;
  sharpness: boolean;
  focusDistance: boolean;
  zoom: boolean;
  torch: boolean;
}

interface MediaTrackCapabilities {
  whiteBalanceMode: string[];
  exposureMode: string[];
  focusMode: string[];

  exposureCompensation: MediaSettingsRange;
  colorTemperature: MediaSettingsRange;
  iso: MediaSettingsRange;

  brightness: MediaSettingsRange;
  contrast: MediaSettingsRange;
  saturation: MediaSettingsRange;
  sharpness: MediaSettingsRange;

  focusDistance: MediaSettingsRange;
  zoom: MediaSettingsRange;

  torch: boolean;
}

interface MediaTrackConstraintSet {
  whiteBalanceMode?: ConstrainDOMString;
  exposureMode?: ConstrainDOMString;
  focusMode?: ConstrainDOMString;
  pointsOfInterest?: ConstrainPoint2D;

  exposureCompensation?: ConstrainDouble;
  colorTemperature?: ConstrainDouble;
  iso?: ConstrainDouble;

  brightness?: ConstrainDouble;
  contrast?: ConstrainDouble;
  saturation?: ConstrainDouble;
  sharpness?: ConstrainDouble;

  focusDistance?: ConstrainDouble;
  zoom?: ConstrainDouble;

  torch?: ConstrainBoolean;
}

interface MediaTrackSettings {
  whiteBalanceMode: string;
  exposureMode: string;
  focusMode: string;
  pointsOfInterest: Point2D[];

  exposureCompensation: number;
  colorTemperature: number;
  iso: number;

  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;

  focusDistance: number;
  zoom: number;

  torch: boolean;
}

interface ConstrainPoint2DParameters {
  exact: Point2D[];
  ideal: Point2D[];
}

declare type ConstrainPoint2D = Point2D[] | ConstrainPoint2DParameters;

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
