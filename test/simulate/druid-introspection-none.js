const expect = require('chai').expect;
const spawn = require('child_process').spawn;
const request = require('request');
const mockDruid = require('../utils/mock-druid');
const extend = require('../utils/extend');
const extractConfig = require('../utils/extract-config');
const basicString = require('../utils/basic-string');

const TEST_PORT = 18082;

var child;
var ready = false;
var stdout = '';
var stderr = '';

describe('druid reintrospect on load', function () {
  this.timeout(5000);

  before((done) => {
    mockDruid(28085, {
      onDataSources: function() {
        return {
          json: ['wikipedia']
        }
      }
    }).then(function() {
      child = spawn('bin/pivot', `-c test/configs/introspection-none.yaml -p ${TEST_PORT}`.split(' '), {
        env: extend(process.env, {
          DRUID_HOST: 'localhost:28085'
        })
      });

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
  });

  it('works with initial GET /', (testComplete) => {
    request.get(`http://localhost:${TEST_PORT}/`, (err, response, body) => {
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(body).to.contain('<!DOCTYPE html>');
      expect(body).to.contain('<title>Pivot');
      expect(body).to.contain('<div class="app-container"></div>');
      expect(body).to.contain('</html>');

      var config = extractConfig(body);
      var dataSources = config.appSettings.dataSources;
      expect(dataSources).to.have.length(1);
      var wikiDataSource = dataSources[0];

      expect(wikiDataSource.name).to.equal('wiki');

      expect(wikiDataSource.dimensions.map(basicString)).to.deep.equal([
        "time ~ $time",
        "is-english ~ $channel.is(\"en\")",
        "user-number ~ $user.extract((\\d+))",
        "user-first-letter ~ $user.substr(0,1)",
        "channel ~ $channel",
        "channel-lookup ~ $channel.lookup(channel-lookup).fallback(\"LOL NO\")",
        "user-letter-phonetic ~ $userChars.lookup(nato-phonetic)"
      ]);

      expect(wikiDataSource.measures.map(basicString)).to.deep.equal([
        "count ~ $main.sum($count)",
        "added ~ $main.sum($added)"
      ]);

      testComplete();
    });
  });

  after(() => {
    child.kill('SIGHUP');
  });

});
