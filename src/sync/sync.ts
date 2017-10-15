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

import constants from '../constants';
import FilterTransform from '../filters/filter-transform';
import {imageDB} from '../image-db';
import ImageRecord from '../image-record';
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

export function syncStart() {
  syncFiles();
  setInterval(syncFiles, constants.SYNC_FREQUENCY + 1000);
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

  // Get the remote list of files
  const folder = await getSnapshotFolder();
  const files = await folderList(folder.id!);
  const remoteOnly: Map<string, DriveFile> = new Map();
  const localOnly: Set<ImageRecord> = new Set();
  const links: Map<DriveFile, ImageRecord> = new Map();
  for (const file of files) {
    if (!file.id) {
      continue;
    }
    remoteOnly.set(file.id, file);
  }
  for (const record of await ImageRecord.getAll()) {
    if (remoteOnly.has(record.guid)) {
      links.set(remoteOnly.get(record.guid)!, record);
      remoteOnly.delete(record.guid);
    } else {
      localOnly.add(record);
    }
  }

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
      local.delete();
    } else if (local.localImageChanges || local.localFilterChanges) {
      uploadLocal(local, local.localImageChanges, remote);
    } else if (local.lastSyncVersion < remote.version!) {
      downloadRemote(remote, true, local);
    }
  }

  imageDB.setMeta('lastSyncTime', Date.now());
}

export async function
downloadRemote(remote: DriveFile, includeMedia: boolean, local?: ImageRecord): Promise<number | undefined> {
  if (!remote.id) {
    return;
  }
  const original = await getFileContent(remote.id);

  if (original) {
    const record = local || new ImageRecord();
    record.guid = remote.id;
    record.setOriginal(original);

    if (remote.appProperties) {
      record.transform = FilterTransform.from(remote.appProperties);
    }

    record.localFilterChanges = false;
    record.localImageChanges = false;
    record.lastSyncVersion = remote.version!;
    await record.save();
    pubsub.publish({channel: 'sync', data: {type: ChangeType.ADD, id: record.id!}});
    return record.id!;
  } else {
    console.log(`Could not fetch original image`);
  }
  return;
}

export async function uploadLocal(local: ImageRecord, includeMedia: boolean, remote?: DriveFile) {
  const original = await local.getOriginal();
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
  return local.save();
}
