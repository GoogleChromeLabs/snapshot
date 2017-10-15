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

declare interface ServiceWorkerGlobalScope {
  fetch(url: string | Request): Promise<Response>;
  caches: CacheStorage;
  clients: Clients;
  addEventListener(type: string, listener: Function, useCapture?: boolean): void;
  removeEventListener(type: string, listener: Function, last?: any): void;
  registration: ServiceWorkerRegistration;
  importScripts(scripts: string): void;
  skipWaiting(): Promise<void>;
}

declare interface InstallEvent extends ExtendableEvent {}

declare interface ActivateEvent extends ExtendableEvent {}

declare interface FetchEvent extends ExtendableEvent {
  request: Request;
  isReload: boolean;
  clientId: string;
  respondWith(response: Promise<Response>): void;
}

declare interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

declare interface PushMessageData {
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
  json(): Object;
  text(): string;
}

declare interface PushEvent extends ExtendableEvent {
    data: PushMessageData;
}

declare interface CacheOptions {
  ignoreSearch?: boolean;
  ignoreMethod?: boolean;
  ignoreVary?: boolean;
  cacheName?: string;
}

declare interface ExtendableEvent {
  waitUntil(promise: Promise<any>): void;
}

declare interface Client {
  postMessage(message: any, transfer?: any[]): void;
  readonly id: string;
  readonly url: string;
  readonly frameType: "auxiliary" | "top-level" | "nested" | "none";
}

declare interface Clients {
  get(id: string): Promise<Client>;
  matchAll(options?: ClientsMatchAllOptions): Promise<Client[]>;
  openWindow(url: string): Promise<Client>;
  claim(): Promise<void>;
}

declare interface ClientsMatchAllOptions {
  includeUncontrolled?: boolean;
  type?: "window" | "worker" | "sharedworker" | "all";
}

declare interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

declare interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}
