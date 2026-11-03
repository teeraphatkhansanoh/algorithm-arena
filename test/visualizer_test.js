'use strict';

// Run with `node --test test/visualizer_test.js`; no browser or packages required.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../web/visualizer.js'), 'utf8');

class Clock {
  constructor() { this.timers = new Map(); this.active = new Set(); this.effects = []; this.next = 1; }
  setTimeout(callback) { const id = this.next++; this.timers.set(id, callback); return id; }
  clearTimeout(id) { this.timers.delete(id); }
  tickTimers() {
    const timers = [...this.timers.entries()];
    for (const [id, callback] of timers) if (this.timers.delete(id)) callback();
  }
  effect(element, frames, options) {
    let resolve, reject;
    const animation = {
      element, frames, options, playbackRate: 1, cancelled: false,
      finished: new Promise((yes, no) => { resolve = yes; reject = no; }),
      complete: () => { if (this.active.delete(animation)) resolve(); },
      cancel: () => {
        if (!this.active.delete(animation)) return;
        animation.cancelled = true;
        const error = new Error('Animation cancelled'); error.name = 'AbortError'; reject(error);
      }
    };
    this.active.add(animation); this.effects.push(animation); return animation;
  }
  async microtasks() { for (let index = 0; index < 12; index++) await Promise.resolve(); }
  async complete(promise) {
    let done = false, failure;
    promise.then(() => { done = true; }, error => { done = true; failure = error; });
    for (let iteration = 0; iteration < 100 && !done; iteration++) {
      await this.microtasks();
      this.tickTimers();
      for (const animation of [...this.active]) animation.complete();
    }
    await this.microtasks();
    assert.equal(done, true, 'animation sequence must terminate');
    if (failure) throw failure;
  }
}

class Element {
  constructor(tag, clock) {
    this.tag = tag; this.clock = clock; this.children = []; this.dataset = {};
    this.className = ''; this.parent = null; this.hidden = false; this.disabled = false;
    this.isConnected = true; this.listeners = new Map(); this._text = '';
    this.style = { setProperty() {} };
    this.classList = {
      add: name => this.classList.toggle(name, true),
      toggle: (name, force) => {
        const names = new Set(this.className.split(/\s+/).filter(Boolean));
        const add = force === undefined ? !names.has(name) : force;
        if (add) names.add(name); else names.delete(name);
        this.className = [...names].join(' '); return add;
      }
    };
  }
  set textContent(value) { this._text = String(value); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  replaceChildren(...children) { for (const child of this.children) child.parent = null; this.children = []; this.append(...children); }
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
  }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
  dispatch(name) { for (const callback of this.listeners.get(name) || []) callback({ target: this }); }
  matches(selector) {
    if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
    const attribute = selector.match(/^\[data-(visual|token)="([^"]+)"\]$/);
    if (attribute) return String(this.dataset[attribute[1]]) === attribute[2];
    return selector === this.tag;
  }
  querySelector(selector) {
    for (const child of this.children) {
      if (child.matches(selector)) return child;
      const nested = child.querySelector(selector); if (nested) return nested;
    }
    return null;
  }
  getBoundingClientRect() {
    const index = this.parent?.children.indexOf(this) || 0;
    return { x: index * 62, y: index * 42, width: 56, height: 35 };
  }
  animate(frames, options) { return this.clock.effect(this, frames, options); }
}

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

function harness(type, values, beforeValues = [], highlight = [], reduced = false) {
  const clock = new Clock(), root = new Element('section', clock), changes = [], steps = [];
  const motion = { matches: reduced, listeners: new Set(),
    addEventListener(name, callback) { this.listeners.add(callback); },
    removeEventListener(name, callback) { this.listeners.delete(callback); },
    change(matches) { this.matches = matches; for (const callback of this.listeners) callback(); }
  };
  function element(tag, className) { const node = new Element(tag, clock); node.className = className; return node; }
  const stage = element('div', 'visual-stage'), list = element('div', `visual-values ${type}`);
  const status = element('span', 'visual-status'), caption = element('p', 'visual-caption');
  const output = element('div', 'visual-output'); output.hidden = true; output.append(element('strong', ''));
  const replay = element('button', ''), skip = element('button', ''), speed = element('select', '');
  replay.dataset.visual = 'replay'; skip.dataset.visual = 'skip';
  stage.append(list, output); root.append(stage, status, caption, replay, skip, speed);
  const context = vm.createContext({
    window: { matchMedia: () => motion }, document: { createElement: tag => new Element(tag, clock) },
    AbortController, setTimeout: callback => clock.setTimeout(callback), clearTimeout: id => clock.clearTimeout(id)
  });
  vm.runInContext(source + '\nglobalThis.Visualizer = ArenaVisualizer;', context);
  const game = freeze({ type, step: { values: [...values], beforeValues: [...beforeValues], highlight: [...highlight] } });
  const visualizer = new context.Visualizer(root, game, { onBusy: busy => changes.push(busy), onStep: step => steps.push(JSON.parse(JSON.stringify(step))) });
  return { clock, root, list, status, caption, output, replay, skip, speed, game, visualizer, changes, motion, steps };
}

