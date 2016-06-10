import { $, Executor, Dataset, basicExecutorFactory } from 'plywood';
import { DataSourceMock } from '../data-source/data-source.mock';
import { AppSettings, AppSettingsJS } from './app-settings';

export class AppSettingsMock {
  public static get WIKI_ONLY_JS(): AppSettingsJS {
    return {
      customization: {
        title: "Hello World",
        headerBackground: "brown",
        customLogoSvg: "ansvgstring"
      },
      clusters: [
        {
          name: 'druid',
          type: 'druid',
          host: '192.168.99.100',
          version: '0.9.1',
          timeout: 30000,
          sourceListScan: 'auto',
          sourceListRefreshOnLoad: false,
          sourceListRefreshInterval: 10000,
          sourceReintrospectOnLoad: false,
          sourceReintrospectInterval: 10000,

          introspectionStrategy: 'segment-metadata-fallback'
        }
      ],
      dataSources: [
        DataSourceMock.WIKI_JS
      ]
    };
  }

  public static get WIKI_TWITTER_JS(): AppSettingsJS {
    return {
      customization: {
        title: "Hello World"
      },
      clusters: [
        {
          name: 'druid',
          type: 'druid',
          host: '192.168.99.100',
          version: '0.9.1',
          timeout: 30000,
          sourceListScan: 'auto',
          sourceListRefreshOnLoad: false,
          sourceListRefreshInterval: 10000,
          sourceReintrospectOnLoad: false,
          sourceReintrospectInterval: 10000,

          introspectionStrategy: "segment-metadata-fallback"
        }
      ],
      dataSources: [
        DataSourceMock.WIKI_JS,
        DataSourceMock.TWITTER_JS
      ]
    };
  }

  static wikiOnly() {
    return AppSettings.fromJS(AppSettingsMock.WIKI_ONLY_JS);
  }

  static wikiTwitter() {
    return AppSettings.fromJS(AppSettingsMock.WIKI_TWITTER_JS);
  }
}
