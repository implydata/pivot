import * as Qajax from 'qajax';
import { $, Expression, Executor, Dataset, ChainExpression, SplitAction, Environment } from 'plywood';

function getSplitsDescription(ex: Expression): string {
  var splits: string[] = [];
  ex.forEach((ex) => {
    if (ex instanceof ChainExpression) {
      ex.actions.forEach((action) => {
        if (action instanceof SplitAction) {
          splits.push(action.firstSplitExpression().toString());
        }
      });
    }
  });
  return splits.join(';');
}

var reloadRequested = false;
function reload() {
  if (reloadRequested) return;
  reloadRequested = true;
  window.location.reload(true);
}

export function queryUrlExecutorFactory(name: string, url: string, version: string): Executor {
  return (ex: Expression, env: Environment = {}) => {
    return Qajax({
      method: "POST",
      url: url + '?by=' + getSplitsDescription(ex),
      data: {
        version: version,
        dataSource: name,
        expression: ex.toJS(),
        timezone: env ? env.timezone : null
      }
    })
      .then(Qajax.filterSuccess)
      .then(Qajax.toJSON)
      .then(
        (res) => {
          return Dataset.fromJS(res.result);
        },
        (xhr: XMLHttpRequest): Dataset => {
          if (!xhr) return null; // This is only here to stop TS complaining
          var jsonError = JSON.parse(xhr.responseText);
          if (jsonError.action === 'reload') reload();
          throw new Error(jsonError.message);
        }
      );
  };
}
