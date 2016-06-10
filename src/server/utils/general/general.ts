import { Request } from 'express';
import { User, AppSettings } from '../../../common/models/index';

export interface PivotRequest extends Request {
  version: string;
  user: User;
  getSettings(dataSourceOfInterest?: string): Q.Promise<AppSettings>;
}
