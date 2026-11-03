'use strict';

// Each run owns its animations. Leaving the game cancels them before a new board mounts.
class ArenaVisualizer {
  constructor(root, game, options = {}) {
    this.root = root;
    this.game = game;
    this.speed = options.speed || 1;
    this.onBusy = options.onBusy || (() => {});
    this.onStep = options.onStep || (() => {});
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.animations = new Set();
    this.run = 0;
    this.result = null;
    this.initial = game.step.values.map((value, id) => ({ value, id }));
    this.beforeCount = game.step.beforeValues?.length ?? this.initial.length;
    this.stage = root.querySelector('.visual-stage');
    this.list = root.querySelector('.visual-values');
    this.caption = root.querySelector('.visual-caption');
    this.status = root.querySelector('.visual-status');
    this.replay = root.querySelector('[data-visual="replay"]');
    this.skip = root.querySelector('[data-visual="skip"]');
    this.output = root.querySelector('.visual-output');
    this.list.style.setProperty('--value-count', this.initial.length);
    this.replay.addEventListener('click', () => this.play());
    this.skip.addEventListener('click', () => this.finish());
    root.querySelector('select').addEventListener('change', event => {
      this.speed = Number(event.target.value);
      options.onSpeed?.(this.speed);
      for (const animation of this.animations) animation.playbackRate = this.speed;
    });
    this.motionChanged = () => { if (this.motion.matches && this.busy) this.finish(); };
    this.motion.addEventListener('change', this.motionChanged);
  }

  cancel() {
    this.run++;
    this.controller?.abort();
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
  }

  destroy() {
    this.cancel();
    this.motion.removeEventListener('change', this.motionChanged);
  }

  setBusy(busy) {
    this.busy = busy;
    this.root.classList.toggle('is-playing', busy);
    this.replay.disabled = busy;
    this.skip.hidden = !busy;
    this.onBusy(busy);
  }

  current(run) { return run === this.run && this.root.isConnected; }

  async wait(ms, run) {
    if (!this.current(run)) return false;
    if (this.motion.matches) return true;
    const signal = this.controller.signal;
    await new Promise(resolve => {
      const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
      const timer = setTimeout(done, ms / this.speed);
      signal.addEventListener('abort', done, { once: true });
    });
    return this.current(run);
  }

