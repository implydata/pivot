const { expect } = require('chai');
const { exec } = require('child_process');

describe('basics', function () {
  this.timeout(5000);

  it('shows help', (testComplete) => {
    exec('bin/pivot', (error: Error, stdout: Buffer, stderr: Buffer) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('Usage: pivot [options]');
      expect(stderr).to.equal('');
      testComplete();
    });
  });

  it('shows version', (testComplete) => {
    exec('bin/pivot --version', (error: Error, stdout: Buffer, stderr: Buffer) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('0.');
      expect(stderr).to.equal('');
      testComplete();
    });
  });

  it('prints the config', (testComplete) => {
    exec('bin/pivot --example wiki --print-config', (error: Error, stdout: Buffer, stderr: Buffer) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('# generated by Pivot version');
      expect(stdout).to.contain('defaultPinnedDimensions: ["channel","namespace","isRobot"]');
      expect(stderr).to.equal('');
      testComplete();
    });
  });

  it('prints the config with comments', (testComplete) => {
    exec('bin/pivot --example wiki --print-config --with-comments', (error: Error, stdout: Buffer, stderr: Buffer) => {
      expect(error).to.equal(null);
      expect(stdout).to.contain('# generated by Pivot version');
      expect(stdout).to.contain("# The list of measures defined in the UI. The order here will be reflected in the UI");
      expect(stderr).to.equal('');
      testComplete();
    });
  });

});
