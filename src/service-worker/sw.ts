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

// These two lines are here to stop TypeScript from complaining about service
// worker APIs
const scope: ServiceWorkerGlobalScope = (self as any) as ServiceWorkerGlobalScope;
const {clients} = scope;

const VERSION = 2;
console.log(`SW Version ${VERSION}`);

const FILES = [
  '/app.min.js',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-512.png',
];

scope.addEventListener('install', (event: InstallEvent) => {
  event.waitUntil(installHandler(event));
});

scope.addEventListener('activate', (event: ActivateEvent) => {
  clients.claim();
});

scope.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(fetchHandler(event.request));
});

async function installHandler(event: InstallEvent) {
  const cache = await caches.open('snapshot');
  cache.addAll(FILES);
  scope.skipWaiting();
}

async function fetchHandler(request: Request): Promise<Response> {
  if (request.mode === 'navigate') {
    const url = new URL(request.url);
    if (url.origin === location.origin) {
      request = new Request('/index.html');
    }
  }

  if (request.method !== 'GET') {
    return fetch(request);
  }

  if (request.url.match(/googleapis.com/)) {
    return networkFirst(request);
  }

  return cacheFirst(request);
}

async function cacheFirst(request: Request) {
  const cache = await caches.open('snapshot');
  const cacheResult = await cache.match(request);

  if (cacheResult) {
    return cacheResult;
  }

  const fetchResult = await fetch(request);
  if (fetchResult.ok) {
    cache.put(request, fetchResult.clone());
  }
  return fetchResult;
}

async function networkFirst(request: Request) {
  const cache = await caches.open('snapshot');

  let fetchResult = await fetch(request);

  try {
    fetchResult = await fetch(request);
  } catch (e) {
    console.log(`Fetch error: ${e}`);
  }

  if (fetchResult) {
    if (fetchResult.ok) {
      cache.put(request, fetchResult.clone());
    }
    return fetchResult;
  }

  return cache.match(request);
}

