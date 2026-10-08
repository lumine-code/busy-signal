const { elementWithText } = require("./helpers");

const MESSAGE_IDLE = "Idle";

function lineBreak() {
  return document.createElement("br");
}

class SignalElement extends HTMLElement {
  constructor() {
    super();
    this.titles = [];
    this.history = [];
    this.tooltipContent = null;
    this.tooltip = null;
    this.deactivateTimer = null;
    this.activatedLast = null;
    this.disposed = false;
  }
  connectedCallback() {
    if (this.disposed) return;
    this.classList.add("busy-signal", "is-read-only");
    this.tooltipContent ??= document.createElement("div");
    this.tooltipContent.style.textAlign = "left";
    this.tooltip ??= lumine.tooltips.add(this, { item: this.tooltipContent });
    this.render();
  }
  disconnectedCallback() {
    this.clearDeactivateTimer();
    this.tooltip?.dispose();
    this.tooltip = null;
  }
  update(titles, history) {
    if (this.disposed) return;
    this.titles = titles;
    this.history = history;
    this.render();
  }
  render() {
    if (this.disposed || !this.isConnected || !this.tooltipContent) return;
    const { titles, history } = this;
    this.setBusy(!!titles.length);

    const el = this.tooltipContent;
    el.textContent = "";

    if (history.length) {
      el.append(
        elementWithText("History:", "strong"),
        ...history.map((item) => elementWithText(`${item.title} (${item.duration})`)),
      );
    }
    if (titles.length) {
      if (history.length) {
        el.append(lineBreak());
      }
      el.append(
        elementWithText("Current:", "strong"),
        ...titles.map((item) => {
          const e = elementWithText(item.title);
          if (item.options) {
            e.onclick = item.options.onDidClick;
          }
          return e;
        }),
      );
    }

    if (!el.childElementCount) {
      el.textContent = MESSAGE_IDLE;
    }
  }
  setBusy(busy) {
    if (this.disposed || !this.isConnected) return;
    this.clearDeactivateTimer();
    if (busy) {
      this.classList.add("busy");
      this.classList.remove("idle");
      this.activatedLast = Date.now();
    } else {
      // Ensure busy signal is shown for at least 1 second
      const remaining = this.activatedLast == null ? 0 : 1000 - (Date.now() - this.activatedLast);
      if (remaining > 0) {
        this.deactivateTimer = setTimeout(() => {
          this.deactivateTimer = null;
          this.setBusy(false);
        }, remaining);
      } else {
        this.classList.add("idle");
        this.classList.remove("busy");
      }
    }
  }
  clearDeactivateTimer() {
    if (this.deactivateTimer != null) clearTimeout(this.deactivateTimer);
    this.deactivateTimer = null;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.disconnectedCallback();
    this.titles = [];
    this.history = [];
    this.tooltipContent?.replaceChildren();
    this.tooltipContent = null;
  }
}

const RegisteredSignalElement = customElements.get("busy-signal") || SignalElement;
if (!customElements.get("busy-signal")) {
  customElements.define("busy-signal", RegisteredSignalElement);
}

module.exports = { SignalElement: RegisteredSignalElement };
