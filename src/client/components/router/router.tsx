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
  breadCrumbs?: string[];
  rootFragment?: string;
}

export interface RouterState {
}

export class Router extends React.Component<RouterProps, RouterState> {
  public mounted: boolean;

  constructor() {
    super();

    this.onHashChange = this.onHashChange.bind(this);
  }

  componentDidMount() {
    this.updateBreadCrumbs(this.parseHash(window.location.hash));

    window.addEventListener('hashchange', this.onHashChange);
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHashChange);
  }

  parseHash(hash: string): string[] {
    const { rootFragment } = this.props;

    if (hash.charAt(0) === '#') hash = hash.substr(1);

    var breadCrumbs = hash.split('/');

    if (breadCrumbs[0] === rootFragment) breadCrumbs.shift();

    return breadCrumbs;
  }

  updateBreadCrumbs(breadCrumbs: string[]) {
    if (this.props.onURLChange) {
      this.props.onURLChange(breadCrumbs);
    }
  }

  onHashChange(event: HashChangeEvent) {
    this.updateBreadCrumbs(this.parseHash(event.newURL.split('#')[1]));
  }

  updateHash(defaultFragments: string[]) {
    const { breadCrumbs, rootFragment } = this.props;

    if (breadCrumbs) {
      window.location.hash = `#${rootFragment || ''}/${breadCrumbs.join('/')}`;
    } else {
      window.location.hash = `#${rootFragment || ''}/${defaultFragments[0]}`;
      this.updateBreadCrumbs([defaultFragments[0]]);
    }
  }

  componentDidUpdate() {
    this.updateHash(this.getFragments());
  }

  getFragments(): string[] {
    var children = this.props.children as JSX.Element[];

    const isNotRoute = (c: JSX.Element) => c.type !== Route;
    const hasNoFragment = (c: JSX.Element) => !c.props.fragment;

    if (children.some(isNotRoute) || children.some(hasNoFragment)) {
      throw new Error('Router only accepts Route elements with fragment as children');
    }

    return children.map((c) => c.props.fragment as string);
  }

  // This'll be put into the Route class later
  qualifyForCurrentRoute(child: JSX.Element): boolean {
    const { breadCrumbs } = this.props;

    if (!breadCrumbs || !breadCrumbs.length) return false;

    return child.props.fragment === breadCrumbs[0];
  }

  render() {
    const { children } = this.props;

    return <div className="router">
      {(children as any[]).filter(this.qualifyForCurrentRoute.bind(this))}
    </div>;
  }
}
