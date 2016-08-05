declare module "request-tracker" {
  export type User = any;
  export interface TrackOptions {
    eventType: string;
    user?: User;
    attr?: Lookup<string>;
    metric: string;
    value: number;
  }
  export interface Tracker {
    track: (options: TrackOptions) => void;
  }
  export const TRACKER: Tracker;
  export function initTracker(version: string, url: string, context: Lookup<any>): void;

  export interface Logger {
    log: (line: string) => void;
    warn: (line: string) => void;
    error: (line: string) => void;
  }
  export const LOGGER: Logger;
  export function initLogger(): void;
}
