import { expect } from 'chai';
import * as sinon from 'sinon';
import '../../utils/jsdom-setup';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '../../utils/require-extensions';
import * as TestUtils from 'react-addons-test-utils';

import { $, Expression, Dataset } from 'plywood';
import { DownloadButton } from './download-button';

describe('DownloadButton', () => {
  it('adds the correct class', () => {
    var dataset = new Dataset({});
    var renderedComponent = TestUtils.renderIntoDocument(
      <DownloadButton
        dataset={dataset}
      />
    );

    expect(TestUtils.isCompositeComponent(renderedComponent), 'should be composite').to.equal(true);
    expect((ReactDOM.findDOMNode(renderedComponent) as any).className, 'should contain class').to.contain('download-button');
  });

});
