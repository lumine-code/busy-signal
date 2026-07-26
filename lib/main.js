const { CompositeDisposable } = require("atom");
const { SignalElement } = require("./element");
const { BackgroundElement } = require("./background-element");
const Registry = require("./registry");
const BackgroundRegistry = require("./background-registry");
const { ReporterProvider } = require("./reporter-provider");
const logger = require("./logger");

class BusySignal {
  constructor() {
    logger.debug("Creating BusySignal instance");
    this.element = new SignalElement();
    this.backgroundElement = new BackgroundElement();
    this.tileElement = document.createElement("div");
    this.tileElement.classList.add("busy-signal-tile", "inline-block");
    this.tileElement.append(this.element, this.backgroundElement);

    this.registry = new Registry();
    this.backgroundRegistry = new BackgroundRegistry();
    this.reporterProvider = new ReporterProvider(() => this.registry.create());
    this.backgroundList = null;
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(this.element);
    this.subscriptions.add(this.backgroundElement);
    this.subscriptions.add(this.registry);
    this.subscriptions.add(this.backgroundRegistry);

    this.registry.onDidUpdate(() => {
      const activeTiles = this.registry.getTilesActive();
      const oldTiles = this.registry.getTilesOld();
      logger.debug("Updating status element", {
        activeCount: activeTiles.length,
        historyCount: oldTiles.length,
      });
      this.element.update(activeTiles, oldTiles);
    });

    this.backgroundRegistry.onDidUpdate(() => {
      const entries = this.backgroundRegistry.getEntries();
      logger.debug("Updating background element", { entryCount: entries.length });
      this.backgroundElement.update(entries);
      if (this.backgroundList) {
        this.backgroundList.update();
      }
    });

    this.backgroundElement.setClickHandler(() => this.showBackgroundList());
    this.subscriptions.add(
      atom.config.observe("busy-signal.showBackground", (value) => {
        this.backgroundElement.setEnabled(value);
      }),
    );
    this.subscriptions.add({
      dispose: () => {
        if (this.backgroundList) {
          this.backgroundList.destroy();
          this.backgroundList = null;
        }
      },
    });
  }
  // The select list drags in the etch based view layer, so it is only built
  // once the user actually asks for the background details.
  showBackgroundList() {
    if (!this.backgroundList) {
      const BackgroundList = require("./background-list");
      this.backgroundList = new BackgroundList(() => this.backgroundRegistry.getEntries());
    }
    logger.debug("Showing background list");
    this.backgroundList.show();
  }
  attach(statusBar) {
    logger.debug("Attaching status-bar tile");
    // Activity band, see the priority convention in the status-bar package README.
    const tile = statusBar.addRightTile({ item: this.tileElement, priority: 610 });
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
