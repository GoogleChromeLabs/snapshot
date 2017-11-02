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

const el = document.getElementById('toaster');

if (!el || !(el instanceof HTMLDivElement)) {
  throw new Error(`Couldn't get the toaster element!`);
}

const toaster = el! as HTMLDivElement;

export function show(message: string, sticky: boolean = false) {
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.innerText = message;

  const dismiss = () => {
    toast.addEventListener('transitionend', () => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    });
    toast.classList.add('disappearing');
  };

  if (sticky) {
    const dismissAction = document.createElement('button');
    dismissAction.innerText = 'Dismiss';
    dismissAction.addEventListener('click', dismiss);
    toast.appendChild(dismissAction);
  } else {
    setTimeout(dismiss, 2000);
  }
  toaster.appendChild(toast);
}
