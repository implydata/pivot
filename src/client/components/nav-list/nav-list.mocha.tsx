import { expect } from 'chai';
import * as sinon from 'sinon';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as TestUtils from 'react-addons-test-utils';

import '../../utils/test-utils/index';

import { $, Expression } from 'plywood';
import { NavList } from './nav-list';

import { CustomizationMock } from '../../../common/models/mocks';

describe('NavList', () => {
  it('adds the correct class. tabs disabled', () => {
    var renderedComponent = TestUtils.renderIntoDocument(
      <NavList
        navLinks={[]}
        customization={CustomizationMock.pivot()}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('nav-list');
  });
  it('adds the correct class. tabs enabled', () => {
    var customizationWithTabsEnabled = CustomizationMock.pivot();
    customizationWithTabsEnabled.tabsMode = true;
    var renderedComponent = TestUtils.renderIntoDocument(
      <NavList
        navLinks={[]}
        customization={customizationWithTabsEnabled}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('tabs');
  });

});
