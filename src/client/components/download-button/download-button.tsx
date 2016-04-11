require('./download-button.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset, Set } from 'plywood';
import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
// import { ... } from '../../config/constants';
import { SvgIcon } from '../svg-icon/svg-icon';
import { STRINGS } from "../../config/constants";
import { setToString } from "../../../common/utils/general/general";
import { classNames } from "../../utils/dom/dom";

// styled link, not button
export type FileFormat = "csv" | "tsv" | "json" | "txt";

export interface DownloadButtonProps extends React.Props<any> {
  dataset: Dataset;
  className?: string;
  fileName?: string;
  fileFormat?: FileFormat;
}

export interface DownloadButtonState {
}

export class DownloadButton extends React.Component<DownloadButtonProps, DownloadButtonState> {
  static defaultFileFormat: FileFormat = 'csv';
  static renderDisabled(className?: string) {
    const qualifiedClassName = classNames('download-button', className);
    return <a className={qualifiedClassName}
              title={STRINGS.download}
              disabled={true}
    >{STRINGS.download}</a>;
  }

  public mounted: boolean;

  constructor() {
    super();
//    this.state = {};
  }

  datasetToFileString(): string {
    const { fileFormat, dataset } = this.props;
    if (fileFormat === 'csv') {
      return dataset.toCSV({
        formatter: {
          'SET/STRING': ((v: Set) => {
            return setToString(v, { encloseIn: ["\"[", "\"]"] });
          })
        }
      });
    } else if (fileFormat === 'tsv') {
      return dataset.toTSV({
        formatter: {
          'SET/STRING': ((v: Set) => {
            return setToString(v, { encloseIn: ["[", "]"] });
          })
        }
      });
    } else {
      return JSON.stringify(dataset.toJS(), null, 2);
    }
  }

  render() {
    const { dataset, className, fileFormat } = this.props;
    if (!dataset) return DownloadButton.renderDisabled(className);
    var { fileName } = this.props;
    const qualifiedClassName = classNames('download-button', className);
    const buffer = this.datasetToFileString();
    if (!fileName) fileName = `${new Date()}-data`;
    fileName += `.${fileFormat || 'json'}`;
    return <a className={qualifiedClassName}
              href={`data:attachment/csv, ${encodeURIComponent(buffer)}`}
              download={fileName}
              target="_blank">
      {STRINGS.download}
    </a>;
  }
}