function response(values, correct = true) {
  return freeze({ correct, transition: { values: [...values] }, explanation: 'ผลตามอัลกอริทึม', game: { completed: true } });
}

function displayed(list) { return list.children.filter(node => node.dataset.token !== undefined).map(node => Number(node.children[0].textContent)); }

test('Bubble swaps the correct two identities with duplicate values and replays without mutation', async () => {
  const h = harness('bubble', [6, 1, 6], [6, 1, 6], [0, 1]);
  const original = JSON.stringify(h.game), result = response([1, 6, 6], false), savedResult = JSON.stringify(result);
  await h.clock.complete(h.visualizer.play());
  assert.deepEqual(displayed(h.list), [6, 1, 6]);
  assert.equal(h.visualizer.result, null, 'preparation does not reveal an outcome');
  await h.clock.complete(h.visualizer.reveal(result));
  assert.deepEqual(displayed(h.list), [1, 6, 6]);
  assert.deepEqual(h.list.children.map(node => Number(node.dataset.token)), [1, 0, 2]);
  assert.equal(h.output.hidden, true);
  await h.clock.complete(h.visualizer.play());
  assert.deepEqual(displayed(h.list), [1, 6, 6], 'replay starts from original snapshot');
  assert.equal(JSON.stringify(h.game), original);
  assert.equal(JSON.stringify(result), savedResult);
  assert.equal(h.visualizer.busy, false); assert.equal(h.replay.disabled, false);
  assert.ok(h.clock.effects.some(effect => effect.frames.some(frame => frame.transform?.includes('62px'))), 'swap moves bars horizontally');
  h.visualizer.destroy();
});

test('Bubble equal neighbors remain in their original order and never show a swap', async () => {
  const h = harness('bubble', [2, 6, 6], [2, 6, 6], [1, 2]);
  await h.clock.complete(h.visualizer.reveal(response([2, 6, 6])));
  assert.deepEqual(displayed(h.list), [2, 6, 6]);
  assert.deepEqual(h.list.children.map(node => Number(node.dataset.token)), [0, 1, 2]);
  assert.equal(h.clock.effects.every(effect => effect.frames.every(frame => !frame.transform?.startsWith('translate('))), true);
  h.visualizer.destroy();
});

for (const type of ['stack', 'queue']) {
  test(`${type}: animate new values, remove the correct end even after a wrong answer, and keep input immutable`, async () => {
    const h = harness(type, [11, 13, 14], [11]);
    const original = JSON.stringify(h.game), result = response(type === 'stack' ? [11, 13] : [13, 14], false);
    await h.clock.complete(h.visualizer.play());
    assert.deepEqual(displayed(h.list), [11, 13, 14]);
    assert.equal(h.output.hidden, true, 'no removed value before answering');
    const incoming = h.clock.effects.filter(effect => effect.frames[0].opacity === 0);
    assert.deepEqual(incoming.map(effect => Number(effect.element.children[0].textContent)), [13, 14], 'only newly added data enters');
    await h.clock.complete(h.visualizer.reveal(result));
    assert.deepEqual(displayed(h.list), [...result.transition.values]);
    assert.equal(h.output.querySelector('strong').textContent, type === 'stack' ? '14' : '11');
    assert.equal(h.output.hidden, false);
    await h.clock.complete(h.visualizer.play());
    assert.deepEqual(displayed(h.list), [...result.transition.values]);
    assert.equal(JSON.stringify(h.game), original);
    h.visualizer.destroy();
  });

  test(`${type}: final removal displays an empty structure and preserves the removed value`, async () => {
    const h = harness(type, [15], [15]);
    await h.clock.complete(h.visualizer.reveal(response([])));
    assert.deepEqual(displayed(h.list), []);
    assert.equal(h.list.querySelector('.visual-empty').textContent, 'ไม่มีข้อมูลเหลือแล้ว');
    assert.equal(h.output.querySelector('strong').textContent, '15');
    assert.equal(h.visualizer.busy, false);
    await h.clock.complete(h.visualizer.play());
    assert.deepEqual(displayed(h.list), []);
    h.visualizer.destroy();
  });
}

