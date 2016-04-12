import { Router, Request, Response } from 'express';
import { Timezone, WallTime, Duration } from 'chronoshift';

import { PivotRequest } from '../../utils/index';
import { VERSION, LINK_VIEW_CONFIG } from '../../config';
import { pivotLayout } from '../../views';

var router = Router();

router.get('/', (req: PivotRequest, res: Response, next: Function) => {
  req.dataSourceManager.getQueryableDataSources()
    .then((dataSources) => {
      res.send(pivotLayout({
        version: VERSION,
        title: `Pivot (${VERSION})`,
        config: {
          version: VERSION,
          user: req.user,
          dataSources: dataSources.map((ds) => ds.toClientDataSource()),
          linkViewConfig: LINK_VIEW_CONFIG
        }
      }));
    })
    .done();
});

export = router;
