import * as path from 'path';
import * as nopt from 'nopt';
import { arraySum } from '../common/utils/general/general';
import { Cluster, DataSource, SupportedType, AppSettings } from '../common/models/index';
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

  pivot --example
  pivot --druid your.broker.host:8082

General arguments:

      --help                   Print this help message
      --version                Display the version number
  -v, --verbose                Display the DB queries that are being made

Server arguments:

  -p, --port <port-number>     The port pivot will run on (default: ${ServerSettings.DEFAULT_PORT})
      
Data connection options:      
  
  Exactly one data connection option must be provided. 
  
  -c, --config <path>          Use this local configuration (YAML) file
      --example                Start Pivot with some example data for testing / demo  
  -f, --file <path>            Start Pivot on top of this file based data source (must be JSON, CSV, or TSV)
  -d, --druid <host>           The Druid broker node to connect to
      --postgres <host>        The Postgres cluster to connect to
      --mysql <host>           The MySQL cluster to connect to
      
      --user <string>          The cluster 'user' (if needed)
      --password <string>      The cluster 'password' (if needed)
      --database <string>      The cluster 'database' (if needed)

Configuration printing utilities:      
      
      --print-config           Prints out the auto generated config
      --with-comments          Adds comments when printing the auto generated config
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

const SETTINGS_INPUTS = ['config', 'example', 'file', 'druid', 'postgres', 'mysql'];

var numSettingsInputs = arraySum(SETTINGS_INPUTS.map((input) => zeroOne(parsedArgs[input])));

if (numSettingsInputs === 0) {
  exitWithMessage(USAGE);
}

if (numSettingsInputs > 1) {
  exitWithError(`only one of --${SETTINGS_INPUTS.join(', --')} can be given on the command line`);
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

var anchorPath: string;
var serverSettingsJS: any;
if (serverSettingsFilePath) {
  anchorPath = path.dirname(serverSettingsFilePath);
  try {
    serverSettingsJS = loadFileSync(serverSettingsFilePath, 'yaml');
    console.log(`Using config ${serverSettingsFilePath}`);
  } catch (e) {
    exitWithError(`Could not load config from '${serverSettingsFilePath}': ${e.message}`);
  }
} else {
  anchorPath = process.cwd();
  serverSettingsJS = {};
}

export const SERVER_SETTINGS = ServerSettings.fromJS(serverSettingsJS, anchorPath);

// --- Auth -------------------------------

var auth = serverSettingsJS.auth;
var authModule: any = null;
if (auth) {
  auth = path.resolve(anchorPath, auth);
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

// --- Location -------------------------------

const CLUSTER_TYPES: SupportedType[] = ['druid', 'postgres', 'mysql'];

var settingsLocation: SettingsLocation = null;
if (serverSettingsFilePath) {
  settingsLocation = {
    location: 'local',
    readOnly: false, // ToDo: this should be true
    uri: serverSettingsFilePath
  };
} else {
  var initAppSettings = AppSettings.BLANK;

  // If a file is specified add it as a dataSource
  var filesToLoad = parsedArgs['file'] || [];
  for (var fileToLoad of filesToLoad) {
    initAppSettings = initAppSettings.addDataSource(new DataSource({
      name: path.basename(fileToLoad, path.extname(fileToLoad)),
      engine: 'native',
      source: fileToLoad
    }));
  }

  for (var clusterType of CLUSTER_TYPES) {
    var host = parsedArgs[clusterType];
    if (host) {
      initAppSettings = initAppSettings.addCluster(new Cluster({
        name: clusterType,
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

  settingsLocation = {
    location: 'transient',
    readOnly: false,
    initAppSettings
  };
}

export const PRINT_CONFIG = Boolean(parsedArgs['print-config']);
export const START_SERVER = !PRINT_CONFIG;
export const VERBOSE = Boolean(parsedArgs['verbose'] || serverSettingsJS.verbose);

export const SETTINGS_MANAGER = new SettingsManager(settingsLocation, {
  logger: CONSOLE_LOGGER,
  verbose: VERBOSE,
  anchorPath,
  initialLoadTimeout: SERVER_SETTINGS.pageMustLoadTimeout
});

// --- Printing -------------------------------

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
