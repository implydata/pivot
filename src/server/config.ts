import * as path from 'path';
import * as nopt from 'nopt';
import { Cluster } from '../common/models/index';
import { dataSourceToYAML } from '../common/utils/yaml-helper/yaml-helper';
import { ServerSettings } from './models/server-settings/server-settings';
import { loadFileSync, SettingsManager, CONSOLE_LOGGER } from './utils/index';


function errorExit(message: string): void {
  console.error(message);
  process.exit(1);
}


var packageObj: any = null;
try {
  packageObj = loadFileSync(path.join(__dirname, '../../package.json'), 'json');
} catch (e) {
  errorExit(`Could not read package.json: ${e.message}`);
}
export const VERSION = packageObj.version;

function printUsage() {
  console.log(`
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
      --data-sources-only      Only print the data sources in the auto generated config

  -f, --file                   Start pivot on top of this file based data source (must be JSON, CSV, or TSV)

  -d, --druid                  The Druid broker node to connect to
`
  );
}

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
      "data-sources-only": Boolean,

      "file": String,

      "druid": String
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
  printUsage();
  process.exit();
}

if (parsedArgs['version']) {
  console.log(VERSION);
  process.exit();
}

if (!parsedArgs['example'] && !parsedArgs['config'] && !parsedArgs['druid'] && !parsedArgs['file']) {
  printUsage();
  process.exit();
}

const DEFAULT_SETTINGS: any = {
  port: 9090,
  sourceListScan: 'auto',
  sourceListRefreshInterval: 10000,
  dataSources: []
};

var exampleConfig: any = null;
if (parsedArgs['example']) {
  delete parsedArgs['druid'];
  var example = parsedArgs['example'];
  if (example === 'wiki') {
    try {
      exampleConfig = loadFileSync(path.join(__dirname, `../../config-example-${example}.yaml`), 'yaml');
    } catch (e) {
      errorExit(`Could not load example config for '${example}': ${e.message}`);
    }
  } else {
    console.log(`Unknown example '${example}'. Possible examples are: wiki`);
    process.exit();
  }
}

var configFilePath = parsedArgs['config'];
var configFileDir: string = null;
var config: any;
if (configFilePath) {
  configFileDir = path.dirname(configFilePath);
  try {
    config = loadFileSync(configFilePath, 'yaml');
    console.log(`Using config ${configFilePath}`);
  } catch (e) {
    errorExit(`Could not load config from '${configFilePath}': ${e.message}`);
  }
} else {
  config = DEFAULT_SETTINGS;
}

// If there is an example config take its dataSources
if (exampleConfig && Array.isArray(exampleConfig.dataSources)) {
  config.dataSources = exampleConfig.dataSources;
}

// If a file is specified add it as a dataSource
var file = parsedArgs['file'];
if (file) {
  config.dataSources.push({
    name: path.basename(file, path.extname(file)),
    engine: 'native',
    source: file
  });
}

if (parsedArgs['druid']) {
  config.druidHost = parsedArgs['druid'];
}

var serverSettings = ServerSettings.fromJS(config, configFileDir);

export const PRINT_CONFIG = Boolean(parsedArgs['print-config']);
export const START_SERVER = !PRINT_CONFIG;
export const VERBOSE = Boolean(parsedArgs['verbose'] || config.verbose);

export const SERVER_SETTINGS = serverSettings;
export const SETTINGS_MANAGER = new SettingsManager({
  location: 'local',
  readOnly: false, // ToDo: this should be true
  uri: configFilePath
}, {
  logger: CONSOLE_LOGGER,
  verbose: VERBOSE,
  initialLoadTimeout: SERVER_SETTINGS.pageMustLoadTimeout
});

var auth = config.auth;
var authModule: any = null;
if (auth) {
  auth = path.resolve(configFileDir, auth);
  console.log(`Using auth ${auth}`);
  try {
    authModule = require(auth);
  } catch (e) {
    errorExit(`error loading auth module: ${e.message}`);
  }
  if (typeof authModule.auth !== 'function') errorExit('Invalid auth module');
}
export const AUTH = authModule;


//var configDirectory = configFileDir || path.join(__dirname, '../..');

if (!PRINT_CONFIG) {
  console.log(`Starting Pivot v${VERSION}`);
}

if (PRINT_CONFIG) {
  var withComments = Boolean(parsedArgs['with-comments']);
  var dataSourcesOnly = Boolean(parsedArgs['data-sources-only']);

  SETTINGS_MANAGER.getSettings().then(appSettings => {
    var { dataSources, clusters } = appSettings;
    var cluster = clusters[0];

    if (!dataSources.length) throw new Error('Could not find any data sources please verify network connectivity');

    var lines = [
      `# generated by Pivot version ${VERSION}`,
      `# for a more detailed walk-through go to: https://github.com/implydata/pivot/blob/master/docs/configuration.md`,
      ''
    ];

    if (!dataSourcesOnly) {
      if (VERBOSE) {
        if (withComments) {
          lines.push("# Run Pivot in verbose mode so it prints out the queries that it issues");
        }
        lines.push(`verbose: true`, '');
      }

      if (withComments) {
        lines.push("# The port on which the Pivot server will listen on");
      }
      lines.push(`port: ${serverSettings.port}`, '');

      if (cluster.host) {
        if (withComments) {
          lines.push("# A Druid broker node that can serve data (only used if you have Druid based data source)");
        }
        lines.push(`druidHost: ${cluster.host}`, '');

        if (withComments) {
          lines.push("# A timeout for the Druid queries in ms (default: 30000 = 30 seconds)");
          lines.push("#timeout: 30000", '');
        }
      }

      if (cluster.introspectionStrategy !== Cluster.DEFAULT_INTROSPECTION_STRATEGY) {
        if (withComments) {
          lines.push("# The introspection strategy for the Druid external");
        }
        lines.push(`introspectionStrategy: ${cluster.introspectionStrategy}`, '');
      }

      if (withComments) {
        lines.push("# Should new datasources automatically be added?");
      }
      lines.push(`sourceListScan: disable`, '');
    }

    lines.push('dataSources:');
    lines = lines.concat.apply(lines, dataSources.map(d => dataSourceToYAML(d, withComments)));

    console.log(lines.join('\n'));
  }).catch((e: Error) => {
    console.error("There was an error generating a config: " + e.message);
  });
}
