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
import {imageDB} from '../image-db';
import pubsub from '../pubsub';

class User {
  id: string = '';
  name: string = '';
  imageURL: string = '';
  token: string = '';
  tokenExpiry: number = 0;
}

export const user: User = new User();

export async function resume() {
  const storedToken: string = await imageDB.getMeta('token');
  const storedExpiry: number = await imageDB.getMeta('tokenExpiry');
  if (storedToken && (storedExpiry * 1000) > Date.now()) {
    return validate(storedToken);
  }
}

export function login() {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.append('client_id', constants.CLIENT_ID);
  url.searchParams.append('redirect_uri', `${location.origin}/oauth`);
  url.searchParams.append('response_type', 'token');
  url.searchParams.append('scope', 'profile https://www.googleapis.com/auth/drive');
  window.location.replace(url.toString());
}

export function logout() {
  user.token = '';
  pubsub.publish({channel: 'logout'});
}

export async function validate(accessToken: string): Promise<void> {
  if (accessToken === '') {
    return;
  }
  const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
  if (!response.ok) {
    user.token = '';
    return;
  }
  const json = await response.json();
  if (json.aud === constants.CLIENT_ID) {
    const profileResponse = await fetch(`https://www.googleapis.com/plus/v1/people/me?access_token=${accessToken}`);
    const profile = await profileResponse.json();
    user.id = profile.id;
    user.name = profile.displayName;
    user.imageURL = profile.image.url;
    user.token = accessToken;
    user.tokenExpiry = json.exp;
    setTimeout(logout, json.expires_in * 1000);
    pubsub.publish({channel: 'login'});
    await imageDB.setMeta('token', accessToken);
    await imageDB.setMeta('tokenExpiry', json.exp);
  }
}
