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

const random = (min: number, max: number): number => {
  let result = Math.random();
  result *= (max - min);
  result += min;
  return result;
};

export default class FilterTransform {
  saturation: number;
  warmth: number;
  sharpen: number;
  blur: number;
  brightness: number;
  contrast: number;
  grey: number;
  vignette: number;

  constructor() {
    this.saturation = 1;
    this.warmth = 0;
    this.sharpen = 0;
    this.blur = 1;
    this.brightness = 1;
    this.contrast = 1;
    this.grey = 0.5;
    this.vignette = 2;
  }

  // This allows us to `for (... of ...)` over the filters
  // I really feel like there should be a simpler/clearer way to express this
  [Symbol.iterator]() {
    return function*() {
      yield ['saturation', this.saturation];
      yield ['warmth', this.warmth];
      yield ['sharpen', this.sharpen];
      yield ['blur', this.blur];
      yield ['brightness', this.brightness];
      yield ['contrast', this.contrast];
      yield ['grey', this.grey];
      yield ['vignette', this.vignette];
    }.bind(this)();
  }

  randomize() {
    this.saturation = random(0, 2);
    this.warmth = random(-0.08, 0.08);
    this.sharpen = random(-2, 2);
    this.blur = random(0.01, 4);
    this.brightness = random(0, 2);
    this.contrast = random(0, 2);
    this.grey = random(0, 1);
    this.vignette = random(0.2, 2);
  }
}
