const { expect } = require('chai');
import { updater } from './updater';

function stdEquals(a: any, b: any) {
  return a === b;
}

describe('updater', function () {
  it('one enter', () => {
    var ops: string[] = [];

    updater(
      [],
      [{ name: 'A' }],
      {
        equals: stdEquals,
        onEnter: (newThing) => {
          ops.push(`Enter ${newThing.name}`);
        },
        onUpdate: (newThing, oldThing) => {
          ops.push(`Update ${oldThing.name} => ${newThing.name}`);
        },
        onExit: (oldThing) => {
          ops.push(`Exit ${oldThing.name}`);
        }
      }
    );

    expect(ops.join('; ')).to.equal('Enter A');
  });

  it('one exit', () => {
    var ops: string[] = [];

    updater(
      [{ name: 'A' }],
      [],
      {
        equals: stdEquals,
        onEnter: (newThing) => {
          ops.push(`Enter ${newThing.name}`);
        },
        onUpdate: (newThing, oldThing) => {
          ops.push(`Update ${oldThing.name} => ${newThing.name}`);
        },
        onExit: (oldThing) => {
          ops.push(`Exit ${oldThing.name}`);
        }
      }
    );

    expect(ops.join('; ')).to.equal('Exit A');
  });

  it('enter / exit', () => {
    var ops: string[] = [];

    updater(
      [{ name: 'A' }],
      [{ name: 'B' }],
      {
        equals: stdEquals,
        onEnter: (newThing) => {
          ops.push(`Enter ${newThing.name}`);
        },
        onUpdate: (newThing, oldThing) => {
          ops.push(`Update ${oldThing.name} => ${newThing.name}`);
        },
        onExit: (oldThing) => {
          ops.push(`Exit ${oldThing.name}`);
        }
      }
    );

    expect(ops.join('; ')).to.equal('Enter B; Exit A');
  });

});

