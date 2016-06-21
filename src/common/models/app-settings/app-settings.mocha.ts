import { expect } from 'chai';
import { testImmutableClass } from 'immutable-class/build/tester';

import { $, Expression } from 'plywood';
import { DataSourceMock } from '../data-source/data-source.mock';
import { AppSettings } from './app-settings';
import { AppSettingsMock } from './app-settings.mock';

describe('AppSettings', () => {
  it('is an immutable class', () => {
    testImmutableClass(AppSettings, [
      AppSettingsMock.wikiOnlyJS(),
      AppSettingsMock.wikiTwitterJS()
    ]);
  });


  describe("errors", () => {
    it("errors if there is no good cluster", () => {
      var js = AppSettingsMock.wikiOnlyJS();
      js.clusters = [];
      expect(() => AppSettings.fromJS(js)).to.throw("Can not find cluster 'druid' for data source 'wiki'");
    });

  });


  describe("upgrades", () => {
    it("deals with old config style", () => {
      var oldJS: any = {
        customization: {},
        druidHost: '192.168.99.100',
        timeout: 30000,
        sourceListScan: 'auto',
        sourceListRefreshOnLoad: false,
        sourceListRefreshInterval: 10000,
        sourceReintrospectOnLoad: false,
        sourceReintrospectInterval: 10000,
        dataSources: [
          DataSourceMock.WIKI_JS
        ]
      };

      expect(AppSettings.fromJS(oldJS).toJS().clusters).to.deep.equal([
        {
          "name": "druid",
          "type": "druid",
          "host": "192.168.99.100",
          "introspectionStrategy": "segment-metadata-fallback",
          "sourceListRefreshInterval": 10000,
          "sourceListRefreshOnLoad": false,
          "sourceListScan": "auto",
          "sourceReintrospectInterval": 10000,
          "sourceReintrospectOnLoad": false,
          "timeout": 30000
        }
      ]);
    });

  });


  describe("general", () => {
    it("blank", () => {
      expect(AppSettings.BLANK.toJS()).to.deep.equal({
        "clusters": [],
        "customization": {},
        "dataSources": []
      });
    });

  });

});
