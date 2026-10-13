const { CompositeDisposable } = require("lumine");
const BusySignal = require("./main");
const logger = require("./logger");

module.exports = {
  activate() {
    logger.debug("Activating package");
    this.instance = new BusySignal();
    const instance = this.instance;
    this.actionSubscriptions = new CompositeDisposable(
      lumine.commands.add("lumine-workspace", {
        "busy-signal:run-task-action": {
          description: "Run the action offered by an active background task.",
          hiddenInCommandPalette: true,
          didDispatch: (event) => {
            if (!instance.disposed)
              instance.runTaskAction(event.detail?.key, event.target, event.detail?.task);
          },
        },
      }),
      lumine.contextMenu.add({
        "busy-signal": [
          { type: "separator" },
          {
            label: "Active Tasks",
            shouldDisplay: () => !instance.disposed && instance.taskActions().length > 0,
            created() {
              this.submenu = instance.taskActions().map((task) => ({
                label: task.options.actionLabel || task.title,
                command: "busy-signal:run-task-action",
                commandDetail: { key: task.key, task },
              }));
            },
          },
          { type: "separator" },
        ],
      }),
    );
    this.debugSubscription = lumine.config.observe("busy-signal.debug", (enabled) => {
      if (enabled) logger.debug("Debug logging enabled");
    });
  },
  consumeStatusBar(service) {
    return service.observeWindows((scopedStatusBar, context) =>
      this.consumeWindowStatusBar(scopedStatusBar, context),
    );
  },

  consumeWindowStatusBar(statusBar, _context) {
    logger.debug("Consuming status-bar service");
    return this.instance.attach(statusBar);
  },
  provideBusySignal() {
    logger.debug("Providing busy-signal service");
    const { registry } = this.instance;
    return { create: () => registry.create() };
  },
  deactivate() {
    logger.debug("Deactivating package");
    if (this.debugSubscription) {
      this.debugSubscription.dispose();
      this.debugSubscription = null;
    }
    this.actionSubscriptions?.dispose();
    this.actionSubscriptions = null;
    this.instance.dispose();
  },
};
