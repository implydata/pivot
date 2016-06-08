import { findDOMNode } from '../../utils/test-utils/index';

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as TestUtils from 'react-addons-test-utils';
import { $, Expression } from 'plywood';

import { DataSourceMock, EssenceMock } from '../../../common/models/mocks';


import { Router, Route } from './router';

describe.only('Router', () => {
  var node: Element;
  var component: React.Component<any, any>;

  var updateProps: (newProps: any) => void;
  var updateHash: (newHash: string) => void;

  var isActiveRoute: (route: string) => void;

  beforeEach(() => {
    window.location.hash = 'root/bar';

    node = document.createElement('div');

    component = ReactDOM.render(

      <Router rootFragment="root">
        <Route fragment="foo"><div className="foo-class">foo</div></Route>

        <Route fragment="bar"><div className="bar-class">bar</div></Route>

        <Route fragment="baz"><div className="baz-class">baz</div></Route>
      </Router>

    , node);

    updateProps = (newProps: any) => {
      let newComponent = React.createElement(Router, newProps, component.props.children);
      ReactDOM.render(newComponent, node);
    };

    updateHash = (newHash: string) => {
      window.location.hash = newHash;

      var event = document.createEvent('HashChangeEvent');
      event.initEvent('hashchange', true, true);
      window.dispatchEvent(event);
    };

    isActiveRoute = (route: string) => {
      expect(window.location.hash, 'window.location.hash should be').to.equal(route);
    };
  });


  it('initializes to the location', () => {
    expect((findDOMNode(component) as any).className, 'should contain class').to.equal('bar-class');
    isActiveRoute('#root/bar');
  });


  it('follows the window.location.hash\'s changes', () => {
    updateHash('#root/baz');

    expect((findDOMNode(component) as any).className, 'should contain class').to.equal('baz-class');
    isActiveRoute('#root/baz');
  });

});
