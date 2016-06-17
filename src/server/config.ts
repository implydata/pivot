import * as path from 'path';
import * as nopt from 'nopt';
import { Cluster, DataSource, SupportedTypes } from '../common/models/index';
import { clusterToYAML, dataSourceToYAML } from '../common/utils/yaml-helper/yaml-helper';
import { ServerSettings, ServerSettingsJS } from './models/server-settings/server-settings';
import { loadFileSync, SettingsManager, SettingsLocation, CONSOLE_LOGGER } from './utils/index';

const AUTH_MODULE_VERSION = 0;

function exitWithMessage(message: string): void {
  console.log(message);
  process.exit();
}

function exitWithError(message: string): void {
  console.error(message);
  process.exit(1);
}

function zeroOne(thing: any): number {
  return Number(Boolean(thing));
}


var packageObj: any = null;
try {
  packageObj = loadFileSync(path.join(__dirname, '../../package.json'), 'json');
} catch (e) {
  exitWithError(`Could not read package.json: ${e.message}`);
}
export const VERSION = packageObj.version;

const USAGE = `
Usage: pivot [options]

Possible usage:

  pivot --example wiki
  pivot --druid your.broker.host:8082

      --help                   Print this help message
      --version                Display the version number
  -v, --verbose                Display the DB queries that are being made
  -p, --port                   The port pivot will run on
      --example                Start pivot with some example data (overrides all other options)
  -c, --config                 The configuration YAML files to use

      --print-config           Prints out the auto generated config
      --with-comments          Adds comments when printing the auto generated config      

  -f, --file                   Start pivot on top of this file based data source (must be JSON, CSV, or TSV)
  -d, --druid                  The Druid broker node to connect to
      --postgres               The Postgres cluster to connect to
      --mysql                  The MySQL cluster to connect to
      
      --user                   The cluster 'user' (if needed)
      --password               The cluster 'password' (if needed)
      --database               The cluster 'database' (if needed)
`;

function parseArgs() {
  return nopt(
    {
      "help": Boolean,
      "version": Boolean,
      "verbose": Boolean,
      "port": Number,
      "example": String,
      "config": String,

      "print-config": Boolean,
      "with-comments": Boolean,

      "file": String,
      "druid": String,
      "postgres": String,
      "mysql": String,

      "user": String,
      "password": String,
      "database": String
    },
    {
      "v": ["--verbose"],
      "p": ["--port"],
      "c": ["--config"],
      "f": ["--file"],
      "d": ["--druid"]
    },
    process.argv
  );
}

var parsedArgs = parseArgs();
//console.log(parsedArgs);

if (parsedArgs['help']) {
  exitWithMessage(USAGE);
}

if (parsedArgs['version']) {
  exitWithMessage(VERSION);
}

var numDataInputs = zeroOne(parsedArgs['file']) + zeroOne(parsedArgs['druid']) + zeroOne(parsedArgs['postgres']) + zeroOne(parsedArgs['mysql']);
if (!parsedArgs['example'] && !parsedArgs['config'] && numDataInputs === 0) {
  exitWithMessage(USAGE);
}

if (numDataInputs > 1) {
  exitWithError('only one of --file, --druid, --postgres, --mysql can be given on the command line, to connect to several clusters create a config');
}

var serverSettingsFilePath = parsedArgs['config'];

if (parsedArgs['example']) {
  delete parsedArgs['druid'];
  var example = parsedArgs['example'];
  if (example === 'wiki') {
    serverSettingsFilePath = path.join(__dirname, `../../config-example-${example}.yaml`);
  } else {
    exitWithMessage(`Unknown example '${example}'. Possible examples are: wiki`);
  }
}

var serverSettingsFileDir: string = null;
var serverSettingsJS: any;
if (serverSettingsFilePath) {
  serverSettingsFileDir = path.dirname(serverSettingsFilePath);
  try {
    serverSettingsJS = loadFileSync(serverSettingsFilePath, 'yaml');
    console.log(`Using config ${serverSettingsFilePath}`);
  } catch (e) {
    exitWithError(`Could not load config from '${serverSettingsFilePath}': ${e.message}`);
  }
} else {
  serverSettingsJS = {};
}

