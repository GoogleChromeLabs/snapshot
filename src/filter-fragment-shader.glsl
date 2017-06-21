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
uniform float blur;
uniform float vignette;

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
  vec2 off = sourceSize * blur;
  vec2 off2 = off * 2.0;

  // Why isn't this a loop? Some graphics chips can get be very slow if they
  // can't tell at compile time which texture reads are needed
  vec4 tex00 = texture2D(textureSampler, texCoords + vec2(-off2.x, -off2.y));
  vec4 tex10 = texture2D(textureSampler, texCoords + vec2(-off.x, -off2.y));
  vec4 tex20 = texture2D(textureSampler, texCoords + vec2(0.0, -off2.y));
  vec4 tex30 = texture2D(textureSampler, texCoords + vec2(off.x, -off2.y));
  vec4 tex40 = texture2D(textureSampler, texCoords + vec2(off2.x, -off2.y));

  vec4 tex01 = texture2D(textureSampler, texCoords + vec2(-off2.x, -off.y));
  vec4 tex11 = texture2D(textureSampler, texCoords + vec2(-off.x, -off.y));
  vec4 tex21 = texture2D(textureSampler, texCoords + vec2(0.0, -off.y));
  vec4 tex31 = texture2D(textureSampler, texCoords + vec2(off.x, -off.y));
  vec4 tex41 = texture2D(textureSampler, texCoords + vec2(off2.x, -off.y));

  vec4 tex02 = texture2D(textureSampler, texCoords + vec2(-off2.x, 0.0));
  vec4 tex12 = texture2D(textureSampler, texCoords + vec2(-off.x, 0.0));
  vec4 tex22 = texture2D(textureSampler, texCoords + vec2(0.0, 0.0));
  vec4 tex32 = texture2D(textureSampler, texCoords + vec2(off.x, 0.0));
  vec4 tex42 = texture2D(textureSampler, texCoords + vec2(off2.x, 0.0));

  vec4 tex03 = texture2D(textureSampler, texCoords + vec2(-off2.x, off.y));
  vec4 tex13 = texture2D(textureSampler, texCoords + vec2(-off.x, off.y));
  vec4 tex23 = texture2D(textureSampler, texCoords + vec2(0.0, off.y));
  vec4 tex33 = texture2D(textureSampler, texCoords + vec2(off.x, off.y));
  vec4 tex43 = texture2D(textureSampler, texCoords + vec2(off2.x, off.y));

  vec4 tex04 = texture2D(textureSampler, texCoords + vec2(-off2.x, off2.y));
  vec4 tex14 = texture2D(textureSampler, texCoords + vec2(-off.x, off2.y));
  vec4 tex24 = texture2D(textureSampler, texCoords + vec2(0.0, off2.y));
  vec4 tex34 = texture2D(textureSampler, texCoords + vec2(off.x, off2.y));
  vec4 tex44 = texture2D(textureSampler, texCoords + vec2(off2.x, off2.y));

  vec4 tex = tex22;

  // Blur
  vec4 blurred = 1.0 * tex00 + 4.0 * tex10 + 6.0 * tex20 + 4.0 * tex30 + 1.0 * tex40
               + 4.0 * tex01 + 16.0 * tex11 + 24.0 * tex21 + 16.0 * tex31 + 4.0 * tex41
               + 6.0 * tex02 + 24.0 * tex12 + 36.0 * tex22 + 24.0 * tex32 + 6.0 * tex42
               + 4.0 * tex03 + 16.0 * tex13 + 24.0 * tex23 + 16.0 * tex33 + 4.0 * tex43
               + 1.0 * tex04 + 4.0 * tex14 + 6.0 * tex24 + 4.0 * tex34 + 1.0 * tex44;
  blurred /= 256.0;

  tex += (tex - blurred) * sharpen;

  vec3 hsv = HSVFromRGB(tex.rgb);
  hsv.y = hsv.y * saturation;
  vec4 color = vec4(RGBFromHSV(hsv), tex.a);
  color.r += warmth;
  color.b -= warmth;

  vec4 gray = vec4(0.5, 0.5, 0.5, 1);
  color = mix(color * brightness, mix(gray, color, contrast), 0.5);

  float dist = sqrt(pow(texCoords.x - 0.5, 2.0) + pow(texCoords.y - 0.5, 2.0));
  dist = max(0.0, dist - 0.2);

  color *= 1.0 - (dist * vignette);

  color.a = 1.0;

  gl_FragColor = color;
}
