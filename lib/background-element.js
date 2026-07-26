const { elementWithText } = require("./helpers");

const MESSAGE_CLICK = "Click for details";

// Second zone of the busy-signal tile: the long-running background processes.
// It carries no animation on purpose, the transient zone owns the churn.
class BackgroundElement extends HTMLElement {
  connectedCallback() {
    // Reattaching the tile must not build the zone a second time.
    if (this.tooltipContent) return;

    // No `inline-block` here: the zone is laid out by the tile wrapper, and the
    // status-bar rule for that class would fight the hidden state.
    this.classList.add("busy-signal-background");

    this.icon = document.createElement("span");
    this.icon.classList.add("icon", "icon-server");
    this.appendChild(this.icon);

    this.count = document.createElement("span");
    this.count.classList.add("busy-signal-background-count");
    this.appendChild(this.count);

    this.failed = document.createElement("span");
    this.failed.classList.add("busy-signal-background-failed", "icon", "icon-alert");
    this.appendChild(this.failed);

    this.tooltipContent = document.createElement("div");
    this.tooltipContent.style.textAlign = "left";
    this.tooltip = atom.tooltips.add(this, { item: this.tooltipContent });

    this.addEventListener("click", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      if (this.clickHandler) this.clickHandler();
    });

    this.update(this.entries || []);
  }
  setClickHandler(callback) {
    this.clickHandler = callback;
  }
  setEnabled(enabled) {
    this.enabled = enabled !== false;
    this.update(this.entries || []);
  }
  update(entries) {
    this.entries = entries;
    if (!this.tooltipContent) return;

    const failed = entries.filter((entry) => entry.status === "failed");
    const starting = entries.filter((entry) => entry.status === "starting");

    this.count.textContent = `${entries.length}`;
    this.failed.textContent = failed.length ? `${failed.length}` : "";
    this.failed.hidden = failed.length === 0;
    this.classList.toggle("has-failed", failed.length > 0);
    this.classList.toggle("has-starting", starting.length > 0);

    const el = this.tooltipContent;
    el.textContent = "";
    el.append(
      elementWithText("Background:", "strong"),
      ...entries.map((entry) =>
        elementWithText(
          `${entry.title} (${entry.status})${entry.detail ? ` - ${entry.detail}` : ""}`,
        ),
      ),
      elementWithText(MESSAGE_CLICK, "em"),
    );

    // Nothing to show is nothing to occupy the status bar with.
    this.hidden = this.enabled === false || entries.length === 0;
  }
  dispose() {
    if (this.tooltip) {
      this.tooltip.dispose();
    }
  }
}

customElements.define("busy-signal-background", BackgroundElement);

module.exports = { BackgroundElement };