export const SERVER_SETTINGS = ServerSettings.fromJS(serverSettingsJS, serverSettingsFileDir);

// --- Auth -------------------------------

var auth = serverSettingsJS.auth;
var authModule: any = null;
if (auth) {
  auth = path.resolve(serverSettingsFileDir, auth);
  console.log(`Using auth ${auth}`);
  try {
    authModule = require(auth);
  } catch (e) {
    exitWithError(`error loading auth module: ${e.message}`);
  }

  if (authModule.version !== AUTH_MODULE_VERSION) {
    exitWithError(`unsupported auth module version ${authModule.version} needed ${AUTH_MODULE_VERSION}`);
  }
  if (typeof authModule.auth !== 'function') exitWithError('Invalid auth module');
}
export const AUTH = authModule;

// --- Printing -------------------------------

export const PRINT_CONFIG = Boolean(parsedArgs['print-config']);
export const START_SERVER = !PRINT_CONFIG;
export const VERBOSE = Boolean(parsedArgs['verbose'] || serverSettingsJS.verbose);

var settingsLocation: SettingsLocation = null;
if (serverSettingsFilePath) {
  settingsLocation = {
    location: 'local',
    readOnly: false, // ToDo: this should be true
    uri: serverSettingsFilePath
  };
} else {
  settingsLocation = {
    location: 'transient',
    readOnly: false
  };
}

export const SETTINGS_MANAGER = new SettingsManager(settingsLocation, {
  logger: CONSOLE_LOGGER,
  verbose: VERBOSE,
  initialLoadTimeout: SERVER_SETTINGS.pageMustLoadTimeout
});

// If a file is specified add it as a dataSource
var filesToLoad = parsedArgs['file'] || [];
for (var fileToLoad of filesToLoad) {
  SETTINGS_MANAGER.addDataSource(new DataSource({
    name: SETTINGS_MANAGER.getFreshDataSourceName(path.basename(fileToLoad, path.extname(fileToLoad))),
    engine: 'native',
    source: fileToLoad
  }));
}

const CLUSTER_TYPES: SupportedTypes[] = ['druid', 'postgres', 'mysql'];

for (var clusterType of CLUSTER_TYPES) {
  var host = parsedArgs[clusterType];
  if (host) {
    SETTINGS_MANAGER.addCluster(new Cluster({
      name: SETTINGS_MANAGER.getFreshClusterName(clusterType),
      type: clusterType,
      host: host,
      sourceListScan: 'auto',
      sourceListRefreshInterval: 15000,

      user: parsedArgs['user'],
      password: parsedArgs['password'],
      database: parsedArgs['database']
    }));
  }
}

if (!PRINT_CONFIG) {
  console.log(`Starting Pivot v${VERSION}`);
} else {
  var withComments = Boolean(parsedArgs['with-comments']);

  SETTINGS_MANAGER.getSettings().then(appSettings => {
    var { dataSources, clusters } = appSettings;

    if (!dataSources.length) throw new Error('Could not find any data sources please verify network connectivity');

    var lines = [
      `# generated by Pivot version ${VERSION}`,
      `# for a more detailed walk-through go to: https://github.com/implydata/pivot/blob/master/docs/configuration.md`,
      ''
    ];

    if (VERBOSE) {
      if (withComments) {
        lines.push("# Run Pivot in verbose mode so it prints out the queries that it issues");
      }
      lines.push(`verbose: true`, '');
    }

    if (withComments) {
      lines.push("# The port on which the Pivot server will listen on");
    }
    lines.push(`port: ${SERVER_SETTINGS.port}`, '');

    lines.push('clusters:');
    lines = lines.concat.apply(lines, clusters.map(c => clusterToYAML(c, withComments)));

    lines.push('dataSources:');
    lines = lines.concat.apply(lines, dataSources.map(d => dataSourceToYAML(d, withComments)));

    console.log(lines.join('\n'));
  }).catch((e: Error) => {
    console.error("There was an error generating a config: " + e.message);
  });
}
