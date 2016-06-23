const expect = require('chai').expect;
const exec = require('child_process').exec;

function extend(obj1, obj2) {
  var newObj = {};
  for (var k in obj1) newObj[k] = obj1[k];
  for (var k in obj2) newObj[k] = obj2[k];
  return newObj;
}

describe('basics', function () {
  this.timeout(5000);

  it('shows help', (testComplete) => {
    exec('bin/pivot', (error, stdout, stderr) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('Usage: pivot [options]');
      expect(stderr).to.equal('');
      testComplete();
    });
  });

  it('shows version', (testComplete) => {
    exec('bin/pivot --version', (error, stdout, stderr) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('0.');
      expect(stderr).to.equal('');
      testComplete();
    });
  });

  it('prints the config', (testComplete) => {
    exec('bin/pivot --example wiki --print-config', (error, stdout, stderr) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('# generated by Pivot version');
      expect(stdout).to.contain('defaultPinnedDimensions: ["channel","namespace","isRobot"]');
      expect(stderr).to.equal('');
      testComplete();
    });
  });

  it('prints the config with comments', (testComplete) => {
    exec('bin/pivot --example wiki --print-config --with-comments', (error, stdout, stderr) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('# generated by Pivot version');
      expect(stdout).to.contain("# The list of measures defined in the UI. The order here will be reflected in the UI");
      expect(stderr).to.equal('');
      testComplete();
    });
  });

  it('reads a config an prints it inlined', (testComplete) => {
    exec('bin/pivot --config test/configs/inline-vars.yaml --print-config',
      {
        env: extend(process.env, {
          DS_NAME: 'test1',
          DS_TITLE: 'Test One Title',
          DS_SOURCE: '../../assets/data/wikiticker-2015-09-12-tiny.json'
        })
      },
      (error, stdout, stderr) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('# generated by Pivot version');
      expect(stdout).to.contain("title: Test One Title");
      expect(stdout).to.contain("name: test1");
      expect(stdout).to.contain("expression: $regionIsoCode");
      expect(stderr).to.equal('');
      testComplete();
    });
  });

  it('complains if an inlined var can not be found', (testComplete) => {
    exec('bin/pivot --config test/configs/inline-vars.yaml --print-config',
      {
        env: extend(process.env, {
          DS_NAME: 'test1',
          DS_TITLE: 'Test One Title'
        })
      },
      (error, stdout, stderr) => {
        expect(error).to.be.an('error');
        expect(stderr).to.contain("There was an error generating a config:"); // ToDo: make the error here better
        testComplete();
      });
  });

  it('complains if there are too many settings inputs', (testComplete) => {
    exec('bin/pivot --example wiki --postgres localhost', (error, stdout, stderr) => {
      expect(error).to.be.an('error');
      expect(stderr).to.contain('only one of --config, --examples, --file, --druid, --postgres, --mysql can be given on the command line');
      expect(stderr).to.not.contain('https://github.com/implydata/pivot/blob/master/docs/pivot-0.9.x-migration.md');
      testComplete();
    });
  });

  it('complains if there are too many settings inputs (+message)', (testComplete) => {
    exec('bin/pivot --config blah.yaml --druid localhost', (error, stdout, stderr) => {
      expect(error).to.be.an('error');
      expect(stderr).to.contain('only one of --config, --examples, --file, --druid, --postgres, --mysql can be given on the command line');
      expect(stderr).to.contain('https://github.com/implydata/pivot/blob/master/docs/pivot-0.9.x-migration.md');
      testComplete();
    });
  });

});
