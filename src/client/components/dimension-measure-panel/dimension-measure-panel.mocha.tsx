import { expect } from 'chai';
import * as sinon from 'sinon';
import '../../utils/jsdom-setup';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../utils/require-extensions';
import * as TestUtils from 'react-addons-test-utils';

import { $, Expression } from 'plywood';
import { DimensionMeasurePanel } from './dimension-measure-panel';

describe.skip('DimensionMeasurePanel', () => {
  it('adds the correct class', () => {
    var renderedComponent = TestUtils.renderIntoDocument(
      <DimensionMeasurePanel
        clicker={null}
        essence={null}
        menuStage={null}
        triggerFilterMenu={null}
        triggerSplitMenu={null}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('dimension-measure-panel');
  });

});
