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

/*
  NOTE: This file gets included by the service worker. To prevent the service
  worker from transitively including a lot of code (particularly around WebGL)
  that it doesn't really need, this file does NOT use the ImageRecord or
  FilterTransform wrapper classes. It directly uses the database features
  instead.

  TODO: In the future it might be nice to make the split at a higher level of
  abstraction, like having a service worker friendly `BaseImageRecord` or
  something.
*/

import constants from '../constants';
import {IListRecord, imageDB} from '../image-db';
import pubsub from '../pubsub';
import {user} from './auth';
import {createFileMeta, driveRequest, folderList, getFileContent,
  updateFileContent, updateFileMeta} from './google-drive';

let snapshotFolder: DriveFile | null = null;

export enum ChangeType {
  ADD,
  REMOVE,
  UPDATE,
}

export interface IChangeEvent {
  type: ChangeType;
  id: number;
}

/*
  # Structure of the drive folder

  The drive folder backs up only two things - original photos and the filter
  options. The filter is stored as app specific metadata inside the file. See
  https://developers.google.com/drive/v3/reference/files#appProperties

  So each image in the app is a single uploaded file. The edited/thumbnail
  versions are created in-app (for now - video filtering may require some
  sort of cloud-based process.)
*/

function syncStart() {
  syncFiles();
  setInterval(syncFiles, constants.SYNC_FREQUENCY + 1000);
}

// Don't want to start trying to sync from inside the service worker
if ('window' in self) {
  pubsub.subscribe('login', syncStart);
}

export async function getSnapshotFolder(): Promise<DriveFile> {
  if (snapshotFolder) {
    return snapshotFolder;
  }

  const files: DriveFileList = await driveRequest('files', {
    corpus: 'user',
    q: `name = '${constants.DRIVE_FOLDER}' and 'root' in parents`,
    spaces: 'drive',
  });
  if (files && files.files.length === 1) {
    snapshotFolder = files.files[0];
    return snapshotFolder;
  }

  // Folder doesn't exist, create it
  const bodyOptions: DriveFile = {
    mimeType: 'application/vnd.google-apps.folder',
    name: constants.DRIVE_FOLDER,
    parents: ['root'],
  };
  snapshotFolder = await createFileMeta(bodyOptions) as DriveFile;
  return snapshotFolder;
}

export async function syncFiles() {
  if (!user.token) {
    return;
  }
  const lastSyncTime: number = Number(await imageDB.getMeta('lastSyncTime'));
  if (lastSyncTime + constants.SYNC_FREQUENCY > Date.now()) {
    return;
  }

  let registration: ServiceWorkerRegistration | undefined;
  if (constants.SUPPORTS_BGSYNC) {
    registration = await navigator.serviceWorker.getRegistration();
  }

  // Get the remote list of files
  const folder = await getSnapshotFolder();
  const files = await folderList(folder.id!);
  const remoteOnly: Map<string, DriveFile> = new Map();
  const localOnly: Set<IListRecord> = new Set();
  const links: Map<DriveFile, IListRecord> = new Map();
  for (const file of files) {
    if (!file.id) {
      continue;
    }
    remoteOnly.set(file.id, file);
  }
  for (const record of await imageDB.all()) {
    if (remoteOnly.has(record.guid)) {
      links.set(remoteOnly.get(record.guid)!, record);
      remoteOnly.delete(record.guid);
    } else {
      localOnly.add(record);
    }
  }

  if (registration) {
    // Going to use background sync
    for (const remote of remoteOnly.values()) {
      if (remote.trashed) {
        continue;
      }
      imageDB.addSync({id: 0, guid: remote.id!, upload: false, includeMedia: true});
    }

    for (const local of localOnly) {
      imageDB.addSync({id: local.id!, guid: '', upload: true, includeMedia: true});
    }

    for (const [remote, local] of links) {
      if (remote.trashed) {
        // Remote was deleted, delete local too
        pubsub.publish({channel: 'sync', data: {type: ChangeType.REMOVE, id: local.id!}});
        deleteLocal(local);
      } else if (local.localFilterChanges || local.localImageChanges) {
        imageDB.addSync({
          guid: remote.id!,
          id: local.id!,
          includeMedia: local.localImageChanges,
          upload: true,
        });
      } else if (local.lastSyncVersion < remote.version!) {
        imageDB.addSync({id: local.id!, guid: remote.id!, upload: false, includeMedia: true});
      }
    }

    registration.sync.register('sync');
  } else {
    // Using direct download
    for (const remote of remoteOnly.values()) {
      if (remote.trashed) {
        continue;
      }
      downloadRemote(remote, true);
    }

    // Upload local only
    for (const local of localOnly) {
      uploadLocal(local, local.localImageChanges);
    }

    for (const [remote, local] of links) {
      if (remote.trashed) {
        // Remote was deleted, delete local too
        pubsub.publish({channel: 'sync', data: {type: ChangeType.REMOVE, id: local.id!}});
        deleteLocal(local);
      } else if (local.localImageChanges || local.localFilterChanges) {
        uploadLocal(local, local.localImageChanges, remote);
      } else if (local.lastSyncVersion < remote.version!) {
        downloadRemote(remote, true, local);
      }
    }
  }

  imageDB.setMeta('lastSyncTime', Date.now());
}

