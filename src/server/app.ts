import * as express from 'express';
import { Request, Response } from 'express';

import * as path from 'path';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as compress from 'compression';
import { $, Expression, Datum, Dataset } from 'plywood';

import { Timezone, WallTime } from 'chronoshift';
// Init chronoshift
if (!WallTime.rules) {
  var tzData = require("chronoshift/lib/walltime/walltime-data.js");
  WallTime.init(tzData.rules, tzData.zones);
}

import { PivotRequest } from './utils/index';
import { VERSION, DATA_SOURCE_MANAGER, AUTH, SERVER_CONFIG, SERVER_ROOT } from './config';
import * as plywoodRoutes from './routes/plywood/plywood';
import * as plyqlRoutes from './routes/plyql/plyql';
import * as pivotRoutes from './routes/pivot/pivot';
import * as healthRoutes from './routes/health/health';
import { errorLayout } from './views';

var serverRoot = '/pivot';
if (SERVER_ROOT) {
  var serverRoot = SERVER_ROOT;
  if (serverRoot[0] !== '/') serverRoot = '/' + serverRoot;
}

var app = express();
app.disable('x-powered-by');

app.use(compress());
app.use(logger('dev'));

app.use('/', express.static(path.join(__dirname, '../../build/public')));
app.use(serverRoot, express.static(path.join(__dirname, '../../build/public')));

app.use('/', express.static(path.join(__dirname, '../../assets')));
app.use(serverRoot, express.static(path.join(__dirname, '../../assets')));

if (AUTH) {
  app.use(AUTH.auth({
    version: VERSION,
    dataSourceManager: DATA_SOURCE_MANAGER
  }));

  app.use((req: PivotRequest, res: Response, next: Function) => {
    if (!req.dataSourceManager) {
      return next(new Error('no dataSourceManager'));
    }
    next();
  });

} else {
  app.use((req: PivotRequest, res: Response, next: Function) => {
    req.user = null;
    req.dataSourceManager = DATA_SOURCE_MANAGER;
    next();
  });
}

app.use(bodyParser.json());

// Data routes
app.use('/plywood', plywoodRoutes);
app.use(serverRoot + '/plywood', plywoodRoutes);

app.use('/plyql', plyqlRoutes);
app.use(serverRoot + '/plyql', plyqlRoutes);

// View routes
if (SERVER_CONFIG.iframe === 'deny') {
  app.use((req: PivotRequest, res: Response, next: Function) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    next();
  });
}

app.use('/', pivotRoutes);
app.use(serverRoot, pivotRoutes);

app.use('/health', healthRoutes);
app.use(serverRoot + '/health', healthRoutes);

// Catch 404 and redirect to /
app.use((req: Request, res: Response, next: Function) => {
  res.redirect('/');
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') { // NODE_ENV
  app.use((err: any, req: Request, res: Response, next: Function) => {
    res.status(err.status || 500);
    res.send(errorLayout({ version: VERSION, title: 'Error' }, err.message, err));
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err: any, req: Request, res: Response, next: Function) => {
  res.status(err.status || 500);
  res.send(errorLayout({ version: VERSION, title: 'Error' }, err.message));
});

export = app;
