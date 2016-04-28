import { expect } from 'chai';
import * as sinon from 'sinon';
import '../../utils/jsdom-setup';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../utils/require-extensions';
import * as TestUtils from 'react-addons-test-utils';

import { $, Expression } from 'plywood';
import { HoverMultiBubble } from './hover-multi-bubble';

describe.skip('HoverMultiBubble', () => {
  it('adds the correct class', () => {
    var renderedComponent = TestUtils.renderIntoDocument(
      <HoverMultiBubble
        left={null}
        top={null}
        segmentLabel={null}
        colorEntries={null}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('hover-multi-bubble');
  });

});
