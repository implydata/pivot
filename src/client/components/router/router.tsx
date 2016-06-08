require('./router.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
import { SvgIcon } from '../svg-icon/svg-icon';

export interface RouteProps extends React.Props<any> {
  fragment: string;
}

export interface RouteState {
}

export class Route extends React.Component<RouteProps, RouteState> {
  constructor() {
    super();
  }

  render() {
    return this.props.children as JSX.Element || null;
  }
}


export interface RouterProps extends React.Props<any> {
  onURLChange?: (breadCrumbs: string[]) => void;
  rootFragment?: string;
}

export interface RouterState {
  hash?: string;
}

export class Router extends React.Component<RouterProps, RouterState> {
  public mounted: boolean;

  constructor() {
    super();

    this.state = {};

    this.onHashChange = this.onHashChange.bind(this);
  }

  componentDidMount() {
    this.onHashChange();
    window.addEventListener('hashchange', this.onHashChange);
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHashChange);
  }

  parseHash(hash: string): string[] {
    if (!hash) return [];

    if (hash.charAt(0) === '#') hash = hash.substr(1);

    var fragments = hash.split('/');

    if (fragments[0] === this.props.rootFragment) fragments.shift();

    return fragments;
  }

  onHashChange() {
    var crumbs = this.parseHash(window.location.hash);

    var children = this.props.children as JSX.Element[];

    if (crumbs.length === 0) {
      let defaultFragment = this.getDefaultFragment(children);
      window.location.hash = window.location.hash + '/' + defaultFragment;
      return;
    }

    // var child = this.getQualifiedChild(children, crumbs);
    // console.log(child.props.fragment);

    if (this.props.onURLChange) {
      this.props.onURLChange(crumbs);
    }

    this.setState({hash: window.location.hash});
  }

  getDefaultFragment(children: JSX.Element[]): string {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];

      if (child.type === Route) {
        return child.props.fragment;
      }
    }

    return undefined;
  }

  getQualifiedRoute(candidates: JSX.Element[], crumbs: string[]): {fragment?: string, route?: JSX.Element} {
    var isRoute = (element: JSX.Element) => element.type === Route;

    for (let i = 0; i < candidates.length; i++) {
      let candidate = candidates[i];
      let fragment = candidate.props.fragment;

      if (!fragment) continue;

      if (crumbs[0] === fragment || fragment.charAt(0) === ':') {
        if (!(candidate.props.children instanceof Array)) {
          return {fragment, route: candidate};
        } else if (crumbs.length === 1) {
          return {fragment, route: candidate};
        } else {
          return this.getQualifiedRoute(candidate.props.children, crumbs.slice(1));
        }
      }
    }

    return {};
  }

  isRoute(candidate: JSX.Element): boolean {
    if (!candidate) return false;
    return candidate.type === Route;
  }

  isSimpleRoute(route: JSX.Element): boolean {
    if (!route) return false;

    return !(route.props.children instanceof Array);
  }

  // canDefaultToSubRoute(route: JSX.Element): boolean {
  //   if (!route) return false;

  //   if (this.isSimpleRoute(route)) return false;

  //   var children = route.props.children;

  //   return children.some((child) => {
  //     if (this.isRoute(child) && child.props.fragment.charAt(0))
  //   });
  // }

  getDefaultRoute(route: JSX.Element): JSX.Element {
    if (!route) return null;

    return route.props.children.filter((child: JSX.Element) => !this.isRoute(child))[0];
  }

  getQualifiedChild(candidates: JSX.Element[], crumbs: string[]): JSX.Element {

    var fillProps = (child: JSX.Element, crumbs: string[], fragment: string): JSX.Element => {
      let newProps: any = {};
      fragment.split('/').forEach((bit, i) => {
        if (bit.charAt(0) !== ':') return;
        newProps[bit.slice(1)] = crumbs.shift();
      });

      return React.cloneElement(child, newProps);
    };

    var {route, fragment}  = this.getQualifiedRoute(candidates, crumbs);

    if (this.isSimpleRoute(route)) {
      return fillProps(route.props.children, crumbs, fragment);
    }

    if (this.getDefaultRoute(route)) {
      return fillProps(this.getDefaultRoute(route), crumbs, fragment);
    }

    return null;
  }

  render() {
    const { children } = this.props;
    const { hash } = this.state;

    if (hash === undefined) return <div/>; // returning null causes the tests to fail...

    const crumbs = this.parseHash(hash);
    if (!crumbs || !crumbs.length) return null;

    var qualifiedChild = this.getQualifiedChild(children as JSX.Element[], crumbs);
    return qualifiedChild ? qualifiedChild : null;
  }
}
