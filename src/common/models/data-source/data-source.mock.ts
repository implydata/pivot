import { $, Executor, Dataset, basicExecutorFactory } from 'plywood';
import { DataSource, DataSourceJS } from './data-source';

var executor = basicExecutorFactory({
  datasets: {
    wiki: Dataset.fromJS([]),
    twitter: Dataset.fromJS([])
  }
});

export class DataSourceMock {
  public static get WIKI_JS(): DataSourceJS {
    return {
      name: 'wiki',
      title: 'Wiki',
      engine: 'druid',
      source: 'wiki',
      subsetFilter: null,
      introspection: 'none',
      attributes: [
        { name: 'time', type: 'TIME' },
        { name: 'articleName', type: 'STRING' },
        { name: 'count', type: 'NUMBER', unsplitable: true, makerAction: { action: 'count' } }
      ],
      dimensions: [
        {
          expression: {
            name: 'time',
            op: 'ref'
          },
          kind: 'time',
          name: 'time',
          title: 'Time'
        },
        {
          expression: {
            name: 'articleName',
            op: 'ref'
          },
          kind: 'string',
          name: 'articleName',
          title: 'Article Name'
        }
      ],
      measures: [
        {
          name: 'count',
          title: 'Count',
          expression: $('main').sum('$count').toJS()
        },
        {
          name: 'added',
          title: 'Added',
          expression: $('main').sum('$added').toJS()
        }
      ],
      timeAttribute: 'time',
      defaultTimezone: 'Etc/UTC',
      defaultFilter: { op: 'literal', value: true },
      defaultDuration: 'P3D',
      defaultSortMeasure: 'count',
      defaultPinnedDimensions: ['articleName'],
      defaultSelectedMeasures: ['count'],
      refreshRule: {
        time: new Date('2016-04-30T12:39:51.350Z'),
        rule: "fixed"
      }
    };
  }

  public static get TWITTER_JS(): DataSourceJS {
    return {
      name: 'twitter',
      title: 'Twitter',
      engine: 'druid',
      source: 'twitter',
      subsetFilter: null,
      introspection: 'none',
      dimensions: [
        {
          expression: {
            name: 'time',
            op: 'ref'
          },
          kind: 'time',
          name: 'time',
          title: 'Time'
        },
        {
          expression: {
            name: 'twitterHandle',
            op: 'ref'
          },
          kind: 'string',
          name: 'twitterHandle',
          title: 'Twitter Handle'
        },
        {
          expression: {
            name: 'userId',
            op: 'ref'
          },
          kind: 'number',
          name: 'userId',
          title: 'User Id',
          bucketingStrategy: 'never'
        },
        {
          expression: {
            name: 'orderSize',
            op: 'ref'
          },
          kind: 'number',
          name: 'orderSize',
          title: 'Order Size'
        }
      ],
      measures: [
        {
          name: 'count',
          title: 'count',
          expression: {
            name: 'count',
            op: 'ref'
          }

        }
      ],
      timeAttribute: 'time',
      defaultTimezone: 'Etc/UTC',
      defaultFilter: { op: 'literal', value: true },
      defaultDuration: 'P3D',
      defaultSortMeasure: 'count',
      defaultPinnedDimensions: ['tweet'],
      refreshRule: {
        rule: 'query',
        refresh: 'P1D'
      }
    };
  }

  static wiki() {
    return DataSource.fromJS(DataSourceMock.WIKI_JS, { executor });
  }

  static twitter() {
    return DataSource.fromJS(DataSourceMock.TWITTER_JS, { executor });
  }
}
