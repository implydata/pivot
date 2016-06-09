import { $, AttributeInfo, RefExpression } from 'plywood';
import { DataSource, DataSourceJS, RefreshRule, Dimension, Measure } from '../../../common/models/index';

export function attributeToYAML(attribute: AttributeInfo): string[] {
  var lines: string[] = [
    `      - name: ${attribute.name}`,
    `        type: ${attribute.type}`
  ];

  if (attribute.special) {
    lines.push(`        special: ${attribute.special}`);
  }

  lines.push('');
  return lines;
}

export function dimensionToYAML(dimension: Dimension): string[] {
  var lines: string[] = [
    `      - name: ${dimension.name}`,
    `        title: ${dimension.title}`
  ];

  if (dimension.kind !== 'string') {
    lines.push(`        kind: ${dimension.kind}`);
  }

  lines.push(`        expression: ${dimension.expression.toString()}`);

  lines.push('');
  return lines;
}

export function measureToYAML(measure: Measure): string[] {
  var lines: string[] = [
    `      - name: ${measure.name}`,
    `        title: ${measure.title}`
  ];

  var ex = measure.expression;
  var lastAction = ex.lastAction();
  var comment = ''; // Make a comment if this is a .sum(min_blah) or similar
  if (
    lastAction.action === 'sum' &&
    /\bmin\b|\bmax\b|\bunique\b|\buniques\b/i.test(((lastAction.expression as RefExpression).name || '').replace(/_/g, ' ')) // \b matches "_"   :-(
  ) {
    comment = ' # double check please';
  }
  lines.push(`        expression: ${ex.toString()}${comment}`);

  var format = measure.format;
  if (format !== Measure.DEFAULT_FORMAT) {
    lines.push(`        format: ${format}`);
  }

  lines.push('');
  return lines;
}

