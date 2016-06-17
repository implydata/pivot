import { Filter, FilterJS } from "./filter";

export class FilterMock {
  public static get LANGUAGE_JS(): FilterJS {
    return {
      "op": "chain", "expression": { "op": "ref", "name": "language" },
      "action": {
        "action": "overlap",
        "expression": {
          "op": "literal",
          "value": { "setType": "STRING", "elements": ["en"] },
          "type": "SET"
        }
      }
    };
  }

  static language() {
    return Filter.fromJS(FilterMock.LANGUAGE_JS);
  }

}
