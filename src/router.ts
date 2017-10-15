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

import {validate} from './sync/auth';
import ViewState from './view-state';
import BrowseView from './views/browse-view';
import CaptureView from './views/capture-view';
import EditView from './views/edit-view';
import UploadView from './views/upload-view';
import View from './views/view';

class Router {
  private currentView: View | null;
  private currentLocation: string;

  private browseView: BrowseView;
  private captureView: CaptureView;
  private editView: EditView;
  private uploadView: UploadView;

  constructor() {
    window.addEventListener('popstate', (e) => this.changeHandler(e.state));

    this.browseView = new BrowseView();
    this.captureView = new CaptureView();
    this.editView = new EditView();
    this.uploadView = new UploadView();
  }

  changeHandler(state?: ViewState) {
    // TODO: Not sure that I should take the state here

    // Ignore any changes in the hash.
    if (window.location.pathname === this.currentLocation) {
      return;
    }
    this.currentLocation = window.location.pathname;

    const parts = this.currentLocation.split('/');

    if (this.currentView) {
      this.currentView.hide();
    }

    if (!state) {
      state = new ViewState();
    }

    let newView: View | null = null;

    switch (parts[1]) {
      case 'capture':
        newView = this.captureView;
        break;
      case '': // Entry point
      case 'browse':
        newView = this.browseView;
        break;
      case 'edit':
        newView = this.editView;
        state.id = Number(parts[2]);
        break;
      case 'upload':
        newView = this.uploadView;
        break;
      case 'oauth':
        this.handleOAuth().then(() => {
          this.visit('/');
        });
        return;
      default:
        // TODO: Proper 404
        console.log('404');
    }

    if (newView) {
      this.switch(newView, state);
    } else {
      // TODO: Something better?
      console.log('Oh no, no view found!');
    }
  }

  switch(newView: View, state: ViewState) {
    if (this.currentView) {
      this.currentView.hide();
    }
    newView.setState(state);
    newView.show();
    this.currentView = newView;
  }

  visit(url: string) {
    if (window.location.href === url) {
      return;
    }

    let state;

    if (this.currentView) {
      state = this.currentView.getState();
    }

    window.history.replaceState(state, '', window.location.href);
    window.history.pushState(null, '', url);
    this.changeHandler();
  }

  click(event: MouseEvent) {
    const anchor = event.target as HTMLAnchorElement;

    if (event.metaKey || event.ctrlKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.visit(anchor.href);
  }

  handleOAuth() {
    const hash = window.location.hash;
    const parts = hash.substring(1).split('&');
    let accessToken = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'access_token') {
        accessToken = value;
      }
    }
    return validate(accessToken);
  }
}

export default new Router();