test('skip cancels an in-flight effect and immediately settles the accepted result', async () => {
  const h = harness('bubble', [8, 3], [8, 3], [0, 1]);
  const pending = h.visualizer.reveal(response([3, 8]));
  await h.clock.microtasks(); h.clock.tickTimers(); await h.clock.microtasks();
  assert.equal(h.clock.active.size, 2);
  assert.equal(h.replay.disabled, true); assert.equal(h.skip.hidden, false);
  h.skip.dispatch('click');
  assert.deepEqual(displayed(h.list), [3, 8]);
  assert.equal(h.clock.active.size, 0); assert.equal(h.visualizer.busy, false);
  const changes = h.changes.length;
  await h.clock.complete(pending);
  assert.equal(h.changes.length, changes, 'cancelled run cannot later change controls');
  assert.equal(h.clock.effects.every(effect => effect.cancelled), true);
  h.visualizer.destroy();
});

test('skip during preparation reveals the question without calculating an answer', async () => {
  const h = harness('stack', [11, 12]);
  const pending = h.visualizer.play();
  await h.clock.microtasks();
  h.visualizer.finish();
  assert.deepEqual(displayed(h.list), [11, 12]);
  assert.equal(h.visualizer.result, null); assert.equal(h.output.hidden, true);
  assert.equal(h.visualizer.busy, false);
  await h.clock.complete(pending);
  assert.equal(h.clock.timers.size, 0);
  h.visualizer.destroy();
});

test('destroy cancels pending animations and cannot send a late busy callback to a new board', async () => {
  const old = harness('bubble', [8, 3], [8, 3], [0, 1]);
  const pending = old.visualizer.play();
  await old.clock.microtasks();
  assert.equal(old.clock.active.size, 2);
  old.visualizer.destroy(); old.root.isConnected = false;
  const changes = old.changes.length;
  const replacement = harness('queue', [21, 22], [], [], true);
  await replacement.clock.complete(replacement.visualizer.play());
  await old.clock.complete(pending);
  assert.equal(old.changes.length, changes);
  assert.equal(old.clock.active.size, 0); assert.equal(old.motion.listeners.size, 0);
  assert.deepEqual(displayed(replacement.list), [21, 22]);
  assert.equal(replacement.visualizer.busy, false);
  replacement.visualizer.destroy();
});

test('reduced motion completes preparation, accepted outcome, and replay with no animations or timers', async () => {
  const h = harness('queue', [31, 32], [], [], true);
  await h.clock.complete(h.visualizer.play());
  assert.deepEqual(displayed(h.list), [31, 32]);
  await h.clock.complete(h.visualizer.reveal(response([32])));
  assert.deepEqual(displayed(h.list), [32]);
  assert.equal(h.list.children[0].querySelector('small').textContent, 'FRONT / REAR');
  await h.clock.complete(h.visualizer.play());
  assert.deepEqual(displayed(h.list), [32]);
  assert.equal(h.clock.effects.length, 0); assert.equal(h.clock.timers.size, 0);
  h.visualizer.destroy();
});

test('changing to reduced motion during a run cancels it and releases the controls', async () => {
  const h = harness('bubble', [8, 3], [8, 3], [0, 1]);
  const pending = h.visualizer.play();
  await h.clock.microtasks();
  h.motion.change(true);
  await h.clock.complete(pending);
  assert.deepEqual(displayed(h.list), [8, 3]);
  assert.equal(h.visualizer.busy, false); assert.equal(h.replay.disabled, false);
  assert.equal(h.clock.active.size, 0);
  h.visualizer.destroy();
});

