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

import {user} from './auth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/';
const COMMON_FILE_FIELDS = 'kind,id,name,mimeType,appProperties,trashed,version,size';

function makeURL(base: string, defaults: IStringDict, options?: IStringDict): string {
  const url = new URL(base);
  for (const key in defaults) {
    url.searchParams.append(key, defaults[key]);
  }
  if (options) {
    for (const key in options) {
      url.searchParams.append(key, options[key]);
    }
  }
  return url.toString();
}

export async function driveRequest(endpoint: string, options?: IStringDict, init: RequestInit = {}) {
  if (!user.token) {
    throw new Error('Not logged in');
  }
  const url = makeURL(`${DRIVE_API}${endpoint}`, {
    access_token: user.token,
  }, options);
  const response = await fetch(url, init);
  return response.json();
}

async function driveMediaRequest(endpoint: string, options?: IStringDict, init: RequestInit = {}) {
  if (!user.token) {
    throw new Error('Not logged in');
  }
  const url = makeURL(`${DRIVE_API}${endpoint}`, {
    access_token: user.token,
    alt: 'media',
  }, options);
  const response = await fetch(url, init);
  return response.blob();
}

async function driveUploadRequest(endpoint: string, body: Blob) {
  if (!user.token) {
    throw new Error('Not logged in');
  }
  const url = makeURL(`${DRIVE_UPLOAD_API}${endpoint}`, {
    access_token: user.token,
    uploadType: 'media',
  });
  const response = await fetch(url, {method: 'PATCH', body});
  return response.json();
}

export async function getFileMeta(fileId: string): Promise<DriveFile> {
  return driveRequest(`files/${fileId}`, {fields: COMMON_FILE_FIELDS});
}

export async function getFileContent(fileId: string): Promise<Blob | null> {
  return driveMediaRequest(`files/${fileId}`);
}

export async function createFileMeta(file: DriveFile): Promise<DriveFile> {
  return driveRequest(`files`, {fields: COMMON_FILE_FIELDS}, {
    body: JSON.stringify(file),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  });
}

export async function updateFileMeta(file: DriveFile): Promise<DriveFile> {
  // Only certain fields get written
  const body: DriveFile = {
    appProperties: file.appProperties,
    mimeType: file.mimeType,
    name: file.name,
  };
  return driveRequest(`files/${file.id}`, {fields: COMMON_FILE_FIELDS}, {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'PATCH',
  });
}

export async function updateFileContent(fileId: string, body: Blob): Promise<DriveFile> {
  return driveUploadRequest(`files/${fileId}`, body);
}

export async function folderList(folderId: string): Promise<DriveFile[]> {
  let result: DriveFile[] = [];
  const request: IStringDict = {
    corpus: 'user',
    fields: `files(${COMMON_FILE_FIELDS})`,
    q: `'${folderId}' in parents`,
    spaces: 'drive',
  };
  let nextPageToken: string = '';

  do {
    if (nextPageToken) {
      request.nextPageToken = nextPageToken;
    }
    const list: DriveFileList = await driveRequest('files', request);
    result = result.concat(list.files);
    nextPageToken = list.nextPageToken;
  } while (nextPageToken);

  return result;
}
