require('./pivot-application.css');

import * as React from 'react';
import * as ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import * as Clipboard from 'clipboard';

import { List } from 'immutable';
import { DataSource, LinkViewConfig, LinkViewConfigJS, User, Customization} from '../../../common/models/index';

import { AboutModal } from '../about-modal/about-modal';
import { SideDrawer } from '../side-drawer/side-drawer';
import { HomeView } from '../home-view/home-view';
import { CubeView } from '../cube-view/cube-view';
import { LinkView } from '../link-view/link-view';

import { visualizations } from '../../visualizations/index';

export interface PivotApplicationProps extends React.Props<any> {
  version: string;
  dataSources: List<DataSource>;
  linkViewConfig?: LinkViewConfigJS;
  user?: User;
  maxFilters?: number;
  maxSplits?: number;
  customization?: Customization;
}

export interface PivotApplicationState {
  AboutModalAsync?: typeof AboutModal;
  ReactCSSTransitionGroupAsync?: typeof ReactCSSTransitionGroup;
  SideDrawerAsync?: typeof SideDrawer;

  drawerOpen?: boolean;
  selectedDataSource?: DataSource;
  viewType?: ViewType;
  viewHash?: string;
  linkViewConfig?: LinkViewConfig;
  showAboutModal?: boolean;
}

export type ViewType = "home" | "cube" | "link";

export const HOME: ViewType = "home";
export const CUBE: ViewType = "cube";
export const LINK: ViewType = "link";

export class PivotApplication extends React.Component<PivotApplicationProps, PivotApplicationState> {
  private hashUpdating: boolean = false;

  constructor() {
    super();
    this.state = {
      ReactCSSTransitionGroupAsync: null,
      SideDrawerAsync: null,
      drawerOpen: false,
      selectedDataSource: null,
      viewType: null,
      viewHash: null,
      linkViewConfig: null,
      showAboutModal: false
    };
    this.globalHashChangeListener = this.globalHashChangeListener.bind(this);
  }

  componentWillMount() {
    var { dataSources, linkViewConfig } = this.props;
    if (!dataSources.size) throw new Error('must have data sources');

    var hash = window.location.hash;
    var viewType = this.getViewTypeFromHash(hash);
    var selectedDataSource = this.getDataSourceFromHash(dataSources, hash);
    var viewHash = this.getViewHashFromHash(hash);

    // If datasource does not exit bounce to home
    if (viewType === CUBE && !selectedDataSource) {
      this.changeHash('');
      viewType = HOME;
    }

    if (viewType === HOME && dataSources.size === 1) {
      viewType = CUBE;
      selectedDataSource = dataSources.first();
    }

    this.setState({
      viewType,
      viewHash,
      selectedDataSource,
      linkViewConfig: linkViewConfig ? LinkViewConfig.fromJS(linkViewConfig, { dataSources, visualizations }) : null
    });
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.globalHashChangeListener);

    require.ensure(['clipboard'], (require) => {
      var Clipboard = require('clipboard');

      var clipboard = new Clipboard('.clipboard');

      clipboard.on('success', (e: any) => {
        // ToDo: do something here
      });
    }, 'clipboard');

    require.ensure(['react-addons-css-transition-group', '../side-drawer/side-drawer'], (require) => {
      this.setState({
        ReactCSSTransitionGroupAsync: require('react-addons-css-transition-group'),
        SideDrawerAsync: require('../side-drawer/side-drawer').SideDrawer
      });
    }, 'side-drawer');

