import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../src/engine/stateMachine.js';

function makeStates(calls) {
  return {
    a: {
      enter: (owner) => calls.push(['a.enter', owner.tag]),
      update: (owner, dt, input) => calls.push(['a.update', dt, input]),
      exit: (owner) => calls.push(['a.exit', owner.tag]),
    },
    b: {
      enter: (owner) => calls.push(['b.enter', owner.tag]),
      update: (owner) => calls.push(['b.update']),
      exit: (owner) => calls.push(['b.exit']),
    },
    // No enter/update/exit at all — must not throw (fighterStates.js relies
    // on this for states like 'walkForward' that only define update()).
    c: {},
  };
}

test('constructor sets initial state and calls its enter hook', () => {
  const calls = [];
  const owner = { tag: 'owner1' };
  const fsm = new StateMachine(owner, makeStates(calls), 'a');

  assert.equal(fsm.current, 'a');
  assert.deepEqual(calls, [['a.enter', 'owner1']]);
});

test('transition calls exit on the old state then enter on the new one, in order', () => {
  const calls = [];
  const owner = { tag: 'owner1' };
  const fsm = new StateMachine(owner, makeStates(calls), 'a');
  calls.length = 0; // drop the constructor's enter call

  fsm.transition('b');

  assert.equal(fsm.current, 'b');
  assert.deepEqual(calls, [['a.exit', 'owner1'], ['b.enter', 'owner1']]);
});

test('transitioning to the current state is a no-op', () => {
  const calls = [];
  const fsm = new StateMachine({ tag: 'x' }, makeStates(calls), 'a');
  calls.length = 0;

  fsm.transition('a');

  assert.equal(fsm.current, 'a');
  assert.deepEqual(calls, []);
});

test('transitioning to an unknown state throws and leaves current state untouched', () => {
  const calls = [];
  const fsm = new StateMachine({ tag: 'x' }, makeStates(calls), 'a');

  assert.throws(() => fsm.transition('nope'), /Unknown state: nope/);
  assert.equal(fsm.current, 'a');
});

test('states without enter/exit/update hooks do not throw', () => {
  const calls = [];
  const fsm = new StateMachine({ tag: 'x' }, makeStates(calls), 'a');
  assert.doesNotThrow(() => fsm.transition('c'));
  assert.doesNotThrow(() => fsm.update(1 / 60, {}));
});

test('update(dt, input) delegates to the current state, and is() reports it correctly', () => {
  const calls = [];
  const fsm = new StateMachine({ tag: 'x' }, makeStates(calls), 'a');
  calls.length = 0;

  fsm.update(1 / 60, { left: true });

  assert.deepEqual(calls, [['a.update', 1 / 60, { left: true }]]);
  assert.equal(fsm.is('a'), true);
  assert.equal(fsm.is('b'), false);
});
