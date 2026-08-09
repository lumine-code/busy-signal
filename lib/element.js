const { elementWithText } = require("./helpers");

const MESSAGE_IDLE = "Idle";

function lineBreak() {
  return document.createElement("br");
}

class SignalElement extends HTMLElement {
  connectedCallback() {
    this.classList.add("inline-block", "busy-signal", "is-read-only");
    this.tooltipContent = document.createElement("div");
    this.tooltipContent.style.textAlign = "left";
    this.tooltip = lumine.tooltips.add(this, { item: this.tooltipContent });
    this.update([], []);
  }
  update(titles, history) {
    if (!this.tooltipContent) return;
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
    if (busy) {
      this.classList.add("busy");
      this.classList.remove("idle");
      this.activatedLast = Date.now();
      if (this.deactivateTimer) {
        clearTimeout(this.deactivateTimer);
        this.deactivateTimer = null;
      }
    } else {
      // Ensure busy signal is shown for at least 1 second
      const timeNow = Date.now();
      const timeThen = this.activatedLast || 0;
      const timeDifference = timeNow - timeThen;
      if (timeDifference < 1000) {
        if (this.deactivateTimer) clearTimeout(this.deactivateTimer);
        this.deactivateTimer = setTimeout(() => this.setBusy(false), timeDifference + 100);
      } else {
        this.classList.add("idle");
        this.classList.remove("busy");
      }
    }
  }
  dispose() {
    if (this.deactivateTimer) {
      clearTimeout(this.deactivateTimer);
    }
    if (this.tooltip) {
      this.tooltip.dispose();
    }
  }
}

customElements.define("busy-signal", SignalElement);

module.exports = { SignalElement };