test('speed control updates active effects and carries the selected speed to the next effects', async () => {
  const h = harness('bubble', [8, 3], [8, 3], [0, 1]);
  const pending = h.visualizer.play();
  await h.clock.microtasks();
  h.speed.value = '2'; h.speed.dispatch('change');
  assert.equal(h.clock.active.size, 2);
  assert.equal([...h.clock.active].every(effect => effect.playbackRate === 2), true);
  await h.clock.complete(pending);
  await h.clock.complete(h.visualizer.reveal(response([3, 8])));
  assert.equal(h.clock.effects.every(effect => effect.playbackRate === 2), true);
  h.visualizer.destroy();
});

test('code trace follows compare and swap through replay, and never reports a result before answering', async () => {
  const h = harness('bubble', [8, 3], [8, 3], [0, 1]);
  await h.clock.complete(h.visualizer.play());
  assert.deepEqual(h.steps.map(step => step.phase), ['compare', 'question']);
  assert.ok(h.steps.every(step => !step.settled));
  await h.clock.complete(h.visualizer.reveal(response([3, 8])));
  assert.equal(h.steps.at(-1).phase, 'swap');
  assert.equal(h.steps.at(-1).settled, true);
  assert.deepEqual(h.steps.at(-1).values, [3, 8]);
  const count = h.steps.length;
  await h.clock.complete(h.visualizer.play());
  assert.deepEqual(h.steps.slice(count).map(step => step.phase), ['compare', 'swap', 'swap']);
  h.visualizer.destroy();
});

for (const type of ['stack', 'queue']) {
  test(`${type}: code trace receives each inserted value, the pending call, and the final empty state on skip`, async () => {
    const h = harness(type, [11, 12]);
    await h.clock.complete(h.visualizer.play());
    const adding = type === 'stack' ? 'push' : 'enqueue', removing = type === 'stack' ? 'pop' : 'dequeue';
    assert.deepEqual(h.steps.filter(step => step.phase === adding).map(step => step.value), [11, 12]);
    assert.deepEqual(h.steps.at(-1), { phase: 'question', values: [11, 12] });
    h.visualizer.destroy();
    const final = harness(type, [15], [15]);
    const pending = final.visualizer.reveal(response([]));
    final.visualizer.finish();
    await final.clock.complete(pending);
    assert.deepEqual(final.steps.at(-1), { phase: removing, values: [], settled: true });
    const count = final.steps.length;
    final.visualizer.destroy();
    await final.clock.microtasks();
    assert.equal(final.steps.length, count, 'cancelled work cannot change another code panel');
  });
}

function lessonHarness() {
  const controls = new Map(), codeLines = Array.from({length:13}, (_, index) => ({
    dataset: { codeLine: String(index + 1) }, active: false,
    classList: { toggle(name, active) { codeLines[index].active = active; } },
    setAttribute() {}, removeAttribute() {}
  }));
  const panel = { querySelectorAll: () => codeLines };
  const document = {
    querySelector(selector) {
      if (selector === '.code-panel') return panel;
      if (!controls.has(selector)) controls.set(selector, { addEventListener() {} });
      return controls.get(selector);
    },
    addEventListener() {}
  };
  const context = vm.createContext({ document, window:{addEventListener() {}}, URLSearchParams, fetch:() => new Promise(() => {}) });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../web/app.js'), 'utf8') + '\nglobalThis.lesson = {updateCodeLesson, codeLessonMarkup, codeLessons};', context);
  return {
    ...context.lesson, controls,
    active:() => codeLines.filter(line => line.active).map(line => Number(line.dataset.codeLine))
  };
}

test('Bubble code panel explains the actual step, handles equal values, and follows changed array values', () => {
  const h = lessonHarness();
  const game = { type:'bubble', step:{values:[6,6,1],highlight:[0,1],operation:'COMPARE · รอบ 1'} };
  h.updateCodeLesson(game, {phase:'question', values:[6,6,1]});
  assert.deepEqual(h.active(), [3,4,5]);
  assert.match(h.controls.get('#code-explanation').textContent, /ลองเลือกคำตอบ/);
  h.updateCodeLesson(game, {phase:'keep', values:[6,6,1], settled:true});
  assert.deepEqual(h.active(), [5]);
  assert.match(h.controls.get('#code-explanation').textContent, /เป็นเท็จ/);
  game.step.highlight = [1,2];
  h.updateCodeLesson(game, {phase:'swap', values:[6,1,6], settled:true});
  assert.deepEqual(h.active(), [6]);
  assert.match(h.controls.get('#code-variables').innerHTML, /\[6, 1, 6\]/);
  assert.match(h.controls.get('#code-explanation').textContent, /swap\(a, 1, 2\)/);
});

