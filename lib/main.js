const { CompositeDisposable } = require("atom");
const { SignalElement } = require("./element");
const Registry = require("./registry");
const { AtomIdeProvider } = require("./atom-ide-provider");
const logger = require("./logger");

class BusySignal {
  constructor() {
    logger.debug("Creating BusySignal instance");
    this.element = new SignalElement();
    this.registry = new Registry();
    this.atomIdeProvider = new AtomIdeProvider(() => this.registry.create());
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(this.element);
    this.subscriptions.add(this.registry);

    this.registry.onDidUpdate(() => {
      const activeTiles = this.registry.getTilesActive();
      const oldTiles = this.registry.getTilesOld();
      logger.debug("Updating status element", {
        activeCount: activeTiles.length,
        historyCount: oldTiles.length,
      });
      this.element.update(activeTiles, oldTiles);
    });
  }
  attach(statusBar) {
    logger.debug("Attaching status-bar tile");
    // Activity band, see the priority convention in the status-bar package README.
    const tile = statusBar.addRightTile({ item: this.element, priority: 610 });
    this.subscriptions.add({
      dispose() {
        logger.debug("Destroying status-bar tile");
        tile.destroy();
      },
    });
  }
  dispose() {
    logger.debug("Disposing BusySignal instance");
    this.subscriptions.dispose();
  }
}

module.exports = BusySignal;
