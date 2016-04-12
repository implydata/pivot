import { $, SortAction } from 'plywood';

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

export const SPLIT = 'SPLIT';
export const SEGMENT = 'SEGMENT';
export const TIME_SEGMENT = 'TIME';
export const TIME_SORT_ACTION = new SortAction({
  expression: $(TIME_SEGMENT),
  direction: SortAction.ASCENDING
});

export const MAX_SEARCH_LENGTH = 300;
export const SEARCH_WAIT = 900;

export const STRINGS = {
  dimensions: 'Dimensions',
  measures: 'Measures',
  filter: 'Filter',
  split: 'Split',
  subsplit: 'Split',
  sortBy: 'Sort by',
  limit: 'Limit',
  pin: 'Pin',
  pinboard: 'Pinboard',
  pinboardPlaceholder: 'Click or drag dimensions to pin them',
  granularity: 'Granularity',
  relative: 'Relative',
  specific: 'Specific',
  latest: 'Latest',
  current: 'Current',
  previous: 'Previous',
  start: 'Start',
  end: 'End',
  ok: 'OK',
  select: 'Select',
  cancel: 'Cancel',
  close: 'Close',
  queryError: 'Query error',
  autoUpdate: 'Auto update',
  download: 'Download',
  copyUrl: 'Copy URL',
  seeRawData: 'See Raw Data',
  rawData: 'Raw Data',
  copySpecificUrl: 'Copy URL - fixed time',
  logout: 'Logout',
  infoAndFeedback: 'Info & Feedback',
  copyValue: 'Copy value'
};
