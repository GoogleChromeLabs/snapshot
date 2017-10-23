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

declare type EventHandler = (event: Event) => any;

declare class MediaRecorder extends EventTarget {
  readonly stream: MediaStream;
  readonly mimeType: string;
  readonly state: RecordingState;
  onstart: (event: Event) => any;
  onstop: (event: Event) => any;
  ondataavailable: (event: BlobEvent) => any;
  onpause: (event: Event) => any;
  onresume: (event: Event) => any;
  onerror: (event: MediaRecorderErrorEvent) => any;
  readonly videoBitsPerSecond: number;
  readonly audioBitsPerSecond: number;

  constructor(stream: MediaStream, options?: MediaRecorderOptions);

  start(timeslice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  requestData(): void;

  static isTypeSupported(type: string): boolean;
}

interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

declare type RecordingState = "inactive" | "recording" | "paused";

declare class BlobEvent extends Event {
  readonly data: Blob;
  readonly timecode: number;

  constructor(type: string, eventInitDict: BlobEventInit);
}

interface BlobEventInit {
  data: Blob;
  timecode?: number;
}

interface MediaRecorderErrorEventInit extends EventInit {
  error: DOMException;
}

declare class MediaRecorderErrorEvent extends Event {
  readonly error: DOMException;

  constructor(type: string, eventInitDict: MediaRecorderErrorEventInit);
}
