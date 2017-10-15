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

interface IAction {
  channel: string;
  data?: any;
}

type Handler = (action: IAction) => void;

const subscribers: Map<string, Set<Handler>> = new Map();

const pubsub = {
  publish(action: IAction) {
    if (subscribers.has(action.channel)) {
      const handlers = subscribers.get(action.channel)!;
      console.log(`[PUBSUB] ${action.channel}: ${handlers.size} handlers`);
      for (const handler of handlers) {
        handler(action);
      }
    }
  },

  subscribe(channel: string, handler: Handler) {
    if (!subscribers.has(channel)) {
      subscribers.set(channel, new Set());
    }
    subscribers.get(channel)!.add(handler);
  },

  unsubscribe(channel: string, handler: Handler) {
    if (subscribers.has(channel)) {
      const handlers = subscribers.get(channel)!;
      if (handlers.has(handler)) {
        handlers.delete(handler);
      }
    }
  },
};

export default pubsub;
