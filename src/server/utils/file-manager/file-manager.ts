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

import * as path from 'path';
import * as Q from 'q';
import * as fs from 'fs-promise';
import { Dataset, Expression, PseudoDatum } from 'plywood';
import { Logger } from 'logger-tracker';

import { parseData } from '../../../common/utils/parser/parser';


export function getFileData(filePath: string): Q.Promise<any[]> {
  return fs.readFile(filePath, 'utf-8')
    .then((fileData) => {
      try {
        return parseData(fileData, path.extname(filePath));
      } catch (e) {
        throw new Error(`could not parse '${filePath}': ${e.message}`);
      }
    })
    .then((fileJSON) => {
      fileJSON.forEach((d: PseudoDatum) => {
        d['time'] = new Date(d['time']);
      });
      return fileJSON;
    });
}

export interface FileManagerOptions {
  logger: Logger;
  verbose?: boolean;
  anchorPath: string;
  uri: string;
  subsetExpression?: Expression;
}

function noop() {}

export class FileManager {
  public logger: Logger;
  public verbose: boolean;
  public anchorPath: string;
  public uri: string;
  public dataset: Dataset;
  public subsetExpression: Expression;

  constructor(options: FileManagerOptions) {
    this.logger = options.logger;
    this.verbose = Boolean(options.verbose);
    this.anchorPath = options.anchorPath;
    this.uri = options.uri;
    this.subsetExpression = options.subsetExpression;
    this.verbose = Boolean(options.verbose);
  }

  public loadDataset(): Q.Promise<Dataset> {
    const { logger, anchorPath, uri } = this;

    var filePath = path.resolve(anchorPath, uri);

    logger.log(`Loading file ${filePath}`);
    return (getFileData(filePath) as any)
      .then(
        (rawData: any[]): Dataset => {
          logger.log(`Loaded file ${filePath} (rows = ${rawData.length})`);
          var dataset = Dataset.fromJS(rawData).hide();

          if (this.subsetExpression) {
            dataset = dataset.filter(this.subsetExpression.getFn(), {});
          }

          this.dataset = dataset;
          return dataset;
        },
        (e: Error) => {
          logger.error(`Failed to load file ${filePath} because: ${e.message}`);
        }
      );
  }

  public destroy(): void {
    // Nothing here for now
  }
}
