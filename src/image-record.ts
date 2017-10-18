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

import constants from './constants';
import FilterTransform from './filters/filter-transform';
import {IListRecord, imageDB} from './image-db';
import {canvasToBlob} from './promise-helpers';

enum ImageState {
  NOT_LOADED,  // Haven't looked for it in IndexedDB yet
  LOADED,      // Version in memory is the same as in IDB
  CHANGED,     // Version in memory is different from IDB
  OUT_OF_DATE, // Version in memory does not reflect the original and/or transform
}

export default class ImageRecord {
  static async fromDatabase(id: number) {
    const data = await imageDB.retrieveRecord(id);
    return ImageRecord.fromListRecord(data);
  }

  static fromListRecord(data: IListRecord) {
    const result = new ImageRecord();

    result.id = data.id;
    result.guid = data.guid;

    result.originalState = ImageState.NOT_LOADED;
    result.editedState = ImageState.NOT_LOADED;
    result.thumbnailState = ImageState.NOT_LOADED;

    result.originalId = data.originalId;
    result.editedId = data.editedId;
    result.thumbnailId = data.thumbnailId;

    result.transform = FilterTransform.from(data.transform);

    result.localImageChanges = data.localImageChanges;
    result.localFilterChanges = data.localFilterChanges;
    result.lastSyncVersion = data.lastSyncVersion;

    return result;
  }

  static async getAll(): Promise<ImageRecord[]> {
    const records = await imageDB.all();
    const result: ImageRecord[] = [];

    for (const record of records) {
      result.push(ImageRecord.fromListRecord(record));
    }

    return result;
  }

  id: number | null;
  guid: string;

  originalState: ImageState;
  editedState: ImageState;
  thumbnailState: ImageState;

  originalId: number | null;
  editedId: number | null;
  thumbnailId: number | null;

  localImageChanges: boolean;
  localFilterChanges: boolean;
  lastSyncVersion: number;

  private $transform: FilterTransform | null;

  private originalCache: Blob | null;
  private editedCache: Blob | null;
  private thumbnailCache: Blob | null;

  constructor() {
    this.id = null;
    this.guid = '';

    this.originalState = ImageState.CHANGED;
    this.editedState = ImageState.CHANGED;
    this.thumbnailState = ImageState.CHANGED;

    this.originalId = null;
    this.editedId = null;
    this.thumbnailId = null;

    this.$transform = null;

    this.localImageChanges = true;
    this.localFilterChanges = true;
    this.lastSyncVersion = -1;

    this.originalCache = null;
    this.editedCache = null;
    this.thumbnailCache = null;
  }

  get transform(): FilterTransform | null {
    return this.$transform;
  }

  set transform(value: FilterTransform | null) {
    this.$transform = value;
    this.editedState = ImageState.OUT_OF_DATE;
    this.thumbnailState = ImageState.OUT_OF_DATE;
    this.localFilterChanges = true;
  }

  async getOriginal(): Promise<Blob | null> {
    if (this.originalId && this.originalState === ImageState.NOT_LOADED) {
      this.originalCache = await imageDB.retrieveMedia(this.originalId);
      this.originalState = ImageState.LOADED;
    }

    return this.originalCache;
  }

  async getEdited(): Promise<Blob | null> {
    if (this.editedId && this.editedState === ImageState.NOT_LOADED) {
      this.editedCache = await imageDB.retrieveMedia(this.editedId);
      this.editedState = ImageState.LOADED;
    }
    if (!this.editedId || this.editedState === ImageState.OUT_OF_DATE) {
      this.editedCache = await this.drawFiltered();
      this.editedState = ImageState.CHANGED;
    }
    return this.editedCache;
  }

  async getThumbnail(): Promise<Blob | null> {
    if (this.thumbnailId && this.thumbnailState === ImageState.NOT_LOADED) {
      this.thumbnailCache = await imageDB.retrieveMedia(this.thumbnailId);
      this.thumbnailState = ImageState.LOADED;
    }
    if (!this.thumbnailId || this.thumbnailState === ImageState.OUT_OF_DATE) {
      this.thumbnailCache = await this.drawFiltered(200);
      this.thumbnailState = ImageState.CHANGED;
    }
    return this.thumbnailCache;
  }

  setOriginal(media: Blob) {
    this.originalCache = media;
    this.originalState = ImageState.CHANGED;
    this.editedState = ImageState.OUT_OF_DATE;
    this.thumbnailState = ImageState.OUT_OF_DATE;
    this.localImageChanges = true;
  }

  async delete() {
    if (!this.id) {
      return;
    }
    const mediaIds: number[] = [];
    if (this.originalId) {
      mediaIds.push(this.originalId);
    }
    if (this.editedId) {
      mediaIds.push(this.editedId);
    }
    if (this.thumbnailId) {
      mediaIds.push(this.thumbnailId);
    }
    return imageDB.deleteRecord(this.id, mediaIds);
  }

  async drawFiltered(height?: number): Promise<Blob | null> {
    const original = await this.getOriginal();
    const result: Promise<Blob | null> = new Promise((resolve, reject) => {
      if (original) {
        const source = document.createElement('img');
        source.onload = () => {
          if (this.transform) {
            const canvas = document.createElement('canvas');
            URL.revokeObjectURL(source.src);
            this.transform.apply(source, canvas, height);
            resolve(canvasToBlob(canvas, constants.IMAGE_TYPE));
          } else {
            resolve(null);
          }
        };
        source.onerror = reject;
        source.src = URL.createObjectURL(original);
      }
    });

    return result;
  }

  async save(): Promise<void> {
    if (this.originalState === ImageState.CHANGED && this.originalCache !== null) {
      this.originalId = await imageDB.storeMedia(this.originalCache, this.originalId || undefined);
    }

    if (this.editedState === ImageState.OUT_OF_DATE) {
      this.editedCache = await this.drawFiltered();
      this.editedState = ImageState.CHANGED;
    }

    if (this.editedState === ImageState.CHANGED && this.editedCache !== null) {
      this.editedId = await imageDB.storeMedia(this.editedCache, this.editedId || undefined);
    }

    if (this.thumbnailState === ImageState.OUT_OF_DATE) {
      this.thumbnailCache = await this.drawFiltered(200);
      this.thumbnailState = ImageState.CHANGED;
    }

    if (this.thumbnailState === ImageState.CHANGED && this.thumbnailCache !== null) {
      this.thumbnailId = await imageDB.storeMedia(this.thumbnailCache, this.thumbnailId || undefined);
    }

    let transformRecord: INumDict = {};

    if (this.$transform) {
      transformRecord = {...this.$transform};
    }

    this.id = await imageDB.storeRecord({
      editedId: this.editedId,
      guid: this.guid,
      id: this.id,
      lastSyncVersion: this.lastSyncVersion,
      localFilterChanges: this.localFilterChanges,
      localImageChanges: this.localImageChanges,
      originalId: this.originalId,
      thumbnailId: this.thumbnailId,
      transform: transformRecord,
    });
  }
}
