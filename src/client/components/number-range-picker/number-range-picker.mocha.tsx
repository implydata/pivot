import { expect } from 'chai';
import * as React from 'react';
import * as TestUtils from 'react-addons-test-utils';

import { findDOMNode } from '../../utils/test-utils/index';

import { NumberRangePicker } from './number-range-picker';

describe('NumberRangePicker', () => {
  it('adds the correct class', () => {
    var renderedComponent = TestUtils.renderIntoDocument(
      <NumberRangePicker
        start={2}
        end={10}
        rightBound={100}
        offSet={600}
        stepSize={2}
        onRangeStartChange={null}
        onRangeEndChange={null}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('number-range-picker');
  });

});