for (const type of ['stack', 'queue']) {
  test(`${type}: code panel matches insertion/removal line numbers and keeps return value hidden until result`, () => {
    const h = lessonHarness(), stack = type === 'stack';
    const game = {type, step:{values:[11,12]}};
    h.updateCodeLesson(game, {phase:stack?'push':'enqueue',values:[11,12],value:12});
    assert.deepEqual(h.active(), [3,4]);
    assert.match(h.controls.get('#code-variables').innerHTML, /value/);
    h.updateCodeLesson(game, {phase:'question',values:[11,12]});
    assert.deepEqual(h.active(), [7,8]);
    assert.doesNotMatch(h.controls.get('#code-variables').innerHTML, /ค่าที่ return/);
    h.updateCodeLesson(game, {phase:stack?'pop':'dequeue',values:stack?[11]:[12],settled:true});
    assert.deepEqual(h.active(), stack?[11,12]:[11]);
    assert.match(h.controls.get('#code-variables').innerHTML, /ค่าที่ return/);
    assert.match(h.controls.get('#code-explanation').textContent, stack?/คืนค่า 12/:/คืนค่า 11/);
    const markup = h.codeLessonMarkup(game);
    assert.match(markup.replace(/<[^>]*>/g, ''), /List&lt;Integer&gt;/, 'Java generics remain text, not HTML');
    assert.match(markup, /อธิบายโค้ดทีละส่วน/);
  });
}

test('an answer arriving after leaving and returning to the game rerenders the authoritative next question', async () => {
  const clock = new Clock(), controls = new Map(), buttons = [new Element('button', clock), new Element('button', clock)];
  let resolveAnswer;
  const responseReady = new Promise(resolve => { resolveAnswer = resolve; });
  const document = {
    querySelector(selector) {
      if (!controls.has(selector)) controls.set(selector, new Element('div', clock));
      return controls.get(selector);
    },
    querySelectorAll(selector) { return selector === '.answer-btn' ? buttons : []; },
    addEventListener() {}
  };
  const context = vm.createContext({
    document, window: { addEventListener() {}, scrollTo() {} }, location: { hash: '#game' },
    URLSearchParams, setInterval() {}, clearInterval() {}, setTimeout() {}, clearTimeout() {},
    // The app's initial me/catalog fetches remain pending; only the test answer completes.
    fetch: url => url === '/api/answer' ? responseReady : new Promise(() => {})
  });
  const appSource = fs.readFileSync(path.join(__dirname, '../web/app.js'), 'utf8');
  vm.runInContext(appSource + `
    globalThis.rendered = [];
    game = function () {
      rendered.push(state.game);
      state.visualizer = {busy: false, destroy() {}};
    };
    globalThis.app = {state, answer, route};
  `, context);
  const initial = {
    id: 'test-attempt', type: 'bubble', index: 0, total: 2, completed: false,
    step: { values: [8, 3, 5], highlight: [0, 1], choices: ['swap', 'keep'] }
  };
  const next = {
    ...initial, index: 1, step: { values: [3, 8, 5], highlight: [1, 2], choices: ['swap', 'keep'] }
  };
  const app = context.app;
  app.state.game = initial;
  app.state.visualizer = { busy: false, destroy() {} };
  const pending = app.answer(0);
  assert.equal(app.state.submitting, true);
  context.location.hash = '#home'; await app.route();
  context.location.hash = '#game'; await app.route();
  assert.equal(context.rendered.at(-1), initial, 'returning while pending initially uses the old snapshot');
  assert.equal(app.state.submitting, true);
  resolveAnswer({ ok: true, json: async () => ({ correct: true, transition: { values: [3, 8, 5] }, game: next }) });
  await pending;
  assert.equal(app.state.game, next);
  assert.equal(context.rendered.at(-1), next, 'late accepted answer replaces the stale displayed question');
  assert.equal(app.state.submitting, false);
  assert.equal(buttons.every(button => button.disabled === false), true, 'pending submission does not leave the replacement board disabled');
});
