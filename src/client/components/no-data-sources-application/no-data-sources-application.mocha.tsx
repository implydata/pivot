import { expect } from 'chai';
import * as sinon from 'sinon';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as TestUtils from 'react-addons-test-utils';

import '../../utils/test-utils/index';

import { $, Expression } from 'plywood';
import { NoDataSourcesApplication } from './no-data-sources-application';

describe('NoDataSourcesApplication', () => {
  it('adds the correct class', () => {
    var renderedComponent = TestUtils.renderIntoDocument(
      <NoDataSourcesApplication

      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('no-data-sources-application');
  });

});
