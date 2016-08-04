/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('./router.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataCube, Filter, Dimension, Measure } from '../../../common/models/index';
import { SvgIcon } from '../svg-icon/svg-icon';

export interface RouteProps extends React.Props<any> { fragment: string; alwaysShowOrphans?: boolean; }
export interface RouteState {}
export class Route extends React.Component<RouteProps, RouteState> {}


export interface QualifiedPath {
  route: JSX.Element;
  fragment: string;
  crumbs: string[];
  wasDefaultChoice?: boolean;
  properties?: any;
  orphans?: JSX.Element[];
}

export interface RouterProps extends React.Props<any> {
  hash: string;
  onURLChange?: (breadCrumbs: string[]) => void;
  rootFragment?: string;
}

export interface RouterState {
  hash?: string;
}

const HASH_SEPARATOR = /\/+/;

export class Router extends React.Component<RouterProps, RouterState> {
  public mounted: boolean;

  constructor() {
    super();
    this.state = {};
  }

  componentDidMount() {
    this.onHashChange(window.location.hash);
  }

  componentWillReceiveProps(nextProps: RouterProps) {
    if (this.props.hash !== nextProps.hash) this.onHashChange(nextProps.hash);
  }

  parseHash(hash: string): string[] {
    if (!hash) return [];

    if (hash.charAt(0) === '#') hash = hash.substr(1);

    hash = hash.replace(new RegExp('^' + this.props.rootFragment, 'gi'), '');

    var fragments = hash.split(HASH_SEPARATOR);

    return fragments.filter(Boolean);
  }

  sanitizeHash(hash: string): string {
    const { rootFragment } = this.props;
    const fragments = this.parseHash(hash);

    if (fragments.length === 0) return '#' + rootFragment;

    return `#${rootFragment}/${fragments.join('/')}`;
  }

  replaceHash(newHash: string) {
    // Acts like window.location.hash = newHash but doesn't clutter the history
    // See http://stackoverflow.com/a/23924886/863119
    window.history.replaceState(undefined, undefined, newHash);
    this.onHashChange(newHash);
  }

  hasExtraFragments(route: QualifiedPath): boolean {
    return route.crumbs.length > route.fragment.split(HASH_SEPARATOR).length;
  }

  stripUnnecessaryFragments(route: QualifiedPath, crumbs: string[]) {
    const { rootFragment } = this.props;
    const fragments = route.fragment.split(HASH_SEPARATOR);

    const parentFragment = crumbs.join('/').replace(route.crumbs.join('/'), '').replace(/\/$/, '');
    const strippedRouteCrumbs = route.crumbs.slice(0, route.fragment.split(HASH_SEPARATOR).length);

    const strippedCrumbs = [
      rootFragment,
      parentFragment,
      strippedRouteCrumbs.join('/')
    ].filter(Boolean);

    this.replaceHash('#' + strippedCrumbs.join('/'));
  }

  onHashChange(hash: string) {
    const { rootFragment } = this.props;

    var safeHash = this.sanitizeHash(hash);
    if (hash !== safeHash) {
      this.replaceHash(safeHash);
      return;
    }

    var crumbs = this.parseHash(hash);

    var children = this.props.children as JSX.Element[];

    // Default path
    if (crumbs.length === 0) {
      let defaultFragment = this.getDefaultFragment(children);

      if (defaultFragment) {
        this.replaceHash(hash + '/' + defaultFragment);
        return;
      }
    }

    var path = this.getQualifiedPath(children, crumbs);

    if (path.wasDefaultChoice) {
      crumbs.pop();
      crumbs.push(path.fragment);
      this.replaceHash('#' + [rootFragment].concat(crumbs).join('/'));
      return;
    }

    // Unnecessary fragments
    if (this.hasExtraFragments(path)) {
      this.stripUnnecessaryFragments(path, crumbs);
      return;
    }

    // Default child for this path
    if (this.canDefaultDeeper(path.fragment, path.crumbs)) {
      crumbs = crumbs.concat(this.getDefaultDeeperCrumbs(path.fragment, path.crumbs));
      this.replaceHash('#' + [rootFragment].concat(crumbs).join('/'));
    }

    if (this.props.onURLChange) {
      this.props.onURLChange(crumbs);
    }

    this.setState({hash: window.location.hash});
  }

  getDefaultDeeperCrumbs(fragment: string, crumbs: string[]): string[] {
    var bits = fragment.split(HASH_SEPARATOR);

    bits.splice(0, crumbs.length);

    return bits.map((bit) => bit.match(/^:[^=]+=(\w+)$/)[1]);
  }

  canDefaultDeeper(fragment: string, crumbs: string[]): boolean {
    var bits = fragment.split(HASH_SEPARATOR);

    if (bits.length === crumbs.length) return false;

    bits.splice(0, crumbs.length);

    return bits.every((bit) => /^:[^=]+=\w+$/.test(bit));
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

  extend(a: any, b: any): any {
    for (let key in a) {
      b[key] = a[key];
    }

    return b;
  }

  getQualifiedPath(candidates: JSX.Element[], crumbs: string[], properties={}, orphans: JSX.Element[]=[]): QualifiedPath {
    // In case there's only one route
    if (this.isRoute(candidates as any)) {
      candidates = ([candidates as any]) as JSX.Element[];
    }

    for (let i = 0; i < candidates.length; i++) {
      let candidate = candidates[i];

      if (this.isAComment(candidate)) continue;

      let fragment = candidate.props.fragment;

      if (!fragment) continue;

      properties = this.extend(this.getPropertiesFromCrumbs(crumbs, fragment), properties);

      if (crumbs[0] === fragment || fragment.charAt(0) === ':') {
        let children = candidate.props.children;

        if (!(children instanceof Array) || crumbs.length === 1) {
          return {fragment, route: candidate, crumbs, properties, orphans};
        } else {
          if (candidate.props.alwaysShowOrphans === true) {
            orphans = orphans.concat(children.filter(this.isSimpleChild, this));
          }

          return this.getQualifiedPath(children, crumbs.slice(1), properties, orphans);
        }
      }
    }

    // If we are here, it means no route has been found and we should
    // return a default one.
    var route = candidates.filter(this.isRoute)[0];
    var fragment = route.props.fragment;
    properties = this.extend(this.getPropertiesFromCrumbs(crumbs, fragment), properties);
    return {fragment, route, crumbs, wasDefaultChoice: true, properties, orphans};
  }

  hasSingleChild(route: JSX.Element): boolean {
    if (!route) return false;

    return !(route.props.children instanceof Array);
  }

  isRoute(candidate: JSX.Element): boolean {
    if (!candidate) return false;
    return candidate.type === Route;
  }

  // Those pesky <!-- react-empty: 14 --> thingies...
  isAComment(candidate: JSX.Element): boolean {
    if (!candidate) return false;
    return candidate.type === undefined;
  }

  isSimpleChild(candidate: JSX.Element): boolean {
    if (!candidate) return false;
    return !this.isAComment(candidate) && !this.isRoute(candidate);
  }

  getSimpleChildren(parent: JSX.Element): JSX.Element[] {
    if (!parent) return null;
    return parent.props.children.filter(this.isSimpleChild, this);
  }

  getPropertiesFromCrumbs(crumbs: string[], fragment: string, props: any = {}): any {
    let fragmentToKey = (f: string) => f.slice(1).replace(/=.*$/, '');

    let myCrumbs = crumbs.concat();
    fragment.split(HASH_SEPARATOR).forEach((bit, i) => {
      if (bit.charAt(0) !== ':') return;
      props[fragmentToKey(bit)] = myCrumbs.shift();
    });

    return props;
  }

  getQualifiedChild(candidates: JSX.Element[], crumbs: string[]): JSX.Element | JSX.Element[] {
    var fillProps = (child: JSX.Element, path: QualifiedPath, i=0): JSX.Element => {
      return React.cloneElement(child, this.extend(path.properties, {key: i}));
    };

    var elements: JSX.Element[];

    var path = this.getQualifiedPath(candidates, crumbs);

    if (this.hasSingleChild(path.route)) {
      elements = path.orphans.map((orphan, i) => fillProps(orphan, path, i))
        .concat([fillProps(path.route.props.children, path, path.orphans.length)])
        ;

    } else {
      var children = this.getSimpleChildren(path.route);

      if (children.length === 0) return null;

      elements = children
        .map((child, i) => fillProps(child, path, i))
        .concat(path.orphans.map((orphan, i) => fillProps(orphan, path, children.length + i)))
        ;

    }

    if (!elements) return null;
    if (elements.length === 1) return elements[0];
    return elements;
  }

  render() {
    const { children } = this.props;
    const { hash } = this.state;

    if (hash === undefined) return null;

    const crumbs = this.parseHash(hash);
    if (!crumbs || !crumbs.length) return null;

    const qualifiedChildren = this.getQualifiedChild(children as JSX.Element[], crumbs) as any;

    // I wish it wouldn't need an enclosing element but...
    // https://github.com/facebook/react/issues/2127
    return <div className="route-wrapper">{qualifiedChildren}</div>;
  }
}
