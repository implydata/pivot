import * as path from 'path';
import * as Q from 'q';
import * as fs from 'fs-promise';
import { Dataset, Expression, PseudoDatum } from 'plywood';
import { Logger } from '../logger/logger';
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
  uri: string;
  logger: Logger;
  verbose?: boolean;
  subsetFilter?: Expression;
  onDatasetChange?: (dataset: Dataset) => void;
}

function noop() {}

export class FileManager {
  public logger: Logger;
  public verbose: boolean;
  public uri: string;
  public dataset: Dataset;
  public subsetFilter: Expression;
  public onDatasetChange: (dataset: Dataset) => void;

  constructor(options: FileManagerOptions) {
    this.uri = options.uri;
    this.logger = options.logger;
    this.subsetFilter = options.subsetFilter;
    this.verbose = Boolean(options.verbose);
    this.onDatasetChange = options.onDatasetChange || noop;
  }

  // Do initialization
  public init(): Q.Promise<any> {
    this.logger.log(`Loading file ${this.uri}`);
    return getFileData(this.uri)
      .then(
        (rawData) => {
          this.logger.log(`Loaded file ${this.uri} (rows = ${rawData.length})`);
          var dataset = Dataset.fromJS(rawData).hide();

          if (this.subsetFilter) {
            dataset = dataset.filter(this.subsetFilter.getFn(), {});
          }

          this.dataset = dataset;
          this.onDatasetChange(dataset);
        },
        (e) => {
          this.logger.error(`Field to load file ${this.uri} because ${e.message}`);
        }
      );
  }

  public destroy(): void {
    // Nothing here for now
  }
}
