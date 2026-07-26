const { SelectListView, createTwoLineItem, highlightMatches } = require("@lumine-code/select-list");
const logger = require("./logger");

const STATUS_ICONS = {
  starting: "icon-clock",
  running: "icon-check",
  failed: "icon-alert",
  stopped: "icon-circle-slash",
};

class BackgroundList {
  constructor(getEntries) {
    this.getEntries = getEntries;
    this.selectList = new SelectListView({
      className: "busy-signal-background-list",
      emptyMessage: "No background processes",
      placeholderText: "Background processes...",
      helpMarkdown: "Available commands:\n" + "- **Enter**: Copy the entry detail to the clipboard",
      willShow: () => this.update(),
      filterKeyForItem: (item) => item.label,
      elementForItem: (item, { filterKey, matchIndices }) => {
        const status = document.createElement("span");
        status.classList.add("busy-signal-background-status", `status-${item.status}`);
        status.textContent = item.status;
        return createTwoLineItem({
          primary: highlightMatches(filterKey, matchIndices),
          secondary: status,
          icon: [STATUS_ICONS[item.status] || "icon-question"],
        });
      },
      didConfirmSelection: (item) => {
        this.selectList.hide();
        this.copyDetail(item);
      },
      didCancelSelection: () => {
        this.selectList.hide();
      },
    });
  }

  buildItems() {
    return this.getEntries().map((entry) => ({
      ...entry,
      label: entry.detail ? `${entry.title} - ${entry.detail}` : entry.title,
    }));
  }

  update() {
    this.selectList.update({ items: this.buildItems() });
  }

  copyDetail(item) {
    if (!item || !item.detail) return;
    atom.clipboard.write(item.detail);
    logger.debug("Copied background entry detail", { detail: item.detail });
    atom.notifications.addInfo(`Copied ${item.detail}`);
  }

  show() {
    this.selectList.show();
  }

  destroy() {
    this.selectList.destroy();
  }
}

module.exports = BackgroundList;
