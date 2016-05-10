import { expect } from 'chai';
import * as React from 'react';
import * as TestUtils from 'react-addons-test-utils';

import '../../utils/jsdom-setup';
import '../../utils/require-extensions';
import { findDOMNode } from '../../utils/test-utils/index';

import { DropdownMenu } from './dropdown-menu';

describe('DropdownMenu', () => {
  it('adds the correct class', () => {
    var renderedComponent = TestUtils.renderIntoDocument(
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('dropdown-menu');
  });

});
