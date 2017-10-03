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

import ImageRecord from './image-record';

const DB_VERSION = 2;

class ImageDB {
  private dbPromise: Promise<IDBDatabase>;
  private dbResolve: (value: IDBDatabase) => void;
  private dbReject: (reason: any) => void;

  constructor() {
    const request = indexedDB.open('image-db', DB_VERSION);

    this.dbPromise = new Promise((resolve, reject) => {
      this.dbResolve = resolve;
      this.dbReject = reject;

      request.onerror = (reason) => this.dbReject(reason);
      request.onupgradeneeded = (event) => this.createObjectStore(event);
      request.onsuccess = (event) => this.dbOpened(request);
    });
  }

  /**
   * Store an image in the database. If the `id` property of the record is not
   * set, this will create a new entry. Returns the ID of the record.
   */
  store(record: ImageRecord): Promise<number> {
    const promise: Promise<number> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['images'], 'readwrite');
        const put = transaction.objectStore('images').put(record);

        put.onsuccess = (event) => resolve(put.result);
        put.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  retrieve(id: number): Promise<ImageRecord> {
    const promise: Promise<ImageRecord> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['images'], 'readonly');
        const get = transaction.objectStore('images').get(id);

        get.onsuccess = (event) => resolve(get.result);
        get.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  all(): Promise<ImageRecord[]> {
    const promise: Promise<ImageRecord[]> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['images'], 'readonly');
        const open = transaction.objectStore('images').openCursor();
        const results: ImageRecord[] = [];

        open.onsuccess = (event) => {
          const cursor = open.result as IDBCursorWithValue;

          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        open.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  private dbOpened(request: IDBOpenDBRequest) {
    this.dbResolve(request.result);
    this.dbPromise.then((db) => {
      db.onerror = (reason) => this.error(reason);
    });
  }

  private error(reason: Event) {
    console.error(reason);
  }

  private createObjectStore(event: IDBVersionChangeEvent) {
    const request: IDBOpenDBRequest = event.target as IDBOpenDBRequest;
    const db: IDBDatabase = request.result;

    switch (event.oldVersion) {
      case 1:
        db.deleteObjectStore('images');
      case 0:
        db.createObjectStore('images', {keyPath: 'id', autoIncrement: true});
    }
  }
}

export default new ImageDB();
