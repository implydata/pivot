require('./cluster-edit.css');

import * as React from 'react';
import { List } from 'immutable';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';

// import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
// import { SimpleList } from '../../../components/simple-list/simple-list';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';
// import { ImmutableList } from '../../../components/immutable-list/immutable-list';
// import { Dropdown, DropdownProps } from '../../../components/dropdown/dropdown';

// import { DimensionModal } from '../dimension-modal/dimension-modal';
// import { MeasureModal } from '../measure-modal/measure-modal';

import { AppSettings, Cluster } from '../../../../common/models/index';

// Shamelessly stolen from http://stackoverflow.com/a/10006499
// (well, traded for an upvote)
const IP_REGEX = /^(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))$/;

export interface ClusterEditProps extends React.Props<any> {
  settings: AppSettings;
  clusterId?: string;
  onSave: (settings: AppSettings) => void;
}

export interface ClusterEditState {
  tempCluster?: Cluster;
  hasChanged?: boolean;
  canSave?: boolean;
  cluster?: Cluster;
  errors?: any;
}

export class ClusterEdit extends React.Component<ClusterEditProps, ClusterEditState> {
  constructor() {
    super();

    this.state = {hasChanged: false, canSave: true, errors: {}};
  }

  componentWillReceiveProps(nextProps: ClusterEditProps) {
    if (nextProps.settings) {
      this.initFromProps(nextProps);
    }
  }

  initFromProps(props: ClusterEditProps) {
    let cluster = props.settings.clusters.filter((d) => d.name === props.clusterId)[0];

    this.setState({
      tempCluster: cluster,
      hasChanged: false,
      canSave: true,
      cluster
    });
  }

  cancel() {
    this.initFromProps(this.props);
  }

  save() {
    const { settings } = this.props;
    const { tempCluster, cluster } = this.state;

    var newClusters = settings.clusters;
    newClusters[newClusters.indexOf(cluster)] = tempCluster;
    var newSettings = settings.changeClusters(newClusters);

    if (this.props.onSave) {
      this.props.onSave(newSettings);
    }
  }

  goBack() {
    const { clusterId } = this.props;
    var hash = window.location.hash;
    window.location.hash = hash.replace(`/${clusterId}`, '');
  }

  onSimpleChange(newCluster: Cluster, isValid: boolean) {
    const { cluster } = this.state;

    const hasChanged = !isValid || !cluster.equals(newCluster);

    if (isValid) {
      this.setState({
        tempCluster: newCluster,
        canSave: true,
        hasChanged
      });
    } else {
      this.setState({
        canSave: false,
        hasChanged
      });
    }
  }

  renderGeneral(): JSX.Element {
    const helpTexts: any = {};
    const { tempCluster, errors } = this.state;

    return <form className="general vertical">
      <FormLabel label="Host" helpText={helpTexts.host}></FormLabel>
      <ImmutableInput
        instance={tempCluster}
        path={'host'}
        onChange={this.onSimpleChange.bind(this)}
        focusOnStartUp={true}
        validator={IP_REGEX}
      />

      <FormLabel label="Timeout" helpText={helpTexts.timeout}></FormLabel>
      <ImmutableInput instance={tempCluster} path={'timeout'} onChange={this.onSimpleChange.bind(this)}/>

      <FormLabel label="Refresh interval" helpText={helpTexts.sourceListRefreshInterval}></FormLabel>
      <ImmutableInput instance={tempCluster} path={'sourceListRefreshInterval'} onChange={this.onSimpleChange.bind(this)}/>
    </form>;
  }


  render() {
    const { tempCluster, hasChanged, canSave } = this.state;

    if (!tempCluster) return null;

    return <div className="cluster-edit">
      <div className="title-bar">
        <Button className="button back" type="secondary" svg={require('../../../icons/full-back.svg')} onClick={this.goBack.bind(this)}/>
        <div className="title">{tempCluster.name}</div>
        {hasChanged ? <div className="button-group">
          <Button className="cancel" title="Cancel" type="secondary" onClick={this.cancel.bind(this)}/>
          <Button className={classNames("save", {disabled: !canSave})} title="Save" type="primary" onClick={this.save.bind(this)}/>
        </div> : null}
      </div>
      <div className="content">
        {this.renderGeneral()}
      </div>

    </div>;
  }
}
