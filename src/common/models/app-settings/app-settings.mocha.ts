import { expect } from 'chai';
import { testImmutableClass } from 'immutable-class/build/tester';

import { $, Expression } from 'plywood';
import { AppSettings } from './app-settings';
import { AppSettingsMock } from './app-settings.mock';

describe('AppSettings', () => {
  it('is an immutable class', () => {
    testImmutableClass(AppSettings, [
      AppSettingsMock.WIKI_ONLY_JS,
      AppSettingsMock.WIKI_TWITTER_JS
    ]);
  });

  describe("errors", () => {
    it("errors if there is no good cluster", () => {
      var js = AppSettingsMock.WIKI_ONLY_JS;
      js.clusters = [];
      expect(() => AppSettings.fromJS(js)).to.throw("Can not find cluster 'druid' for data source 'wiki'");
    });

  });

});
