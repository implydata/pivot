import { expect } from 'chai';
import * as React from 'react';
import * as TestUtils from 'react-addons-test-utils';
import { findDOMNode } from '../../utils/test-utils/index';

import '../../utils/test-utils/index';

import { DimensionTileActions } from './dimension-tile-actions';

describe('DimensionTileActions', () => {
  it('adds the correct class', () => {
    var openOn = document.createElement('div');
    var renderedComponent = TestUtils.renderIntoDocument(
      <DimensionTileActions
        openOn={openOn}
        onClose={null}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('dimension-tile-actions');
  });

});
