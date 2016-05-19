import * as express from 'express';
import { Request, Response } from 'express';

import * as path from 'path';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as compress from 'compression';

import { Timezone, WallTime } from 'chronoshift';
// Init chronoshift
if (!WallTime.rules) {
  var tzData = require("chronoshift/lib/walltime/walltime-data.js");
  WallTime.init(tzData.rules, tzData.zones);
}

import { PivotRequest } from './utils/index';
import { VERSION, AUTH, SERVER_SETTINGS } from './config';
import * as plywoodRoutes from './routes/plywood/plywood';
import * as plyqlRoutes from './routes/plyql/plyql';
import * as pivotRoutes from './routes/pivot/pivot';
import * as settingsRoutes from './routes/settings/settings';
import * as healthRoutes from './routes/health/health';
import { errorLayout } from './views';

var app = express();
app.disable('x-powered-by');

app.use(compress());
app.use(logger('dev'));

app.use('/', express.static(path.join(__dirname, '../../build/public')));
app.use(SERVER_SETTINGS.serverRoot, express.static(path.join(__dirname, '../../build/public')));

app.use('/', express.static(path.join(__dirname, '../../assets')));
app.use(SERVER_SETTINGS.serverRoot, express.static(path.join(__dirname, '../../assets')));

if (AUTH) {
  app.use(AUTH.auth({
    version: VERSION
  }));

} else {
  app.use((req: PivotRequest, res: Response, next: Function) => {
    req.user = null;
    next();
  });
}

app.use(bodyParser.json());

// Data routes
app.use('/plywood', plywoodRoutes);
app.use(SERVER_SETTINGS.serverRoot + '/plywood', plywoodRoutes);

app.use('/plyql', plyqlRoutes);
app.use(SERVER_SETTINGS.serverRoot + '/plyql', plyqlRoutes);

app.use('/settings', settingsRoutes);
app.use(SERVER_SETTINGS.serverRoot + '/settings', settingsRoutes);

// View routes
if (SERVER_SETTINGS.iframe === 'deny') {
  app.use((req: PivotRequest, res: Response, next: Function) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    next();
  });
}

app.use('/', pivotRoutes);
app.use(SERVER_SETTINGS.serverRoot, pivotRoutes);

app.use('/health', healthRoutes);
app.use(SERVER_SETTINGS.serverRoot + '/health', healthRoutes);

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
