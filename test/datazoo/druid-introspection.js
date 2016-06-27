const expect = require('chai').expect;
const spawn = require('child_process').spawn;
const request = require('request');
const extend = require('../utils/extend');
const extractConfig = require('../utils/extract-config');
const basicString = require('../utils/basic-string');

const TEST_PORT = 18082;

var child;
var ready = false;
var stdout = '';
var stderr = '';

describe('datazoo druid introspection', function () {
  this.timeout(5000);

  before((done) => {
    child = spawn('bin/pivot', `--druid 192.168.99.100 -p ${TEST_PORT}`.split(' '));

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (!ready && stdout.indexOf(`Pivot is listening on address`) !== -1) {
        ready = true;
        done();
      }
    });
  });

  it('works with GET /', (testComplete) => {
    request.get(`http://localhost:${TEST_PORT}/`, (err, response, body) => {
      expect(err).to.equal(null);
      expect(stderr).to.equal('');
      expect(response.statusCode).to.equal(200);
      expect(body).to.contain('<!DOCTYPE html>');
      expect(body).to.contain('<title>Pivot');
      expect(body).to.contain('<div class="app-container"></div>');
      expect(body).to.contain('</html>');

      var config = extractConfig(body);
      var dataSources = config.appSettings.dataSources;
      expect(dataSources).to.have.length(2);
      var wikiDataSource = dataSources[1];

      expect(wikiDataSource.name).to.equal('wikipedia');

      expect(wikiDataSource.dimensions.map(basicString)).to.deep.equal([
        "__time ~ $__time",
        "channel ~ $channel",
        "cityName ~ $cityName",
        "comment ~ $comment",
        "commentLength ~ $commentLength",
        "countryIsoCode ~ $countryIsoCode",
        "countryName ~ $countryName",
        "deltaBucket100 ~ $deltaBucket100",
        "isAnonymous ~ $isAnonymous",
        "isMinor ~ $isMinor",
        "isNew ~ $isNew",
        "isRobot ~ $isRobot",
        "isUnpatrolled ~ $isUnpatrolled",
        "metroCode ~ $metroCode",
        "namespace ~ $namespace",
        "page ~ $page",
        "regionIsoCode ~ $regionIsoCode",
        "regionName ~ $regionName",
        "sometimeLater ~ $sometimeLater",
        "user ~ $user",
        "userChars ~ $userChars"
      ]);

      expect(wikiDataSource.measures.map(basicString)).to.deep.equal([
        "count ~ $main.sum($count)",
        "added ~ $main.sum($added)",
        "deleted ~ $main.sum($deleted)",
        "delta ~ $main.sum($delta)",
        "deltaByTen ~ $main.sum($deltaByTen)",
        "delta_hist_p95 ~ $main.quantile($delta_hist,0.95)",
        "delta_hist_p99 ~ $main.quantile($delta_hist,0.99)",
        "max_delta ~ $main.max($max_delta)",
        "min_delta ~ $main.min($min_delta)",
        "page_unique ~ $main.countDistinct($page_unique)",
        "user_theta ~ $main.countDistinct($user_theta)",
        "user_unique ~ $main.countDistinct($user_unique)"
      ]);

      testComplete();
    });
  });

  after(() => {
    child.kill('SIGHUP');
  });

});
