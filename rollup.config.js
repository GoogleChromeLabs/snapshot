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

import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babili from 'rollup-plugin-babili';
import typescript from 'rollup-plugin-typescript';
import ts from 'typescript';

function glsl() {
  return {
    transform(code, id) {
      if (!/\.glsl$/.test(id)) {
        return;
      }

      const transformedCode = 'export default ' + JSON.stringify(
        code
          .replace( /[ \t]*\/\/.*\n/g, '' )
          .replace( /[ \t]*\/\*[\s\S]*?\*\//g, '' )
          .replace( /\n{2,}/g, '\n' )
      ) + ';';
      return {
        code: transformedCode,
        map: {mappings: ''},
      };
    },
  };
}

export default {
  entry: 'src/index.ts',
  format: 'cjs',
  plugins: [
    typescript({
      typescript: ts,
    }),
    glsl(),
    nodeResolve({jsnext: true}),
    commonjs(),
    babel(),
    babili(),
  ],
  dest: 'dist/app.min.js',
};
