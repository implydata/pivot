import * as express from 'express';
import { Request, Response, Router, Handler } from 'express';

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
import { VERSION, AUTH, SERVER_SETTINGS, SETTINGS_MANAGER } from './config';
import * as plywoodRoutes from './routes/plywood/plywood';
import * as plyqlRoutes from './routes/plyql/plyql';
import * as pivotRoutes from './routes/pivot/pivot';
import * as settingsRoutes from './routes/settings/settings';
import * as healthRoutes from './routes/health/health';
import { errorLayout } from './views';

var app = express();
app.disable('x-powered-by');

function addRoutes(attach: string, router: Router | Handler): void {
  app.use(attach, router);
  app.use(SERVER_SETTINGS.serverRoot + attach, router);
}

app.use(compress());
app.use(logger('dev'));

addRoutes('/', express.static(path.join(__dirname, '../../build/public')));
addRoutes('/', express.static(path.join(__dirname, '../../assets')));

app.use((req: PivotRequest, res: Response, next: Function) => {
  req.user = null;
  req.version = VERSION;
  req.getSettings = (dataSourceOfInterest?: string) => {
    return SETTINGS_MANAGER.getSettings(dataSourceOfInterest);
  };
  next();
});

if (AUTH) {
  app.use(AUTH.auth({
    version: VERSION
  }));

}

app.use(bodyParser.json());

addRoutes('/health', healthRoutes);

// Data routes
addRoutes('/plywood', plywoodRoutes);
addRoutes('/plyql', plyqlRoutes);
addRoutes('/settings', settingsRoutes);

// View routes
if (SERVER_SETTINGS.iframe === 'deny') {
  app.use((req: PivotRequest, res: Response, next: Function) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    next();
  });
}

addRoutes('/', pivotRoutes);

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
