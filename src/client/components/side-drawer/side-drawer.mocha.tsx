import { expect } from 'chai';
import * as sinon from 'sinon';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import '../../utils/test-utils/index';

import * as TestUtils from 'react-addons-test-utils';

import { $, Expression } from 'plywood';
import { SideDrawer } from './side-drawer';

import { CustomizationMock } from '../../../common/models/mocks';

describe.skip('SideDrawer', () => {
  it('adds the correct class', () => {
    var renderedComponent = TestUtils.renderIntoDocument(
      <SideDrawer
        dataSources={null}
        selectedDataSource={null}
        onOpenAbout={null}
        onClose={null}
        />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('side-drawer');
  });
  it('does not add the correct class if tabsMode flag is enabled', () => {
    var customizationWithTabsEnabled = CustomizationMock.pivot();
    customizationWithTabsEnabled.tabsMode = true;
    var renderedComponent = TestUtils.renderIntoDocument(
      <SideDrawer
        dataSources={null}
        selectedDataSource={null}
        onOpenAbout={null}
        onClose={null}
        customization={customizationWithTabsEnabled}
        />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.not.contain('side-drawer');
  });

});
