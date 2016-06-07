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

export interface ManagedDataset {
  name: string;
  uri: string;
  dataset?: Dataset;
  subsetFilter?: Expression;
}

export interface FileManagerOptions {
  logger: Logger;
  verbose?: boolean;
  initialDatasets?: ManagedDataset[];
  onDatasetChange?: (name: string, dataset: Dataset) => void;
}

function noop() {}

export class FileManager {
  public logger: Logger;
  public managedDatasets: ManagedDataset[] = [];
  public verbose: boolean;
  public onDatasetChange: (name: string, dataset: Dataset) => void;

  constructor(options: FileManagerOptions) {
    this.logger = options.logger;
    this.verbose = Boolean(options.verbose);
    this.managedDatasets = options.initialDatasets || [];
    this.onDatasetChange = options.onDatasetChange || noop;
  }

  // Do initialization
  public init(): Q.Promise<any> {
    var progress: Q.Promise<any> = Q(null);

    progress = progress
      .then(() => {
        var initialIntrospectionTasks: Q.Promise<any>[] = [];
        this.managedDatasets.forEach((managedDataset) => {
          this.logger.log(`Loading file ${managedDataset.uri}`);
          getFileData(managedDataset.uri)
            .then(
              (rawData) => {
                this.logger.log(`Loaded file ${managedDataset.uri} (rows = ${rawData.length})`);
                var dataset = Dataset.fromJS(rawData).hide();

                if (managedDataset.subsetFilter) {
                  dataset = dataset.filter(managedDataset.subsetFilter.getFn(), {});
                }

                managedDataset.dataset = dataset;
                this.onDatasetChange(managedDataset.name, dataset);
              },
              (e) => {
                this.logger.error(`Field to load file ${managedDataset.name} because ${e.message}`);
              }
            );
        });
        return Q.all(initialIntrospectionTasks);
      });

    // Set up timers to reintrospect the sources and reintrospect the

    return progress;
  }
}
