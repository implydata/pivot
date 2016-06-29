import { $, SortAction } from 'plywood';
import { Locale } from '../../common/utils/time/time';

export const TITLE_HEIGHT = 36;

// Core = filter + split
export const DIMENSION_HEIGHT = 27;
export const MEASURE_HEIGHT = 27;
export const CORE_ITEM_WIDTH = 192;
export const CORE_ITEM_GAP = 8;
export const BAR_TITLE_WIDTH = 66;

export const PIN_TITLE_HEIGHT = 36;
export const PIN_ITEM_HEIGHT = 25;
export const PIN_PADDING_BOTTOM = 12;
export const VIS_H_PADDING = 10;

export const VIS_SELECTOR_WIDTH = 79;
export const OVERFLOW_WIDTH = 40;

export const SPLIT = 'SPLIT';

export const MAX_SEARCH_LENGTH = 300;
export const SEARCH_WAIT = 900;

export const STRINGS: any = {
  any: 'any',
  autoUpdate: 'Auto update',
  cancel: 'Cancel',
  close: 'Close',
  copySpecificUrl: 'Copy URL - fixed time',
  copyUrl: 'Copy URL',
  copyValue: 'Copy value',
  current: 'Current',
  dataSources: 'DataSources',
  dimensions: 'Dimensions',
  download: 'Download',
  end: 'End',
  exclude: 'Exclude',
  exportToCSV: 'Export to CSV',
  filter: 'Filter',
  goToUrl: 'Go to URL',
  granularity: 'Granularity',
  home: 'Pivot',
  include: 'Include',
  infoAndFeedback: 'Info & Feedback',
  intersection: 'Intersection',
  latest: 'Latest',
  limit: 'Limit',
  logout: 'Logout',
  measures: 'Measures',
  noDescription: 'No description found',
  noFilter: 'No filter',
  noQueryableDataSources: 'There are no queryable data sources configured',
  ok: 'OK',
  openIn: 'Open in',
  pin: 'Pin',
  pinboard: 'Pinboard',
  pinboardPlaceholder: 'Click or drag dimensions to pin them',
  previous: 'Previous',
  queryError: 'Query error',
  rawData: 'Raw Data',
  regex: 'Regex',
  relative: 'Relative',
  segment: 'segment',
  select: 'Select',
  settings: 'Settings',
  sortBy: 'Sort by',
  specific: 'Specific',
  split: 'Split',
  splitDelimiter: 'by',
  start: 'Start',
  stringSearch: 'String search',
  subsplit: 'Split',
  timezone: 'Timezone',
  updateTimezone: 'Update Timezone',
  viewRawData: 'View raw data'
};


const EN_US: Locale = {
  shortDays: [ "S", "M", "T", "W", "T", "F", "S" ],
  shortMonths: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec" ],
  weekStart: 0
};

export function getLocale(): Locale {
  return EN_US;
}
