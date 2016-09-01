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

import { Router, Request, Response } from 'express';
import { Dataset } from 'plywood';
import { AppSettings, Cluster, DataCube } from '../../../common/models/index';
import { MANIFESTS } from '../../../common/manifests/index';

import { PivotRequest } from '../../utils/index';
import { SETTINGS_MANAGER } from '../../config';

var router = Router();

router.get('/', (req: PivotRequest, res: Response) => {
  SETTINGS_MANAGER.getFullSettings()
    .then(
      (fullSettings) => {
        res.send({ appSettings: fullSettings.appSettings });
      },
      (e: Error) => {
        console.log('error:', e.message);
        if (e.hasOwnProperty('stack')) {
          console.log((<any>e).stack);
        }
        res.status(500).send({
          error: 'could not compute',
          message: e.message
        });
      }
    )
    .done();

});

router.post('/cluster-connection', (req: PivotRequest, res: Response) => {
  var { cluster } = req.body;

  if (typeof cluster === 'undefined') {
    res.status(400).send({
      error: 'must have a cluster'
    });
    return;
  }

  try {
    var testCluster = Cluster.fromJS(cluster);
  } catch (e) {
    res.status(400).send({
      error: 'invalid cluster',
      message: e.message
    });
    return;
  }

  SETTINGS_MANAGER.checkClusterConnectionInfo(testCluster)
    .then(
      (clusterAndSources) => {
        res.send(clusterAndSources);
      },
      (e: Error) => {
        console.log('error:', e.message);
        if (e.hasOwnProperty('stack')) {
          console.log((<any>e).stack);
        }
        res.status(500).send({
          error: 'could not compute',
          message: e.message
        });
      }
    )
    .done();
});

router.get('/cluster-sources', (req: PivotRequest, res: Response) => {
  SETTINGS_MANAGER.getAllClusterSources()
    .then(
      (clusterSources) => {
        res.send({ clusterSources: clusterSources });
      },
      (e: Error) => {
        console.log('error:', e.message);
        if (e.hasOwnProperty('stack')) {
          console.log((<any>e).stack);
        }
        res.status(500).send({
          error: 'could not compute',
          message: e.message
        });
      }
    )
    .done();
});

router.post('/attributes', (req: PivotRequest, res: Response) => {
  var { source, cluster, clusterName } = req.body;

  if (typeof source !== 'string') {
    res.status(400).send({
      error: 'must have a source'
    });
    return;
  }

  var testCluster: Cluster = null;
  if (typeof clusterName !== 'string') {
    if (typeof cluster === 'undefined') {
      res.status(400).send({
        error: 'must have a clusterName or cluster'
      });
      return;
    }

    try {
      testCluster = Cluster.fromJS(cluster);
    } catch (e) {
      res.status(400).send({
        error: 'invalid cluster',
        message: e.message
      });
      return;
    }
  }

  SETTINGS_MANAGER.getAllAttributes(source, testCluster || clusterName)
    .then(
      (attributes) => {
        res.send({ attributes: attributes });
      },
      (e: Error) => {
        console.log('error:', e.message);
        if (e.hasOwnProperty('stack')) {
          console.log((<any>e).stack);
        }
        res.status(500).send({
          error: 'could not compute',
          message: e.message
        });
      }
    )
    .done();
});

router.post('/preview', (req: PivotRequest, res: Response) => {
  var { dataCube } = req.body;

  if (typeof dataCube === 'undefined') {
    res.status(400).send({
      error: 'must have a dataCube'
    });
    return;
  }

  try {
    var previewDataCube = DataCube.fromJS(dataCube);
  } catch (e) {
    res.status(400).send({
      error: 'invalid DataCube',
      message: e.message
    });
    return;
  }

  SETTINGS_MANAGER.preview(previewDataCube)
    .then(
      (dataset: Dataset) => {
        res.send({ dataset });
      },
      (e: Error) => {
        console.log('error:', e.message);
        if (e.hasOwnProperty('stack')) {
          console.log((<any>e).stack);
        }
        res.status(500).send({
          error: 'could not compute',
          message: e.message
        });
      }
    )
    .done();
});

router.post('/', (req: PivotRequest, res: Response) => {
  var { appSettings } = req.body;

  try {
    var appSettingsObject = AppSettings.fromJS(appSettings, { visualizations: MANIFESTS });
  } catch (e) {
    res.status(400).send({
      error: 'bad settings',
      message: e.message
    });
    return;
  }

  SETTINGS_MANAGER.updateSettings(appSettingsObject)
    .then(
      () => {
        res.send({ status: 'ok' });
      },
      (e: Error) => {
        console.log('error:', e.message);
        if (e.hasOwnProperty('stack')) {
          console.log((<any>e).stack);
        }
        res.status(500).send({
          error: 'could not compute',
          message: e.message
        });
      }
    )
    .done();

});

export = router;