    require.ensure(['../about-modal/about-modal'], (require) => {
      this.setState({
        AboutModalAsync: require('../about-modal/about-modal').AboutModal
      });
    }, 'about-modal');
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.globalHashChangeListener);
  }

  globalHashChangeListener(): void {
    if (this.hashUpdating) return;
    this.hashToState(window.location.hash);
  }

  hashToState(hash: string) {
    const { dataSources } = this.props;
    var viewType = this.getViewTypeFromHash(hash);
    var viewHash = this.getViewHashFromHash(hash);
    var newState: PivotApplicationState = {
      viewType,
      viewHash
    };

    if (viewType === CUBE) {
      var dataSource = this.getDataSourceFromHash(dataSources, hash);
      if (!dataSource) dataSource = dataSources.first();
      newState.selectedDataSource = dataSource;
    } else {
      newState.selectedDataSource = null;
    }

    this.setState(newState);
    this.sideDrawerOpen(false);
  }

  parseHash(hash: string): string[] {
    if (hash[0] === '#') hash = hash.substr(1);
    return hash.split('/');
  }

  getViewTypeFromHash(hash: string): ViewType {
    const { linkViewConfig } = this.props;
    var viewType = this.parseHash(hash)[0];
    if (!viewType || viewType === HOME) return linkViewConfig ? LINK : HOME;
    if (linkViewConfig && viewType === LINK) return LINK;
    return CUBE;
  }

  getDataSourceFromHash(dataSources: List<DataSource>, hash: string): DataSource {
    // can change header from hash
    var parts = this.parseHash(hash);
    var dataSourceName = parts.shift();
    return dataSources.find((ds) => ds.name === dataSourceName);
  }

  getViewHashFromHash(hash: string): string {
    var parts = this.parseHash(hash);
    if (parts.length < 2) return null;
    parts.shift();
    return parts.join('/');
  }

  sideDrawerOpen(drawerOpen: boolean): void {
    this.setState({ drawerOpen });
  }

  changeHash(hash: string, force = false): void {
    this.hashUpdating = true;
    window.location.hash = `#${hash}`;
    setTimeout(() => {
      this.hashUpdating = false;
    }, 5);
    if (force) this.hashToState(hash);
  }

  updateViewHash(viewHash: string, force = false): void {
    var { viewType } = this.state;

    var newHash: string;
    if (viewType === CUBE) {
      newHash = `${this.state.selectedDataSource.name}/${viewHash}`;
    } else if (viewType === LINK) {
      newHash = `${viewType}/${viewHash}`;
    } else {
      newHash = viewType;
    }

    this.changeHash(newHash, force);
  }

  getUrlPrefix(baseOnly = false): string {
    var { viewType } = this.state;
    var url = window.location;
    var urlBase = url.origin + url.pathname;
    if (baseOnly) return urlBase;

    var newPrefix: string;
    if (viewType === CUBE) {
      newPrefix = `${this.state.selectedDataSource.name}/`;
    } else {
      newPrefix = viewType;
    }

    return urlBase + '#' + newPrefix;
  }

  openAboutModal() {
    this.setState({
      showAboutModal: true
    });
  }

  onAboutModalClose() {
    this.setState({
      showAboutModal: false
    });
  }

  renderAboutModal() {
    const { AboutModalAsync, showAboutModal } = this.state;
    if (!AboutModalAsync || !showAboutModal) return null;
    return <AboutModalAsync onClose={this.onAboutModalClose.bind(this)}/>;
  }

  render() {
    var { dataSources, maxFilters, maxSplits, user, customization } = this.props;
    var { viewType, viewHash, selectedDataSource, ReactCSSTransitionGroupAsync, drawerOpen, SideDrawerAsync, linkViewConfig } = this.state;
    var sideDrawer: JSX.Element = null;
    if (drawerOpen && SideDrawerAsync) {
      var closeSideDrawer: () => void = this.sideDrawerOpen.bind(this, false);
      sideDrawer = <SideDrawerAsync
        key='drawer'
        selectedDataSource={selectedDataSource}
        dataSources={dataSources}
        onOpenAbout={this.openAboutModal.bind(this)}
        onClose={closeSideDrawer}
        customization={customization}
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

    var view: JSX.Element = null;
    switch (viewType) {
      case HOME:
        view = <HomeView
          user={user}
          dataSources={dataSources}
          onNavClick={this.sideDrawerOpen.bind(this, true)}
          onOpenAbout={this.openAboutModal.bind(this)}
          customization={customization}
        />;
        break;

      case CUBE:
        view = <CubeView
          user={user}
          dataSource={selectedDataSource}
          hash={viewHash}
          updateViewHash={this.updateViewHash.bind(this)}
          getUrlPrefix={this.getUrlPrefix.bind(this)}
          maxFilters={maxFilters}
          maxSplits={maxSplits}
          onNavClick={this.sideDrawerOpen.bind(this, true)}
          customization={customization}
        />;
        break;

      case LINK:
        view = <LinkView
          user={user}
          linkViewConfig={linkViewConfig}
          hash={viewHash}
          updateViewHash={this.updateViewHash.bind(this)}
          changeHash={this.changeHash.bind(this)}
          getUrlPrefix={this.getUrlPrefix.bind(this)}
          onNavClick={this.sideDrawerOpen.bind(this, true)}
          customization={customization}
        />;
        break;

      default:
        throw new Error('unknown view');
    }

    return <main className='pivot-application'>
      {view}
      {sideDrawerTransition}
      {this.renderAboutModal()}
    </main>;
  }
}
