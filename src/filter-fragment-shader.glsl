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

precision highp float;

varying vec2 texCoords;

uniform sampler2D textureSampler;
uniform vec2 sourceSize;
uniform float saturation;
uniform float warmth;
uniform float sharpen;
uniform float brightness;
uniform float contrast;

vec3 HSVFromRGB(vec3 rgb) {
  float h;
  float s;
  float v;

  float cmax = max(max(rgb.r, rgb.g), rgb.b);
  float cmin = min(min(rgb.r, rgb.g), rgb.b);
  float delta = cmax - cmin;

  // H
  if (delta == 0.0) {
    h = 0.0;
  } else if (cmax == rgb.r) {
    float part = (rgb.g - rgb.b) / delta;
    if (part > 6.0) {
      part -= 6.0;
    }
    h = 60.0 * part;
  } else if (cmax == rgb.g) {
    h = 60.0 * (((rgb.b - rgb.r) / delta) + 2.0);
  } else if (cmax == rgb.b) {
    h = 60.0 * (((rgb.r - rgb.g) / delta) + 4.0);
  }

  // S
  if (cmax == 0.0) {
    s = 0.0;
  } else {
    s = delta / cmax;
  }

  // V
  v = cmax;

  return vec3(h, s, v);
}

vec3 RGBFromHSV(vec3 hsv) {
  float c = hsv.y * hsv.z;
  float a = hsv.x / 60.0;
  if (a > 2.0) {
    a -= 2.0;
  }
  if (a > 2.0) {
    a -= 2.0;
  }
  float b = abs(a - 1.0);
  float x = c * (1.0 - b);
  vec3 m = vec3(hsv.z - c);

  vec3 rgb;
  if (hsv.x < 60.0) {
    rgb = vec3(c, x, 0.0);
  } else if (hsv.x < 120.0) {
    rgb = vec3(x, c, 0.0);
  } else if (hsv.x < 180.0) {
    rgb = vec3(0.0, c, x);
  } else if (hsv.x < 240.0) {
    rgb = vec3(0.0, x, c);
  } else if (hsv.x < 300.0) {
    rgb = vec3(x, 0.0, c);
  } else {
    rgb = vec3(c, 0.0, x);
  }

  return rgb + m;
}

void main() {
  vec4 tex = texture2D(textureSampler, texCoords);

  vec4 texa = texture2D(textureSampler, texCoords + vec2(-sourceSize.x, -sourceSize.y));
  vec4 texb = texture2D(textureSampler, texCoords + vec2(0.0, -sourceSize.y));
  vec4 texc = texture2D(textureSampler, texCoords + vec2(sourceSize.x, -sourceSize.y));
  vec4 texd = texture2D(textureSampler, texCoords + vec2(-sourceSize.x, 0.0));
  vec4 texe = texture2D(textureSampler, texCoords + vec2(0.0, 0.0));
  vec4 texf = texture2D(textureSampler, texCoords + vec2(sourceSize.x, 0.0));
  vec4 texg = texture2D(textureSampler, texCoords + vec2(-sourceSize.x, sourceSize.y));
  vec4 texh = texture2D(textureSampler, texCoords + vec2(0.0, sourceSize.y));
  vec4 texi = texture2D(textureSampler, texCoords + vec2(sourceSize.x, sourceSize.y));

  // Blur
  vec4 blur = texa + 2.0 * texb + texc + 2.0 * texd + 4.0 * texe + 2.0 * texf + texg + 2.0 * texh + texi;
  blur /= 16.0;

  tex += (tex - blur) * sharpen;

  vec3 hsv = HSVFromRGB(tex.rgb);
  hsv.y = hsv.y * saturation;
  vec4 color = vec4(RGBFromHSV(hsv), tex.a);
  color.r += warmth;
  color.b -= warmth;

  vec4 gray = vec4(0.5, 0.5, 0.5, 1);
  color = mix(color * brightness, mix(gray, color, contrast), 0.5);

  float dist = 2.0 * max(abs(0.5 - texCoords.y) - 0.05, 0.0);

  color.a = 1.0;

  gl_FragColor = color;
}
