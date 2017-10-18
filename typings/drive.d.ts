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

interface DriveUser {
  kind: 'drive#user';
  displayName: string;
  photoLink: string;
  me: boolean;
  permissionId: string;
  emailAddress: string;
}

interface DriveAbout {
  kind: 'drive#about';
  user?: DriveUser;
  storageQuota?: {
    limit?: number,
    usage?: number,
    usageInDrive?: number,
    usageInDriveTrash?: number,
  };
  importFormats?: {
    [name: string]: string,
  };
  exportFormats?: {
    [name: string]: string,
  };
  maxImportSizes?: {
    [name: string]: number,
  };
  maxUploadSize?: number;
  appInstalled?: boolean;
  folderColorPalette?: string[];
  teamDriveThemes?: {
    id?: string,
    backgroundImageLink?: string,
    colorRgb?: string,
  }[];
}

interface DrivePermission {
  kind: 'drive#permission',
  id?: string,
  type?: string,
  emailAddress?: string,
  domain?: string,
  role?: string,
  allowFileDiscovery?: boolean,
  displayName?: string,
  photoLink?: string,
  expirationTime?: number,
  teamDrivePermissionDetails?: {
    teamDrivePermissionType?: string,
    role?: string,
    inheritedFrom?: string,
    inherited?: boolean
  }[],
  deleted?: boolean
}

interface DriveFile {
  kind?: 'drive#file',
  id?: string,
  name?: string,
  mimeType?: string,
  description?: string,
  starred?: boolean,
  trashed?: boolean,
  explicitlyTrashed?: boolean,
  trashingUser?: DriveUser,
  trashedTime?: number,
  parents?: string[],
  properties?: {
    [name: string]: string,
  },
  appProperties?: {
    [name: string]: string,
  },
  spaces?: string[],
  version?: number,
  webContentLink?: string,
  webViewLink?: string,
  iconLink?: string,
  hasThumbnail?: boolean,
  thumbnailLink?: string,
  thumbnailVersion?: number,
  viewedByMe?: boolean,
  viewedByMeTime?: number,
  createdTime?: number,
  modifiedTime?: number,
  modifiedByMeTime?: number,
  modifiedByMe?: boolean,
  sharedWithMeTime?: number,
  sharingUser?: DriveUser,
  owners?: DriveUser[],
  teamDriveId?: string,
  lastModifyingUser?: DriveUser,
  shared?: boolean,
  ownedByMe?: boolean,
  capabilities?: {
    canAddChildren?: boolean,
    canChangeViewersCanCopyContent?: boolean,
    canComment?: boolean,
    canCopy?: boolean,
    canDelete?: boolean,
    canDownload?: boolean,
    canEdit?: boolean,
    canListChildren?: boolean,
    canMoveItemIntoTeamDrive?: boolean,
    canMoveTeamDriveItem?: boolean,
    canReadRevisions?: boolean,
    canReadTeamDrive?: boolean,
    canRemoveChildren?: boolean,
    canRename?: boolean,
    canShare?: boolean,
    canTrash?: boolean,
    canUntrash?: boolean
  },
  viewersCanCopyContent?: boolean,
  writersCanShare?: boolean,
  permissions?: DrivePermission[],
  hasAugmentedPermissions?: boolean,
  folderColorRgb?: string,
  originalFilename?: string,
  fullFileExtension?: string,
  fileExtension?: string,
  md5Checksum?: string,
  size?: number,
  quotaBytesUsed?: number,
  headRevisionId?: string,
  contentHints?: {
    thumbnail?: {
      // URL-safe Base64 encoded
      image?: string,
      mimeType?: string
    },
    indexableText?: string
  },
  imageMediaMetadata?: {
    width?: number,
    height?: number,
    rotation?: number,
    location?: {
      latitude?: number,
      numberitude?: number,
      altitude?: number
    },
    time?: string,
    cameraMake?: string,
    cameraModel?: string,
    exposureTime?: number,
    aperture?: number,
    flashUsed?: boolean,
    focalLength?: number,
    isoSpeed?: number,
    meteringMode?: string,
    sensor?: string,
    exposureMode?: string,
    colorSpace?: string,
    whiteBalance?: string,
    exposureBias?: number,
    maxApertureValue?: number,
    subjectDistance?: number,
    lens?: string
  },
  videoMediaMetadata?: {
    width?: number,
    height?: number,
    durationMillis?: number
  },
  isAppAuthorized?: boolean
}

interface DriveFileList {
  kind: 'drive#fileList';
  nextPageToken: string;
  incompleteSearch: boolean;
  files: DriveFile[]
}