export function dataSourceToYAML(dataSource: DataSource, withComments: boolean): string[] {
  var lines: string[] = [
    `  - name: ${dataSource.name}`,
    `    title: ${dataSource.title}`,
    `    engine: ${dataSource.engine}`,
    `    source: ${dataSource.source}`,
    ``
  ];

  var timeAttribute = dataSource.timeAttribute;
  if (timeAttribute && !(dataSource.engine === 'druid' && timeAttribute.name === '__time')) {
    if (withComments) {
      lines.push("    # The primary time attribute of the data refers to the attribute that must always be filtered on");
      lines.push("    # This is particularly useful for Druid data sources as they must always have a time filter.");
    }
    lines.push(`    timeAttribute: ${timeAttribute.name}`, '');
  }


  var refreshRule = dataSource.refreshRule;
  if (withComments) {
    lines.push("    # The refresh rule describes how often the data source looks for new data. Default: 'query'/PT1M (every minute)");
  }
  lines.push(`    refreshRule:`);
  lines.push(`      rule: ${refreshRule.rule}`);
  if (refreshRule.time) {
    lines.push(`      time: ${refreshRule.time.toISOString()}`);
  }
  if (refreshRule.refresh) {
    lines.push(`      refresh: ${refreshRule.refresh.toString()}`);
  }
  lines.push('');


  var defaultTimezone = dataSource.defaultTimezone;
  if (withComments) {
    lines.push("    # The default timezone for this dataset to operate in defaults to UTC");
  }
  if (defaultTimezone.equals(DataSource.DEFAULT_TIMEZONE)) {
    if (withComments) {
      lines.push(`    #defaultTimezone: ${DataSource.DEFAULT_TIMEZONE.toString()}`, '');
    }
  } else {
    lines.push(`    defaultTimezone: ${defaultTimezone.toString()}}`, '');
  }


  var defaultDuration = dataSource.defaultDuration;
  if (withComments) {
    lines.push(`    # The default duration for the time filter (if not set ${DataSource.DEFAULT_DURATION.toString()} is used)`);
  }
  if (defaultDuration.equals(DataSource.DEFAULT_DURATION)) {
    if (withComments) {
      lines.push(`    #defaultDuration: ${DataSource.DEFAULT_DURATION.toString()}`, '');
    }
  } else {
    lines.push(`    defaultDuration: ${defaultDuration.toString()}`, '');
  }


  var defaultSortMeasure = dataSource.defaultSortMeasure;
  if (withComments) {
    lines.push("    # The default sort measure name (if not set the first measure name is used)");
  }
  lines.push(`    defaultSortMeasure: ${defaultSortMeasure}`, '');


  var defaultSelectedMeasures = dataSource.defaultSelectedMeasures ? dataSource.defaultSelectedMeasures.toArray() : [];
  if (withComments) {
    lines.push("    # The names of measures that are selected by default");
  }
  lines.push(`    defaultSelectedMeasures: ${JSON.stringify(defaultSelectedMeasures)}`, '');


  var defaultPinnedDimensions = dataSource.defaultPinnedDimensions ? dataSource.defaultPinnedDimensions.toArray() : [];
  if (withComments) {
    lines.push("    # The names of dimensions that are pinned by default (in order that they will appear in the pin bar)");
  }
  lines.push(`    defaultPinnedDimensions: ${JSON.stringify(defaultPinnedDimensions)}`, '');


  var introspection = dataSource.introspection;
  if (withComments) {
    lines.push(
      "    # How the dataset should be introspected",
      "    # possible options are:",
      "    # * none - Do not do any introspection, take what is written in the config as the rule of law.",
      "    # * no-autofill - Introspect the datasource but do not automatically generate dimensions or measures",
      "    # * autofill-dimensions-only - Introspect the datasource, automatically generate dimensions only",
      "    # * autofill-measures-only - Introspect the datasource, automatically generate measures only",
      "    # * autofill-all - (default) Introspect the datasource, automatically generate dimensions and measures"
    );
  }
  lines.push(`    introspection: ${introspection}`, '');


  var attributeOverrides = dataSource.attributeOverrides;
  if (withComments) {
    lines.push("    # The list of attribute overrides in case introspection get something wrong");
  }
  lines.push('    attributeOverrides:');
  if (withComments) {
    lines.push(
      "      # A general attribute override looks like so:",
      "      #",
      "      # name: user_unique",
      "      # ^ the name of the attribute (the column in the database)",
      "      #",
      "      # type: STRING",
      "      # ^ (optional) plywood type of the attribute",
      "      #",
      "      # special: unique",
      "      # ^ (optional) any kind of special significance associated with this attribute",
      ""
    );
  }
  lines = lines.concat.apply(lines, attributeOverrides.map(attributeToYAML));


  var dimensions = dataSource.dimensions.toArray();
  if (withComments) {
    lines.push("    # The list of dimensions defined in the UI. The order here will be reflected in the UI");
  }
  lines.push('    dimensions:');
  if (withComments) {
    lines.push(
      "      # A general dimension looks like so:",
      "      #",
      "      # name: channel",
      "      # ^ the name of the dimension as used in the URL (you should try not to change these)",
      "      #",
      "      # title: The Channel",
      "      # ^ (optional) the human readable title. If not set a title is generated from the 'name'",
      "      #",
      "      # kind: string",
      "      # ^ (optional) the kind of the dimension. Can be 'string', 'time', 'number', or 'boolean'. Defaults to 'string'",
      "      #",
      "      # expression: $channel",
      "      # ^ (optional) the Plywood bucketing expression for this dimension. Defaults to '$name'",
      "      #   if, say, channel was called 'cnl' in the data you would put '$cnl' here",
      "      #   See also the expressions API reference: https://plywood.imply.io/expressions",
      "      #",
      "      # url: string",
      "      # ^ (optional) a url (including protocol) associated with the dimension, with optional token '%s'",
      "      #   that is replaced by the dimension value to generate links specific to each value.",
      ""
    );
  }
  lines = lines.concat.apply(lines, dimensions.map(dimensionToYAML));
  if (withComments) {
    lines.push(
      "      # This is the place where you might want to add derived dimensions.",
      "      #",
      "      # Here are some examples of possible derived dimensions:",
      "      #",
      "      # - name: is_usa",
      "      #   title: Is USA?",
      "      #   expression: $country == 'United States'",
      "      #",
      "      # - name: file_version",
      "      #   expression: $filename.extract('(\\d+\\.\\d+\\.\\d+)')",
      ""
    );
  }


  var measures = dataSource.measures.toArray();
  if (withComments) {
    lines.push("    # The list of measures defined in the UI. The order here will be reflected in the UI");
  }
  lines.push(`    measures:`);
  if (withComments) {
    lines.push(
      "      # A general measure looks like so:",
      "      #",
      "      # name: avg_revenue",
      "      # ^ the name of the dimension as used in the URL (you should try not to change these)",
      "      #",
      "      # title: Average Revenue",
      "      # ^ (optional) the human readable title. If not set a title is generated from the 'name'",
      "      #",
      "      # expression: $main.sum($revenue) / $main.sum($volume) * 10",
      "      # ^ (optional) the Plywood bucketing expression for this dimension.",
      "      #   Usually defaults to '$main.sum($name)' but if the name contains 'min' or 'max' will use that as the aggregate instead of sum.",
      "      #   this is the place to define your fancy formulas",
      ""
    );
  }
  lines = lines.concat.apply(lines, measures.map(measureToYAML));
  if (withComments) {
    lines.push(
      "      # This is the place where you might want to add derived measures (a.k.a Post Aggregators).",
      "      #",
      "      # Here are some examples of possible derived measures:",
      "      #",
      "      # - name: ecpm",
      "      #   title: eCPM",
      "      #   expression: $main.sum($revenue) / $main.sum($impressions) * 1000",
      "      #",
      "      # - name: usa_revenue",
      "      #   title: USA Revenue",
      "      #   expression: $main.filter($country == 'United States').sum($revenue)",
      ""
    );
  }

  lines.push('');
  return lines;
}
