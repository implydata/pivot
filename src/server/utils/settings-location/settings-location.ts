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

import * as Q from 'q';
import { inlineVars } from '../../../common/utils/general/general';
import { MANIFESTS } from '../../../common/manifests/index';
import { AppSettings } from '../../../common/models/index';
import { loadFileSync } from '../file/file';


export class SettingsLocation {
  static fromTransient(initAppSettings: AppSettings): SettingsLocation {
    var settingsLocation = new SettingsLocation();
    settingsLocation.readSettings = () => Q(initAppSettings);
    return settingsLocation;
  }

  static fromReadOnlyFile(filepath: string): SettingsLocation {
    var settingsLocation = new SettingsLocation();
    settingsLocation.readSettings = () => {
      var appSettingsJS = loadFileSync(filepath, 'yaml');
      appSettingsJS = inlineVars(appSettingsJS, process.env);
      return Q(AppSettings.fromJS(appSettingsJS, { visualizations: MANIFESTS }));
    };
    return settingsLocation;
  }

  static fromWritableFile(filepath: string): SettingsLocation {
    throw new Error('todo');
  }


  public readSettings: () => Q.Promise<AppSettings>;
  public writeSettings: (appSettings: AppSettings) => Q.Promise<any>;

  constructor() {}
}


