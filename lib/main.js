const { CompositeDisposable, Disposable } = require("lumine");
const { SignalElement } = require("./element");
const Registry = require("./registry");
const logger = require("./logger");

class BusySignal {
  constructor() {
    logger.debug("Creating BusySignal instance");
    this.element = new SignalElement();
    this.registry = new Registry();
    this.subscriptions = new CompositeDisposable();
    this.attachment = null;
    this.disposed = false;

    this.subscriptions.add(this.element);
    this.subscriptions.add(this.registry);

    this.subscriptions.add(
      this.registry.onDidUpdate(() => {
        if (this.disposed) return;
        const activeTiles = this.registry.getTilesActive();
        const oldTiles = this.registry.getTilesOld();
        logger.debug("Updating status element", {
          activeCount: activeTiles.length,
          historyCount: oldTiles.length,
        });
        this.element.update(activeTiles, oldTiles);
      }),
    );
  }
  attach(statusBar) {
    if (this.disposed) return new Disposable();
    // The singleton element can belong to only one status-bar connection.
    // Retire the previous tile before moving it into a replacement provider.
    this.attachment?.dispose();
    logger.debug("Attaching status-bar tile");
    // Activity band, see the priority convention in the status-bar package README.
    const tile = statusBar.addRightTile({ item: this.element, priority: 610 });
    const registration = new Disposable(() => {
      logger.debug("Destroying status-bar tile");
      tile.destroy();
      this.subscriptions.remove(registration);
      if (this.attachment === registration) this.attachment = null;
    });
    this.attachment = registration;
    this.subscriptions.add(registration);
    return registration;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    logger.debug("Disposing BusySignal instance");
    this.subscriptions.dispose();
  }
}

module.exports = BusySignal;
