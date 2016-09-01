/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';
import * as Q from 'q';

const DELAY = 100;

export interface LoadingMessageState {
  loadingMessage?: string;
  isLoading?: boolean;
}

export class LoadingMessageDelegate {

  private component: React.Component<any, LoadingMessageState>;
  private timeoutId: number;

  constructor(component: React.Component<any, LoadingMessageState>) {
    this.component = component;

    if (!this.component.state) this.component.state = {};

    this.component.state.loadingMessage = null;
  }

  private setState(state: LoadingMessageState, callback?: () => void) {
    return this.component.setState.call(this.component, state, callback);
  }

  public start(message: string) {
    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = undefined;
      this.setState({
        isLoading: true,
        loadingMessage: message
      });
    }, DELAY);
  }

  public startNow(message: string) {
    this.setState({
      isLoading: true,
      loadingMessage: message
    });
  }

  public stop(): Q.Promise<any> {
    var deferred = Q.defer();

    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      deferred.resolve();
    } else {
      this.setState({
        isLoading: false,
        loadingMessage: undefined
      }, () => deferred.resolve());
    }

    return deferred.promise;
  }

  unmount() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }
  }
}