  async animate(element, frames, duration, run) {
    if (!this.current(run) || this.motion.matches || !element?.animate) return;
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.22,.7,.25,1)' });
    animation.playbackRate = this.speed;
    this.animations.add(animation);
    try { await animation.finished; } catch (error) { if (error.name !== 'AbortError') throw error; }
    finally { this.animations.delete(animation); }
  }

  label(index, count) {
    if (this.game.type === 'bubble') return `[${index}]`;
    if (this.game.type === 'stack') return index === count - 1 ? 'TOP' : '';
    if (count === 1) return 'FRONT / REAR';
    return index === 0 ? 'FRONT' : index === count - 1 ? 'REAR' : '';
  }

  render(items, highlight = []) {
    this.items = [...items];
    this.list.replaceChildren();
    this.list.classList.toggle('is-empty', items.length === 0);
    if (!items.length) {
      const empty = document.createElement('span');
      empty.className = 'visual-empty';
      empty.textContent = 'ยังไม่มีข้อมูล';
      this.list.append(empty);
    }
    const max = Math.max(...this.initial.map(item => item.value), 1);
    items.forEach((item, index) => {
      const box = document.createElement('div');
      box.className = 'value-box' + (highlight.includes(index) ? ' highlight' : '');
      box.dataset.token = item.id;
      box.style.setProperty('--bar-height', `${54 + item.value / max * 86}px`);
      const value = document.createElement('span');
      value.textContent = item.value;
      const pointer = document.createElement('small');
      pointer.textContent = this.label(index, items.length);
      box.append(value, pointer);
      this.list.append(box);
    });
  }

  node(item) { return this.list.querySelector(`[data-token="${item.id}"]`); }

  say(status, text, phase, detail = {}) {
    this.status.textContent = status;
    this.caption.textContent = text;
    if (phase) this.onStep({ phase, values: this.items.map(item => item.value), ...detail });
  }

  question() {
    this.render(this.initial, this.game.step.highlight);
    const type = this.game.type;
    this.say('ตาคุณแล้ว', type === 'bubble'
      ? 'ดูคู่ที่เน้นสี แล้วเลือกว่าจะสลับตำแหน่งหรือไม่'
      : `ข้อมูลพร้อมแล้ว ลองคิดว่า ${type === 'stack' ? 'POP' : 'DEQUEUE'} จะนำตัวไหนออก`, 'question');
  }

  finalItems() {
    const values = this.result.transition.values;
    const items = [...this.initial];
    if (this.game.type === 'bubble') {
      const [left, right] = this.game.step.highlight;
      if (values[left] !== items[left].value) [items[left], items[right]] = [items[right], items[left]];
    } else {
      items.splice(this.game.type === 'stack' ? items.length - 1 : 0, 1);
    }
    return items;
  }

  showOutput() {
    if (this.game.type === 'bubble') return;
    const item = this.initial[this.game.type === 'stack' ? this.initial.length - 1 : 0];
    this.output.hidden = false;
    this.output.querySelector('strong').textContent = item.value;
  }

  settled() {
    if (!this.result) { this.question(); return; }
    this.render(this.finalItems());
    this.showOutput();
    if (this.game.type !== 'bubble' && !this.items.length) this.list.querySelector('.visual-empty').textContent = 'ไม่มีข้อมูลเหลือแล้ว';
    this.say('ผลของขั้นตอนนี้', this.result.explanation, this.outcomePhase(), { settled: true });
  }

  outcomePhase() {
    if (this.game.type !== 'bubble') return this.game.type === 'stack' ? 'pop' : 'dequeue';
    const left = this.game.step.highlight[0];
    return this.result.transition.values[left] !== this.initial[left].value ? 'swap' : 'keep';
  }

  finish() {
    const restoreFocus = document.activeElement === this.skip;
    this.cancel();
    this.settled();
    this.setBusy(false);
    if (restoreFocus) this.replay.focus({ preventScroll: true });
  }

  async prepare(run) {
    const type = this.game.type;
    if (type === 'bubble') {
      this.render(this.initial, this.game.step.highlight);
      this.say('COMPARE', 'พิจารณาตัวเลขสองตัวที่อยู่ติดกัน', 'compare');
      await Promise.all(this.game.step.highlight.map(index => this.animate(this.node(this.initial[index]), [
        { transform: 'translateY(-8px)' }, { transform: 'translateY(-17px)' }, { transform: 'translateY(-8px)' }
      ], 600, run)));
      return this.current(run);
    }
    this.render(this.initial.slice(0, this.beforeCount));
    if (!await this.wait(200, run)) return false;
    for (let index = this.beforeCount; index < this.initial.length; index++) {
      if (!this.current(run)) return false;
      const item = this.initial[index];
      const positions = new Map(this.items.map(previous => [previous.id, this.node(previous).getBoundingClientRect()]));
      this.render(this.initial.slice(0, index + 1));
      this.say(type === 'stack' ? 'PUSH' : 'ENQUEUE', type === 'stack'
        ? `เพิ่ม ${item.value} ไว้บนสุดของ Stack`
        : `เพิ่ม ${item.value} ที่ท้ายคิว (REAR)`, type === 'stack' ? 'push' : 'enqueue', { value: item.value });
      const shift = type === 'stack' ? 'translateY(-45px)' : 'translateX(45px)';
      await Promise.all([
        this.animate(this.node(item), [{ opacity: 0, transform: shift }, { opacity: 1, transform: 'none' }], 500, run),
        ...this.items.filter(previous => positions.has(previous.id)).map(previous => {
          const before = positions.get(previous.id), node = this.node(previous), after = node.getBoundingClientRect();
          return this.animate(node, [{ transform: `translate(${before.x - after.x}px,${before.y - after.y}px)` }, { transform: 'none' }], 500, run);
        })
      ]);
      if (!await this.wait(220, run)) return false;
    }
    return this.current(run);
  }

  async outcome(run) {
    const type = this.game.type;
    this.render(this.initial, type === 'bubble' ? this.game.step.highlight : []);
    if (!await this.wait(180, run)) return;
    if (type === 'bubble') {
      const [left, right] = this.game.step.highlight;
      const swap = this.result.transition.values[left] !== this.initial[left].value;
      this.say(swap ? 'SWAP' : 'KEEP', this.result.explanation, swap ? 'swap' : 'keep');
      const a = this.node(this.initial[left]), b = this.node(this.initial[right]);
      const distance = b.getBoundingClientRect().x - a.getBoundingClientRect().x;
      await Promise.all([a, b].map((node, index) => this.animate(node, swap ? [
        { transform: 'translate(0,-8px)' },
        { transform: `translate(${(index === 0 ? 1 : -1) * distance}px,${index === 0 ? -28 : 8}px)`, offset: .75 },
        { transform: `translate(${(index === 0 ? 1 : -1) * distance}px,-8px)` }
      ] : [
        { transform: 'translateY(-8px)', opacity: 1 }, { transform: 'translateY(-12px)', opacity: .55 }, { transform: 'translateY(-8px)', opacity: 1 }
      ], 850, run)));
    } else {
      const item = this.initial[type === 'stack' ? this.initial.length - 1 : 0];
      const node = this.node(item);
      node.classList.add('removing');
      this.say(type === 'stack' ? 'POP' : 'DEQUEUE', type === 'stack'
        ? `นำ ${item.value} ออกจาก TOP เพราะเข้าทีหลัง ออกก่อน (LIFO)`
        : `นำ ${item.value} ออกจาก FRONT เพราะเข้าก่อน ออกก่อน (FIFO)`, type === 'stack' ? 'pop' : 'dequeue');
      await this.animate(node, [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: type === 'stack' ? 'translateY(-65px)' : 'translateX(-65px)' }
      ], 750, run);
    }
    if (this.current(run)) {
      const positions = new Map(this.items.map(item => [item.id, this.node(item).getBoundingClientRect()]));
      this.settled();
      if (type !== 'bubble') await Promise.all(this.items.map(item => {
        const node = this.node(item), before = positions.get(item.id), after = node.getBoundingClientRect();
        return this.animate(node, [{ transform: `translate(${before.x - after.x}px,${before.y - after.y}px)` }, { transform: 'none' }], 350, run);
      }));
    }
  }

  async play(prepare = true) {
    this.cancel();
    this.controller = new AbortController();
    const run = this.run;
    this.output.hidden = true;
    this.setBusy(true);
    try {
      if (prepare && !await this.prepare(run)) return;
      if (!this.current(run)) return;
      if (this.result) await this.outcome(run);
      else this.question();
    } catch (error) {
      // A visual effect must never prevent answering or reading the server's result.
      if (this.current(run)) this.settled();
    } finally {
      if (this.current(run)) this.setBusy(false);
    }
  }

  reveal(response) {
    this.result = response;
    this.replay.textContent = '↻ ดูขั้นตอนนี้ซ้ำ';
    return this.play(false);
  }
}
