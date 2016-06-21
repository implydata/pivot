const { expect } = require('chai');
const { spawn } = require('child_process');
const request = require('request');

const TEST_PORT = 18082;

var child;

describe('run examples', function () {
  this.timeout(5000);

  before((done) => {
    child = spawn('bin/pivot', `--examples -p ${TEST_PORT}`.split(' '));

    child.stderr.on('data', (data) => {
      throw new Error(data.toString());
    });

    child.stdout.on('data', (data) => {
      data = data.toString();
      if (data.indexOf(`Pivot is listening on address`) !== -1) {
        done();
      }
    });
  });

  it('works with GET /health', (testComplete) => {
    request.get(`http://localhost:${TEST_PORT}/health`, (err, response, body) => {
      expect(err).to.equal(null);
      expect(body).to.contain('I am healthy @');
      testComplete();
    });
  });

  it('works with GET /', (testComplete) => {
    request.get(`http://localhost:${TEST_PORT}/`, (err, response, body) => {
      expect(err).to.equal(null);
      expect(body).to.contain('<!DOCTYPE html>');
      expect(body).to.contain('<title>Pivot');
      expect(body).to.contain('<div class="app-container"></div>');
      expect(body).to.contain('var __CONFIG__ = {');
      expect(body).to.contain('</html>');
      testComplete();
    });
  });

  after(() => {
    child.kill('SIGHUP');
  });


});
