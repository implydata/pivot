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
}
