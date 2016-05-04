import { expect } from 'chai';
import '../../utils/jsdom-setup';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../utils/require-extensions';
import * as TestUtils from 'react-addons-test-utils';
import { Timezone } from 'chronoshift';
import { SettingsMenu } from './settings-menu';

// skipping until can use findDomNode function that handles body portal
describe.skip('SettingsMenu', () => {

  it('adds the correct class', () => {
    var openOn = document.createElement('div');

    var renderedComponent = TestUtils.renderIntoDocument(
      <SettingsMenu
        onClose={null}
        openOn={openOn}
        changeTimezone={() => {}}
        timezone={Timezone.UTC}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('settings-menu');
  });

});
