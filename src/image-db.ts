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

const DB_VERSION = 3;

export interface IListRecord {
  id: number | null;
  guid: string;

  originalId: number | null;
  editedId: number | null;
  thumbnailId: number | null;

  transform: {[name: string]: number} | null;
}

interface IMediaRecord {
  media: ArrayBuffer;
  type: string;
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
    const transaction: IDBTransaction = request.transaction;
    const db: IDBDatabase = request.result;

    // Added in version 3, so all paths need to create these stores
    const mediaStore = db.createObjectStore('media', {autoIncrement: true});
    const listStore = db.createObjectStore('list', {keyPath: 'id', autoIncrement: true});

    if (event.oldVersion !== 0) {
      // Can only recover from version 2, version 1 was too different
      if (event.oldVersion === 2) {
        this.upgrade2to3(mediaStore, listStore, transaction);
      } else {
        db.deleteObjectStore('images');
      }
    }
  }

  private upgrade2to3(mediaStore: IDBObjectStore, listStore: IDBObjectStore, transaction: IDBTransaction) {
    const originalStore = transaction.objectStore('images');

    // Get all existing records, move them to correct places
    const readRequest = originalStore.openCursor();
    readRequest.onerror = (reason) => this.error(reason);
    readRequest.onsuccess = () => {
      const cursor = readRequest.result as IDBCursorWithValue;
      if (cursor) {
        interface IOldRecord {
          id: number;
          original: ArrayBuffer;
          edited: ArrayBuffer | null;
          thumbnail: ArrayBuffer | null;
          transform: {[name: string]: number} | null;
        }
        const oldRecord: IOldRecord = cursor.value;

        const listRecord: IListRecord = {
          editedId: null,
          guid: '',
          id: null,
          originalId: null,
          thumbnailId: null,
          transform: oldRecord.transform,
        };

        const originalPut = mediaStore.put(oldRecord.original);
        originalPut.onerror = (reason) => this.error(reason);
        originalPut.onsuccess = () => {
          listRecord.originalId = originalPut.result;

          if (oldRecord.edited) {
            const editedPut = mediaStore.put(oldRecord.edited);
            editedPut.onerror = (reason) => this.error(reason);
            editedPut.onsuccess = () => {
              listRecord.editedId = editedPut.result;
              listStore.put(listRecord);
            };
          } else {
            listStore.put(listRecord);
          }
        };

        cursor.continue();
      } else {
        transaction.db.deleteObjectStore('images');
      }
    };
  }
}

export const imageDB = new ImageDB();