export async function deleteLocal(local: IListRecord) {
  const mediaIds: number[] = [];
  if (local.originalId) {
    mediaIds.push(local.originalId);
  }
  if (local.editedId) {
    mediaIds.push(local.editedId);
  }
  if (local.thumbnailId) {
    mediaIds.push(local.thumbnailId);
  }
  imageDB.deleteRecord(local.id!, mediaIds);
}

export async function
downloadRemote(remote: DriveFile, includeMedia: boolean, local?: IListRecord): Promise<number | undefined> {
  if (!remote.id) {
    return;
  }
  // TODO: Only download the media if it actually changed - this function would
  // be called for a simple filter change, too.
  const original = await getFileContent(remote.id);

  if (original) {
    const record: IListRecord = local || {
      editedId: null,
      guid: '',
      id: null,
      lastSyncVersion: -1,
      localFilterChanges: false,
      localImageChanges: false,
      originalId: null,
      thumbnailId: null,
      transform: {},
    };
    record.guid = remote.id;

    if (remote.appProperties) {
      const data = remote.appProperties;
      const transform = record.transform || {};
      transform.saturation = Number(data.saturation) || transform.saturation;
      transform.warmth = Number(data.warmth) || transform.warmth;
      transform.sharpen = Number(data.sharpen) || transform.sharpen;
      transform.blur = Number(data.blur) || transform.blur;
      transform.brightness = Number(data.brightness) || transform.brightness;
      transform.contrast = Number(data.contrast) || transform.contrast;
      transform.grey = Number(data.grey) || transform.grey;
      transform.vignette = Number(data.vignette) || transform.vignette;
      record.transform = transform;
    }

    record.localFilterChanges = false;
    record.localImageChanges = false;
    record.lastSyncVersion = remote.version!;
    record.originalId = await imageDB.storeMedia(original);
    await imageDB.storeRecord(record);
    pubsub.publish({channel: 'sync', data: {type: ChangeType.ADD, id: record.id!}});
    return record.id!;
  } else {
    console.log(`Could not fetch original image`);
  }
  return;
}

export async function uploadLocal(local: IListRecord, includeMedia: boolean, remote?: DriveFile) {
  if (!local.originalId) {
    return;
  }
  const original = await imageDB.retrieveMedia(local.originalId);
  if (!original) {
    return;
  }

  if (!remote) {
    const parent = await getSnapshotFolder();

    if (!parent || !parent.id) {
      return;
    }

    // Create the file record
    remote = {
      mimeType: original.type,
      name: `${local.id}_${Date.now()}`,
      parents: [parent.id],
    };
  }

  // Set the metadata to be the transform values
  if (local.transform) {
    remote.appProperties = {};
    for (const key in local.transform) {
      remote.appProperties[key] = String(local.transform[key]);
    }
  }

  if (remote.id) {
    const result = await updateFileMeta(remote);
    local.lastSyncVersion = result.version!;
  } else {
    const file = await createFileMeta(remote);
    if (!file.id) {
      return;
    }
    remote.id = file.id;
    local.guid = file.id;
  }

  if (includeMedia) {
    // Upload the data
    const updated = await updateFileContent(remote.id, original);
    local.lastSyncVersion = updated.version!;
    local.localImageChanges = false;
  }
  local.localFilterChanges = false;
  return imageDB.storeRecord(local);
}
