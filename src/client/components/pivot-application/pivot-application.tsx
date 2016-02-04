'use strict';
require('./pivot-application.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import { List } from 'immutable';
import { DataSource, CubeEssence } from "../../../common/models/index";

import { HeaderBar } from '../header-bar/header-bar';
import { SideDrawer, SideDrawerProps } from '../side-drawer/side-drawer';
import { CubeView } from '../cube-view/cube-view';

import { visualizations } from '../../visualizations/index';

export interface PivotApplicationProps extends React.Props<any> {
  version: string;
  dataSources: List<DataSource>;
  homeLink?: string;
  maxFilters?: number;
  maxSplits?: number;
  showLastUpdated?: boolean;
  hideGitHubIcon?: boolean;
  headerBackground?: string;
}

export interface PivotApplicationState {
  ReactCSSTransitionGroupAsync?: typeof ReactCSSTransitionGroup;
  SideDrawerAsync?: typeof SideDrawer;
  essence?: CubeEssence;
  drawerOpen?: boolean;

  hash?: string;
  dataSources?: List<DataSource>;
  selectedDataSource?: DataSource;
}

export class PivotApplication extends React.Component<PivotApplicationProps, PivotApplicationState> {
  private hashUpdating: boolean = false;

  constructor() {
    super();
    this.state = {
      ReactCSSTransitionGroupAsync: null,
      SideDrawerAsync: null,
      essence: null,
      drawerOpen: false,
      hash: window.location.hash,
      dataSources: null,
      selectedDataSource: null
    };


    this.globalHashChangeListener = this.globalHashChangeListener.bind(this);
  }

  componentWillMount() {
    var { dataSources } = this.props;
    if (!dataSources.size) throw new Error('must have data sources');
    var selectedDataSource = dataSources.first();
    var hash = window.location.hash;
    var hashDataSource = this.getDataSourceFromHash(hash, dataSources);
    if (hashDataSource && !hashDataSource.equals(selectedDataSource)) selectedDataSource = hashDataSource;
    this.setState({ hash, dataSources, selectedDataSource });
  }

  getDataSourceFromHash(hash: string, dataSources? : List<DataSource>) : DataSource {
    // can change header from hash
    if (hash[0] === '#') hash = hash.substr(1);
    var parts = hash.split('/');
    if (parts.length < 4) return null;
    var dataSourceName = parts.shift();
    var dataSource = dataSources.find((ds) => ds.name === dataSourceName);
    return dataSource;
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.globalHashChangeListener);

    require.ensure([
      'react-addons-css-transition-group',
      '../side-drawer/side-drawer'
    ], (require) => {
      this.setState({
        ReactCSSTransitionGroupAsync: require('react-addons-css-transition-group'),
        SideDrawerAsync: require('../side-drawer/side-drawer').SideDrawer
      });
    }, 'side-drawer');
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.globalHashChangeListener);
  }

  changeDataSource(dataSource: DataSource) {
    if (!this.state.selectedDataSource.equals(dataSource)) {
      this.setState({ selectedDataSource: dataSource });
    }
  };

  globalHashChangeListener(): void {
    if (this.hashUpdating) return;
    var hash = window.location.hash;
    this.setState({ hash });
    var dataSource = this.getDataSourceFromHash(hash, this.state.dataSources);
    this.changeDataSource(dataSource);
  }

  sideDrawerOpen(drawerOpen: boolean): void {
    this.setState({ drawerOpen });
  }

  updateHash(newHash: string): void {
    this.hashUpdating = true;
    window.location.hash = newHash;
    //setTimeout(() => {
    this.hashUpdating = false;
  //  }, 10);
  }

  render() {
    var { homeLink, maxFilters, maxSplits, showLastUpdated, hideGitHubIcon, headerBackground } = this.props;
    var { ReactCSSTransitionGroupAsync, drawerOpen, SideDrawerAsync } = this.state;

    var sideDrawer: JSX.Element = null;
    if (drawerOpen && SideDrawerAsync) {
      var closeSideDrawer: () => void = this.sideDrawerOpen.bind(this, false);
      sideDrawer = <SideDrawerAsync
        key='drawer'
        changeDataSource={this.changeDataSource.bind(this)}
        selectedDataSource={this.state.selectedDataSource}
        dataSources={this.state.dataSources}
        onClose={closeSideDrawer}
        homeLink={homeLink}
      />;
    }

    if (ReactCSSTransitionGroupAsync) {
      var sideDrawerTransition = <ReactCSSTransitionGroupAsync
        component="div"
        className="side-drawer-container"
        transitionName="side-drawer"
        transitionEnterTimeout={500}
        transitionLeaveTimeout={300}
      >
        {sideDrawer}
      </ReactCSSTransitionGroupAsync>;
    }

    return <main className='pivot-application'>
      <HeaderBar
        dataSource={this.state.selectedDataSource}
        onNavClick={this.sideDrawerOpen.bind(this, true)}
        showLastUpdated={showLastUpdated}
        hideGitHubIcon={hideGitHubIcon}
        color={headerBackground}
      />
      <CubeView
        updateHash={this.updateHash.bind(this)}
        selectedDataSource={this.state.selectedDataSource}
        hash={this.state.hash}
        dataSources={this.state.dataSources}
        maxFilters={maxFilters}
        maxSplits={maxSplits}
      />
      {sideDrawerTransition}
    </main>;
  }
}
