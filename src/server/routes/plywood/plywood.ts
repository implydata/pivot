import { Router, Request, Response } from 'express';
import { $, Expression, RefExpression, External, Datum, Dataset, PlywoodValue, TimeRange, basicExecutorFactory, Executor, AttributeJSs, helper } from 'plywood';
import { Timezone, WallTime, Duration } from 'chronoshift';

import { PivotRequest } from '../../utils/index';

var router = Router();

router.post('/', (req: PivotRequest, res: Response) => {
  var { version, dataSource, expression, timezone } = req.body;

  if (version && version !== req.version) {
    res.status(412).send({
      error: 'incorrect version',
      action: 'reload'
    });
    return;
  }

  if (typeof dataSource !== 'string') {
    res.status(400).send({
      error: 'must have a dataSource'
    });
    return;
  }

  var queryTimezone: Timezone = null;
  if (typeof timezone === 'string') {
    try {
      queryTimezone = Timezone.fromJS(timezone);
    } catch (e) {
      res.status(400).send({
        error: 'bad timezone',
        message: e.message
      });
      return;
    }
  }

  var ex: Expression = null;
  try {
    ex = Expression.fromJS(expression);
  } catch (e) {
    res.status(400).send({
      error: 'bad expression',
      message: e.message
    });
    return;
  }

  req.getSettings(dataSource)
    .then((appSettings) => {
      var myDataSource = appSettings.getDataSource(dataSource);
      if (!myDataSource) {
        res.status(400).send({ error: 'unknown data source' });
        return;
      }

      if (!myDataSource.executor) {
        res.status(400).send({ error: 'un queryable data source' });
        return;
      }

      return myDataSource.executor(ex, { timezone: queryTimezone }).then(
        (data: PlywoodValue) => {
          res.json({
            result: Dataset.isDataset(data) ? data.toJS() : data
          });
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
      );
    })
    .done();

});

export = router;
