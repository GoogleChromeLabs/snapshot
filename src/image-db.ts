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

import {blobToArrayBuffer} from './promise-helpers';

const DB_VERSION = 4;

export interface IListRecord {
  id: number | null;
  guid: string;
  isVideo: boolean;

  originalId: number | null;
  editedId: number | null;
  thumbnailId: number | null;

  transform: INumDict | null;

  localFilterChanges: boolean;
  localImageChanges: boolean;
  lastSyncVersion: number;
}

interface IMediaRecord {
  media: ArrayBuffer;
  type: string;
}

export interface ISyncRecord {
  id: number;
  guid: string;
  upload: boolean;
  includeMedia: boolean;
}

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
   * Store an image record in the database. If the `id` property of the
   * record is not set, this will create a new entry. Returns the ID of the
   * record.
   */
  storeRecord(record: IListRecord): Promise<number> {
    if (record.id === null) {
      delete record.id;
    }
    const promise: Promise<number> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['list'], 'readwrite');
        const put = transaction.objectStore('list').put(record);

        put.onsuccess = (event) => resolve(put.result);
        put.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  retrieveRecord(id: number): Promise<IListRecord> {
    const promise: Promise<IListRecord> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['list'], 'readonly');
        const get = transaction.objectStore('list').get(id);

        get.onsuccess = (event) => resolve(get.result);
        get.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  deleteRecord(id: number, mediaIds: number[] = []): Promise<void> {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['list', 'media'], 'readwrite');

        for (const mediaId of mediaIds) {
          transaction.objectStore('media').delete(mediaId);
        }
        transaction.objectStore('list').delete(id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  async storeMedia(media: Blob, id?: number): Promise<number> {
    const buffer = await blobToArrayBuffer(media);
    const record = {
      media: buffer,
      type: media.type,
    };
    const promise: Promise<number> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['media'], 'readwrite');
        const put = transaction.objectStore('media').put(record, id);

        put.onsuccess = (event) => resolve(put.result);
        put.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  retrieveMedia(id: number): Promise<Blob> {
    const promise: Promise<Blob> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['media'], 'readonly');
        const get = transaction.objectStore('media').get(id);

        get.onsuccess = (event) => {
          const record = get.result as IMediaRecord;
          const blob = new Blob([record.media], {type: record.type});
          resolve(blob);
        };
        get.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  addSync(data: ISyncRecord): Promise<void> {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      if (!data.id && !data.guid) {
        return reject('Neither local nor remote id was given');
      }
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['sync'], 'readwrite');
        const put = transaction.objectStore('sync').put(data);
        put.onsuccess = () => resolve();
        put.onerror = reject;
      }).catch(reject);
    });
    return promise;
  }

  removeSync(id: number, guid: string): Promise<void> {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        if (!id && !guid) {
          return reject('Neither local nor remote id was given');
        }
        const key: IDBArrayKey = [id, guid];
        const transaction = db.transaction(['sync'], 'readwrite');
        transaction.objectStore('sync').delete(key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  listSync(): Promise<ISyncRecord[]> {
    const promise: Promise<ISyncRecord[]> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['sync'], 'readonly');
        const open = transaction.objectStore('sync').openCursor();
        const results: ISyncRecord[] = [];

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

  setMeta(key: string, value: any): Promise<void> {
    const promise: Promise<void> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['metadata'], 'readwrite');
        const put = transaction.objectStore('metadata').put(value, key);
        put.onsuccess = () => resolve();
        put.onerror = reject;
      }).catch(reject);
    });
    return promise;
  }

  getMeta(key: string): Promise<any> {
    const promise: Promise<any> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const get = transaction.objectStore('metadata').get(key);
        get.onsuccess = () => resolve(get.result);
        get.onerror = reject;
      }).catch(reject);
    });

    return promise;
  }

  all(): Promise<IListRecord[]> {
    const promise: Promise<IListRecord[]> = new Promise((resolve, reject) => {
      this.dbPromise.then((db) => {
        const transaction = db.transaction(['list'], 'readonly');
        const open = transaction.objectStore('list').openCursor();
        const results: IListRecord[] = [];

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

    if (event.oldVersion < 3) {
      if (event.oldVersion !== 0) {
        db.deleteObjectStore('images');
      }

      db.createObjectStore('media', {autoIncrement: true});
      db.createObjectStore('list', {keyPath: 'id', autoIncrement: true});
    }

    if (event.oldVersion < 4) {
      db.createObjectStore('metadata');
      db.createObjectStore('sync', {keyPath: ['id', 'guid']});
    }
  }
}

export const imageDB = new ImageDB();
