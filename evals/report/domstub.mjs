// A deliberately tiny DOM, just enough to EXECUTE report.html's render code in Node.
//
// It exists so evals/selftest.mjs can catch a renderer that throws on real data — the
// failure mode a syntax check cannot see and that would otherwise reach you as a blank
// panel in a browser. It is not a browser and does not pretend to be one: it models
// element creation, innerHTML, children, class/dataset, and event registration, which
// is the whole surface the report uses.
class El {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.dataset = {}; this.style = {};
    this._class = ''; this._html = ''; this._text = '';
    this.classList = {
      add: (c) => { this._class = `${this._class} ${c}`.trim(); },
      remove: (c) => { this._class = this._class.split(/\s+/).filter((x) => x !== c).join(' '); },
      contains: (c) => this._class.split(/\s+/).includes(c),
      toggle: (c) => (this.classList.contains(c) ? this.classList.remove(c) : this.classList.add(c)),
    };
    this.hidden = false; this.attributes = {};
  }
  set className(v) { this._class = v; }
  get className() { return this._class; }
  set innerHTML(v) { this._html = String(v); }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  addEventListener() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 10, height: 10 }; }
  querySelectorAll() { return []; }
  querySelector() { return null; }
}

export function installDOM() {
  const registry = new Map();
  const doc = {
    createElement: (t) => new El(t),
    querySelector: (sel) => {
      if (!registry.has(sel)) registry.set(sel, new El('div'));
      return registry.get(sel);
    },
    querySelectorAll: () => [],
  };
  globalThis.document = doc;
  globalThis.window = { innerWidth: 1400, scrollTo() {}, addEventListener() {} };
  globalThis.location = { protocol: 'file:' };
  globalThis.requestAnimationFrame = (fn) => fn();
  return { doc, registry, El };
}
