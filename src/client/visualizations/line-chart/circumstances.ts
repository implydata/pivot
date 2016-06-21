import { $, SortAction } from 'plywood';
import { List } from 'immutable';
import { Splits, DataSource, Resolve, SplitCombine, Colors, NEVER_BUCKET } from '../../../common/models/index';
import { CircumstancesHandler } from '../../../common/utils/circumstances-handler/circumstances-handler';

export default CircumstancesHandler.EMPTY()

  .when((splits: Splits, dataSource: DataSource) => !(dataSource.getDimensionByKind('time') || dataSource.getDimensionByKind('number')))
  .then(() => Resolve.NEVER)

  .when(CircumstancesHandler.noSplits())
  .then((splits: Splits, dataSource: DataSource) => {
    let continuousDimensions = dataSource.getDimensionByKind('time').concat(dataSource.getDimensionByKind('number').filter((d) => d.bucketingStrategy !== NEVER_BUCKET));
    return Resolve.manual(3, 'This visualization requires a bucketed continuous dimension split',
      continuousDimensions.toArray().map((continuousDimension) => {
        return {
          description: `Add a split on ${continuousDimension.title}`,
          adjustment: {
            splits: Splits.fromSplitCombine(SplitCombine.fromExpression(continuousDimension.expression))
          }
        };
      })
    );
  })

  .when(CircumstancesHandler.areExactSplitKinds('time'))
  .or(CircumstancesHandler.haveExactProperties({'bucketingStrategy' : "!never_bucket", "kind": 'number'}))
  .then((splits: Splits, dataSource: DataSource, colors: Colors) => {
    var timeBoost = 0;

    var continuousSplit = splits.get(0);
    var continuousDimension = dataSource.getDimensionByExpression(continuousSplit.expression);

    var sortAction: SortAction = new SortAction({
      expression: $(continuousDimension.name),
      direction: SortAction.ASCENDING
    });

    let autoChanged = false;

    // Fix time sort
    if (!sortAction.equals(continuousSplit.sortAction)) {
      continuousSplit = continuousSplit.changeSortAction(sortAction);
      autoChanged = true;
    }

    // Fix time limit
    if (continuousSplit.limitAction && continuousDimension.kind === 'time') {
      continuousSplit = continuousSplit.changeLimitAction(null);
      autoChanged = true;
    }

    if (colors) {
      autoChanged = true;
    }

    if (continuousDimension.kind === 'time') timeBoost = 7;

    if (!autoChanged) return Resolve.ready(timeBoost + 2);
    return Resolve.automatic(timeBoost, {splits: new Splits(List([continuousSplit]))});
  })

  .when(CircumstancesHandler.areExactSplitKinds('time', '*'))
  .then((splits: Splits, dataSource: DataSource, colors: Colors) => {
    var timeSplit = splits.get(0);
    var timeDimension = timeSplit.getDimension(dataSource.dimensions);

    var sortAction: SortAction = new SortAction({
      expression: $(timeDimension.name),
      direction: SortAction.ASCENDING
    });

    // Fix time sort
    if (!sortAction.equals(timeSplit.sortAction)) {
      timeSplit = timeSplit.changeSortAction(sortAction);
    }

    // Fix time limit
    if (timeSplit.limitAction) {
      timeSplit = timeSplit.changeLimitAction(null);
    }

    let colorSplit = splits.get(1);

    if (!colorSplit.sortAction) {
      colorSplit = colorSplit.changeSortAction(dataSource.getDefaultSortAction());
    }

    var colorSplitDimension = dataSource.getDimensionByExpression(colorSplit.expression);
    if (!colors || colors.dimension !== colorSplitDimension.name) {
      colors = Colors.fromLimit(colorSplitDimension.name, 5);
    }

    return Resolve.automatic(8, {
      splits: new Splits(List([colorSplit, timeSplit])),
      colors
    });
  })

  .when(CircumstancesHandler.areExactSplitKinds('*', 'time'))
  .then((splits: Splits, dataSource: DataSource, colors: Colors) => {
    var timeSplit = splits.get(1);
    var timeDimension = timeSplit.getDimension(dataSource.dimensions);

    let autoChanged = false;

    var sortAction: SortAction = new SortAction({
      expression: $(timeDimension.name),
      direction: SortAction.ASCENDING
    });

    // Fix time sort
    if (!sortAction.equals(timeSplit.sortAction)) {
      timeSplit = timeSplit.changeSortAction(sortAction);
      autoChanged = true;
    }

    // Fix time limit
    if (timeSplit.limitAction) {
      timeSplit = timeSplit.changeLimitAction(null);
      autoChanged = true;
    }

    let colorSplit = splits.get(0);

    if (!colorSplit.sortAction) {
      colorSplit = colorSplit.changeSortAction(dataSource.getDefaultSortAction());
      autoChanged = true;
    }

    var colorSplitDimension = dataSource.getDimensionByExpression(colorSplit.expression);
    if (!colors || colors.dimension !== colorSplitDimension.name) {
      colors = Colors.fromLimit(colorSplitDimension.name, 5);
      autoChanged = true;
    }

    if (!autoChanged) return Resolve.ready(10);
    return Resolve.automatic(8, {
      splits: new Splits(List([colorSplit, timeSplit])),
      colors
    });
  })

  .when(CircumstancesHandler.haveAtLeastSplitKinds('time'))
  .then((splits: Splits, dataSource: DataSource) => {
    let timeSplit = splits.toArray().filter((split) => split.getDimension(dataSource.dimensions).kind === 'time')[0];
    return Resolve.manual(3, 'Too many splits', [
      {
        description: `Remove all but the time split`,
        adjustment: {
          splits: Splits.fromSplitCombine(timeSplit)
        }
      }
    ]);
  })

  .otherwise(
    (splits: Splits, dataSource: DataSource) => {
      let continuousDimensions = dataSource.getDimensionByKind('time').concat(dataSource.getDimensionByKind('number').filter((d) => d.bucketingStrategy !== NEVER_BUCKET));
      return Resolve.manual(3, 'The Line Chart needs one bucketed continuous dimension split',
        continuousDimensions.toArray().map((continuousDimension) => {
          return {
            description: `Split on ${continuousDimension.title} instead`,
            adjustment: {
              splits: Splits.fromSplitCombine(SplitCombine.fromExpression(continuousDimension.expression))
            }
          };
        })
      );
    }
  );
