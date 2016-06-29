require('./home-view.css');

import * as React from 'react';
import { Stage, DataSource, User, Customization } from '../../../common/models/index';
import { STRINGS } from '../../config/constants';
import { Fn } from '../../../common/utils/general/general';

import { HomeHeaderBar } from '../../components/home-header-bar/home-header-bar';
import { SvgIcon } from '../../components/svg-icon/svg-icon';
import { ItemCard } from './item-card/item-card';

export interface HomeViewProps extends React.Props<any> {
  dataSources?: DataSource[];
  user?: User;
  onNavClick?: Fn;
  onOpenAbout: Fn;
  customization?: Customization;
}

export interface HomeViewState {
}

export class HomeView extends React.Component< HomeViewProps, HomeViewState> {

  goToCube(cube: DataSource) {
    window.location.hash = '#' + cube.name;
  }

  renderCube(cube: DataSource): JSX.Element {
    return <ItemCard
      key={cube.name}
      title={cube.title}
      description={cube.description}
      icon="full-cube"
      onClick={this.goToCube.bind(this, cube)}
    />;
  }

  renderCubes(cubes: DataSource[]): JSX.Element {
    return <div className="datacubes">
      <div className="title">{STRINGS.dataSources}</div>
      <div className="cubes-container">
        {cubes.map(this.renderCube, this)}

        {/* So that the last item doesn't span on the entire row*/}
        <div className="item-card empty"/>
        <div className="item-card empty"/>
        <div className="item-card empty"/>
        <div className="item-card empty"/>
      </div>
    </div>;
  }

  render() {
    const { user, dataSources, onNavClick, onOpenAbout, customization } = this.props;

    return <div className="home-view">
      <HomeHeaderBar
        user={user}
        onNavClick={onNavClick}
        customization={customization}
        title={STRINGS.home}
      >
        <button className="text-button" onClick={onOpenAbout}>
          {STRINGS.infoAndFeedback}
        </button>
      </HomeHeaderBar>

      <div className="container">
        {this.renderCubes(dataSources)}
      </div>

    </div>;
  }
}
