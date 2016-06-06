import * as path from 'path';
import { Class, Instance, isInstanceOf } from 'immutable-class';
import { DruidRequestDecorator } from 'plywood-druid-requester';

export interface RequestDecoratorFactoryOptions {
  config: any;
}

export interface DruidRequestDecoratorModule {
  druidRequestDecorator: (log: (line: string) => void, options: RequestDecoratorFactoryOptions) => DruidRequestDecorator;
}

export type Iframe = "allow" | "deny";

export interface ServerSettingsValue {
  port?: number;
  serverRoot?: string;
  pageMustLoadTimeout?: number;
  iframe?: Iframe;
  druidRequestDecorator?: string;

  druidRequestDecoratorModule?: DruidRequestDecoratorModule;
}

export interface ServerSettingsJS {
  port?: number;
  serverRoot?: string;
  pageMustLoadTimeout?: number;
  iframe?: Iframe;
  druidRequestDecorator?: string;
}

function parseIntFromPossibleString(x: any) {
  return typeof x === 'string' ? parseInt(x, 10) : x;
}

var check: Class<ServerSettingsValue, ServerSettingsJS>;
export class ServerSettings implements Instance<ServerSettingsValue, ServerSettingsJS> {
  static DEFAULT_PORT = 9090;
  static DEFAULT_SERVER_ROOT = '/pivot';
  static DEFAULT_PAGE_MUST_LOAD_TIMEOUT = 800;
  static DEFAULT_IFRAME: Iframe = "allow";

  static isServerSettings(candidate: any): candidate is ServerSettings {
    return isInstanceOf(candidate, ServerSettings);
  }

  static fromJS(parameters: ServerSettingsJS, configFileDir?: string): ServerSettings {
    var {
      port,
      serverRoot,
      pageMustLoadTimeout,
      iframe,
      druidRequestDecorator
    } = parameters;

    if (serverRoot && serverRoot[0] !== '/') serverRoot = '/' + serverRoot;

    var druidRequestDecoratorModule: DruidRequestDecoratorModule = null;
    if (configFileDir && druidRequestDecorator) {
      druidRequestDecorator = path.resolve(configFileDir, druidRequestDecorator);
      try {
        druidRequestDecoratorModule = require(druidRequestDecorator);
      } catch (e) {
        throw new Error(`error loading druidRequestDecorator module: ${e.message}`);
      }
    }

    return new ServerSettings({
      port: parseIntFromPossibleString(port),
      serverRoot,
      pageMustLoadTimeout,
      iframe,
      druidRequestDecorator,
      druidRequestDecoratorModule
    });
  }

  public port: number;
  public serverRoot: string;
  public pageMustLoadTimeout: number;
  public iframe: Iframe;
  public druidRequestDecorator: string;

  public druidRequestDecoratorModule: DruidRequestDecoratorModule;

  constructor(parameters: ServerSettingsValue) {
    var port = parameters.port || ServerSettings.DEFAULT_PORT;
    if (typeof port !== 'number') throw new Error(`port must be a number`);
    this.port = port;

    this.serverRoot = parameters.serverRoot || ServerSettings.DEFAULT_SERVER_ROOT;
    this.pageMustLoadTimeout = parameters.pageMustLoadTimeout || ServerSettings.DEFAULT_PAGE_MUST_LOAD_TIMEOUT;
    this.iframe = parameters.iframe || ServerSettings.DEFAULT_IFRAME;
    this.druidRequestDecorator = parameters.druidRequestDecorator;

    this.druidRequestDecoratorModule = parameters.druidRequestDecoratorModule;
  }

  public valueOf(): ServerSettingsValue {
    return {
      port: this.port,
      serverRoot: this.serverRoot,
      pageMustLoadTimeout: this.pageMustLoadTimeout,
      iframe: this.iframe,
      druidRequestDecorator: this.druidRequestDecorator,
      druidRequestDecoratorModule: this.druidRequestDecoratorModule
    };
  }

  public toJS(): ServerSettingsJS {
    var js: ServerSettingsJS = {};
    if (this.port !== ServerSettings.DEFAULT_PORT) js.port = this.port;
    if (this.serverRoot !== ServerSettings.DEFAULT_SERVER_ROOT) js.serverRoot = this.serverRoot;
    js.pageMustLoadTimeout = this.pageMustLoadTimeout;
    js.iframe = this.iframe;
    js.druidRequestDecorator = this.druidRequestDecorator;
    return js;
  }

  public toJSON(): ServerSettingsJS {
    return this.toJS();
  }

  public toString(): string {
    return `[ServerSettings ${this.port}]`;
  }

  public equals(other: ServerSettings): boolean {
    return ServerSettings.isServerSettings(other) &&
      this.port === other.port &&
      this.serverRoot === other.serverRoot &&
      this.pageMustLoadTimeout === other.pageMustLoadTimeout &&
      this.iframe === other.iframe &&
      this.druidRequestDecorator === other.druidRequestDecorator;
  }

}
check = ServerSettings;
