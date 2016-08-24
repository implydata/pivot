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

import * as Q from 'q';
import { Timezone } from 'chronoshift';
import { Expression, Dataset, ChainExpression, SplitAction } from 'plywood';
import { DataCube } from "../../../common/models/data-cube/data-cube";
import { Ajax } from '../ajax/ajax';


function getSplitsDescription(ex: Expression): string {
  var splits: string[] = [];
  ex.forEach((ex) => {
    if (ex instanceof ChainExpression) {
      ex.actions.forEach((action) => {
        if (action instanceof SplitAction) {
          splits.push(action.firstSplitExpression().toString());
        }
      });
    }
  });
  return splits.join(';');
}


export class QueryRunner {
  static URL = 'plywood';

  static fetch(dataCube: DataCube, expression: Expression, timezone: Timezone): Q.Promise<Dataset> {
    return Ajax.query({
      method: "POST",
      url: QueryRunner.URL + '?by=' + getSplitsDescription(expression),
      data: {
        dataCube: dataCube.name,
        expression: expression.toJS(),
        timezone
      }
    }).then((res) => Dataset.fromJS(res.result));
  }
}
