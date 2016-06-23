import { Splits } from '../../../common/models/index';

export class SplitCombineMock {
  public static get TIME_JS() {
    return {
      expression: { op: 'ref', name: 'time' },
      sortAction: {
        action: 'sort',
        direction: 'ascending',
        expression: {
          op: 'ref',
          name: 'time'
        }
      },
      limitAction: {
        action: 'limit',
        limit: 2
      }
    };
  }

  public static get USER_ID() {
    return {
      expression: { op: 'ref', name: 'userId' },
      sortAction: {
        action: 'sort',
        direction: 'ascending',
        expression: {
          op: 'ref',
          name: 'userId'
        }
      },
      limitAction: {
        action: 'limit',
        limit: 2
      }
    };
  }

  public static get ORDER_SIZE() {
    return {
      expression: { op: 'ref', name: 'orderSize' },
      sortAction: {
        action: 'sort',
        direction: 'ascending',
        expression: {
          op: 'ref',
          name: 'orderSize'
        }
      },
      limitAction: {
        action: 'limit',
        limit: 2
      }
    };
  }

  static time() {
    return Splits.fromJS(SplitCombineMock.TIME_JS);
  }

  static userId() {
    return Splits.fromJS(SplitCombineMock.USER_ID);
  }

  static orderSize() {
    return Splits.fromJS(SplitCombineMock.ORDER_SIZE);
  }
}
