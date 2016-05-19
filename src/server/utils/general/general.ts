import { Request } from 'express';
import { User } from '../../../common/models/index';

export interface PivotRequest extends Request {
  user: User;
}
