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
uniform float grey;

vec3 saturationVector = vec3(0.299, 0.587, 0.114);

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

  vec3 desaturated = vec3(dot(saturationVector, tex.rgb));
  vec3 mixed = mix(desaturated, tex.rgb, saturation);
  vec4 color = vec4(mixed, tex.a);
  color.r += warmth;
  color.b -= warmth;

  // This is the dumbest naming ever
  vec3 gray = vec3(grey, grey, grey);

  color.rgb = mix(color.rgb * brightness, mix(gray, color.rgb, contrast), 0.5);

  float ratio = off.x / off.y;
  float dist = sqrt(pow(texCoords.x - 0.5, 2.0) + pow(ratio * (texCoords.y - 0.5), 2.0));
  float vigCurve = exp(-pow(dist, 2.0) / (2.0 * pow(-vignette, 2.0)));

  color.rgb *= vigCurve;

  gl_FragColor = color;
}
