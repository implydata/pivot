/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const expect = require('chai').expect;
const request = require('request');
const plywood = require('plywood');
const spawnServer = require('../utils/spawn-server');

const $ = plywood.$;
const ply = plywood.ply;
const r = plywood.r;

const TEST_PORT = 18082;
var pivotServer;

describe('examples', function () {
  this.timeout(5000);

  before((done) => {
    pivotServer = spawnServer(`bin/pivot --examples -p ${TEST_PORT}`);
    pivotServer.onHook('Pivot is listening on address', done);
  });

  it('works with GET /health', (testComplete) => {
    request.get(`http://localhost:${TEST_PORT}/health`, (err, response, body) => {
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(body).to.contain('I am healthy @');
      testComplete();
    });
  });

  it('works with GET /', (testComplete) => {
    request.get(`http://localhost:${TEST_PORT}/`, (err, response, body) => {
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(body).to.contain('<!DOCTYPE html>');
      expect(body).to.contain('<title>Pivot');
      expect(body).to.contain('<div class="app-container"></div>');
      expect(body).to.contain('var __CONFIG__ = {');
      expect(body).to.contain('</html>');
      testComplete();
    });
  });

  it('works with POST /plywood', (testComplete) => {
    request({
      method: 'POST',
      url: `http://localhost:${TEST_PORT}/plywood`,
      json: {
        dataSource: 'wiki',
        timezone: 'Etc/UTC',
        expression: $('main').split('$channel', 'Channel')
          .apply('Added', '$main.sum($added)')
          .sort('$Added', 'descending')
          .limit(3)
      }
    }, (err, response, body) => {
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(body).to.deep.equal({
        "result": [
          {
            "Added": 3045299,
            "Channel": "en"
          },
          {
            "Added": 711011,
            "Channel": "it"
          },
          {
            "Added": 642555,
            "Channel": "fr"
          }
        ]
      });
      testComplete();
    });
  });

  it('works with POST /mkurl', (testComplete) => {
    request({
      method: 'POST',
      url: `http://localhost:${TEST_PORT}/mkurl`,
      json: {
        domain: 'http://localhost:9090',
        dataSource: 'wiki',
        essence: {
          visualization: 'totals',
          timezone: 'Etc/UTC',
          filter: $('time').in(new Date('2015-01-01Z'), new Date('2016-01-01Z')).toJS(),
          pinnedDimensions: ["page"],
          singleMeasure: 'count',
          selectedMeasures: ["count", "added"],
          splits: []
        }
      }
    }, (err, response, body) => {
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(body).to.deep.equal({
        "url": "http://localhost:9090#wiki/totals/2/EQUQLgxg9AqgKgYWAGgN7APYAdgC5gQAWAhgJYB2KwApgB5YBO1Azs6RpbutnsEwGZV" +
               "yxALbVeYUmOABfZMGIRJHPOkXLOwClTqMWbFV0w58AG1JhqDYqaoA3GwFdxR5mGIMwvAEwAGAIwArAC0AaH+cL6+uFExvgB0Ub4AWjrkACY+AQ" +
               "Bs4eGR0bFRiVGpcsBgAJ5YLsBwAJIAsiAA+gBKAIIAcgDiILIycgDaALrI5I6mpvIQGI7kXshDBHMLVMTp6dSZY8tYxADm4mMTU0A=="
      });
      testComplete();
    });
  });

  after(() => {
    pivotServer.kill();
  });

});
