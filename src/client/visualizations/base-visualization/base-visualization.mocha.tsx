import { expect } from 'chai';
import '../../utils/test-utils/index';
import * as React from 'react';

import { DataSourceMock, SplitCombineMock } from '../../../common/models/mocks';

import { LineChart } from "../line-chart/line-chart";
import { BarChart } from "../bar-chart/bar-chart";
import { Table } from "../table/table";

describe('BaseVisualization', () => {

  it('handles time split properly', () => {
    var timeLineChart = LineChart.handleCircumstance(DataSourceMock.wiki(), SplitCombineMock.time(), null, false);
    expect(timeLineChart.state, 'defaults to line chart with time').to.equal('automatic');
    expect(timeLineChart.score, 'defaults to line chart with time').to.equal(7);

    var timeBarChart = BarChart.handleCircumstance(DataSourceMock.wiki(), SplitCombineMock.time(), null, false);
    expect(timeBarChart.state, 'bar chart allows time split but isnt default vis via non automatic resolve').to.equal('ready');
    expect(timeBarChart.score, 'bar chart allows time split but isnt default vis').to.equal(7);

  });

  it('handles bucketable numeric split properly', () => {
    var numericBarChartScore = BarChart.handleCircumstance(DataSourceMock.twitter(), SplitCombineMock.orderSize(), null, true).score;
    var numericTableScore = Table.handleCircumstance(DataSourceMock.twitter(), SplitCombineMock.userId(), null, false).score;
    var numericLineChart = LineChart.handleCircumstance(DataSourceMock.twitter(), SplitCombineMock.orderSize(), null, true);

    expect(numericBarChartScore, 'bucketable numeric defaults to bar chart').to.greaterThan(numericTableScore);
    expect(numericLineChart.score, 'bucketable numeric split allows line chart but does not default').to.be.lessThan(numericBarChartScore);
    expect(numericLineChart.state, 'bucketable numeric split allows line chart but does not default').to.equal('ready');

  });

  it('handles never-bucket numeric split properly', () => {
    var neverBucketBarChartScore = BarChart.handleCircumstance(DataSourceMock.twitter(), SplitCombineMock.userId(), null, false).score;
    var neverBucketTableScore = Table.handleCircumstance(DataSourceMock.twitter(), SplitCombineMock.userId(), null, false).score;
    expect(neverBucketTableScore, 'unbucketable numeric dim should default to table').to.be.greaterThan(neverBucketBarChartScore);

    var neverBucketLineChart = LineChart.handleCircumstance(DataSourceMock.twitter(), SplitCombineMock.userId(), null, false);
    expect(neverBucketLineChart.state, 'line chart is not allowed with unbucketable').to.equal('manual');
    expect(neverBucketLineChart.message, 'line chart is not allowed with unbucketable').to.equal('The Line Chart needs one bucketed continuous dimension split');

  });

});
