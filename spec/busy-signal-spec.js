describe("busy-signal services", () => {
  it("provides no service name that nests under another one", () => {
    const { providedServices } = require("../package.json");
    // The service hub stores a service named "x.y" at the key path ["x"]["y"],
    // so it is also handed to consumers asking for "x". Providing both names
    // gives those consumers the wrong value depending on registration order.
    const names = Object.keys(providedServices);
    for (const name of names) {
      const parent = name.split(".")[0];
      if (parent === name) continue;
      expect(names).not.toContain(parent);
    }
  });
});

describe("busy-signal", () => {
  let workspaceElement, container, mainModule, element, backgroundElement;

  beforeEach(async () => {
    workspaceElement = atom.views.getView(atom.workspace);
    jasmine.attachToDOM(workspaceElement);

    const pack = await atom.packages.activatePackage("busy-signal");
    mainModule = pack.mainModule;

    container = document.createElement("div");
    workspaceElement.appendChild(container);
    mainModule.consumeStatusBar({
      addRightTile({ item }) {
        container.appendChild(item);
        return {
          destroy() {
            item.remove();
          },
        };
      },
    });
    element = mainModule.instance.element;
    backgroundElement = mainModule.instance.backgroundElement;

    // Settle the initial minimum-display timer so the dot starts idle.
    advanceClock(2000);
  });

  describe("activation", () => {
    it("activates and attaches the signal element to the status bar", () => {
      expect(atom.packages.isPackageActive("busy-signal")).toBe(true);
      expect(container.contains(element)).toBe(true);
      expect(element.tagName.toLowerCase()).toBe("busy-signal");
      expect(element.classList.contains("busy-signal")).toBe(true);
      expect(element.classList.contains("idle")).toBe(true);
      expect(element.tooltipContent.textContent).toBe("Idle");
    });

    it("puts both zones into the same status-bar tile", () => {
      const tile = mainModule.instance.tileElement;
      expect(container.contains(tile)).toBe(true);
      expect(tile.classList.contains("busy-signal-tile")).toBe(true);
      expect(element.parentElement).toBe(tile);
      expect(backgroundElement.parentElement).toBe(tile);
      expect(backgroundElement.tagName.toLowerCase()).toBe("busy-signal-background");
      expect(backgroundElement.classList.contains("busy-signal-background")).toBe(true);
    });

    it("hides the background zone while there are no background entries", () => {
      expect(backgroundElement.hidden).toBe(true);
      expect(getComputedStyle(backgroundElement).display).toBe("none");
    });

    it("removes the status-bar tile on deactivation", async () => {
      await atom.packages.deactivatePackage("busy-signal");
      expect(container.contains(element)).toBe(false);
    });
  });

  describe("busy-signal service", () => {
    let registry;

    beforeEach(() => {
      registry = mainModule.provideBusySignalRegistry();
    });

    it("provides the provider registry", () => {
      expect(registry).toBe(mainModule.instance.registry);
      expect(typeof registry.create).toBe("function");
    });

    it("reflects added and removed busy states in the status bar", () => {
      const provider = registry.create();

      provider.add("Building project");
      expect(element.classList.contains("busy")).toBe(true);
      expect(element.classList.contains("idle")).toBe(false);
      expect(element.tooltipContent.textContent).toContain("Building project");

      provider.remove("Building project");
      advanceClock(2000);
      expect(element.classList.contains("idle")).toBe(true);
      expect(element.classList.contains("busy")).toBe(false);
      expect(element.tooltipContent.textContent).toContain("History:");
      expect(element.tooltipContent.textContent).toContain("Building project");
    });

    it("keeps the busy dot visible for at least one second", () => {
      const provider = registry.create();
      provider.add("Quick task");
      provider.remove("Quick task");

      // Removed immediately, but the dot must stay busy for a minimum duration.
      expect(element.classList.contains("busy")).toBe(true);
      advanceClock(500);
      expect(element.classList.contains("busy")).toBe(true);
      advanceClock(2000);
      expect(element.classList.contains("idle")).toBe(true);
    });

    it("clears all messages of a provider", () => {
      const provider = registry.create();
      provider.add("Task one");
      provider.add("Task two");
      expect(element.tooltipContent.textContent).toContain("Task one");
      expect(element.tooltipContent.textContent).toContain("Task two");

      provider.clear();
      advanceClock(2000);
      expect(element.classList.contains("idle")).toBe(true);
      expect(element.tooltipContent.textContent).toContain("History:");
    });

    it("removes all messages when a provider is disposed", () => {
      const provider = registry.create();
      provider.add("Doomed task");
      provider.dispose();
      advanceClock(2000);
      expect(element.classList.contains("idle")).toBe(true);
    });
  });

  describe("busy-signal.reporter service", () => {
    let api;

    beforeEach(() => {
      api = mainModule.provideBusySignalReporter();
    });

    it("provides the reportBusy and reportBusyWhile API", () => {
      expect(typeof api.reportBusy).toBe("function");
      expect(typeof api.reportBusyWhile).toBe("function");
      expect(typeof api.dispose).toBe("function");
    });

    it("shows a busy message until the handle is disposed", () => {
      const message = api.reportBusy("Formatting...");
      expect(element.classList.contains("busy")).toBe(true);
      expect(element.tooltipContent.textContent).toContain("Formatting...");

      message.setTitle("Writing to disk...");
      expect(element.tooltipContent.textContent).toContain("Writing to disk...");
      expect(element.tooltipContent.textContent).not.toContain("Formatting...");

      message.dispose();
      advanceClock(2000);
      expect(element.classList.contains("idle")).toBe(true);
    });

    it("shows a busy message for the duration of an async function", async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const pending = api.reportBusyWhile("Downloading...", () => promise);
      expect(element.classList.contains("busy")).toBe(true);
      expect(element.tooltipContent.textContent).toContain("Downloading...");

      resolvePromise(42);
      const result = await pending;
      expect(result).toBe(42);

      advanceClock(2000);
      expect(element.classList.contains("idle")).toBe(true);
      expect(element.tooltipContent.textContent).toContain("History:");
    });
  });

  describe("background-signal service", () => {
    const PYRIGHT = "ide-client:pyright:/home/me/proj";
    let registry, background;

    beforeEach(() => {
      registry = mainModule.provideBusySignalBackgroundRegistry();
      background = registry.create();
    });

    it("provides the background provider registry", () => {
      expect(registry).toBe(mainModule.instance.backgroundRegistry);
      expect(typeof registry.create).toBe("function");
      expect(typeof background.set).toBe("function");
      expect(typeof background.remove).toBe("function");
      expect(typeof background.clear).toBe("function");
      expect(typeof background.dispose).toBe("function");
    });

    it("shows an entry in the background zone", () => {
      background.set(PYRIGHT, { title: "Pyright", detail: "/home/me/proj", status: "running" });

      expect(backgroundElement.hidden).toBe(false);
      // `inline-flex` is blockified because the zone is a flex item of the tile.
      expect(getComputedStyle(backgroundElement).display).toBe("flex");
      expect(backgroundElement.count.textContent).toBe("1");
      expect(backgroundElement.failed.hidden).toBe(true);
      expect(backgroundElement.tooltipContent.textContent).toContain("Pyright (running)");
      expect(backgroundElement.tooltipContent.textContent).toContain("/home/me/proj");
    });

    it("leaves the transient zone untouched", () => {
      background.set(PYRIGHT, { title: "Pyright" });

      advanceClock(2000);
      expect(element.classList.contains("idle")).toBe(true);
      expect(element.tooltipContent.textContent).toBe("Idle");
    });

    it("falls back to the id as title and to the running status", () => {
      background.set(PYRIGHT, {});

      expect(backgroundElement.count.textContent).toBe("1");
      expect(backgroundElement.tooltipContent.textContent).toContain(`${PYRIGHT} (running)`);
      expect(registry.getEntries()).toEqual([
        { id: PYRIGHT, title: PYRIGHT, detail: null, status: "running" },
      ]);
    });

    it("falls back to the running status for an unknown one", () => {
      background.set(PYRIGHT, { title: "Pyright", status: "bogus" });

      expect(registry.getEntries()[0].status).toBe("running");
    });

    it("ignores an entry without a usable id", () => {
      background.set("", { title: "Nameless" });
      background.set(null, { title: "Nameless" });

      expect(registry.getEntries().length).toBe(0);
      expect(backgroundElement.hidden).toBe(true);
    });

    it("updates an entry in place when the same id is set again", () => {
      background.set(PYRIGHT, { title: "Pyright", status: "starting" });
      expect(backgroundElement.classList.contains("has-starting")).toBe(true);

      background.set(PYRIGHT, { title: "Pyright", status: "running" });
      expect(registry.getEntries().length).toBe(1);
      expect(backgroundElement.count.textContent).toBe("1");
      expect(backgroundElement.classList.contains("has-starting")).toBe(false);
      expect(backgroundElement.tooltipContent.textContent).toContain("Pyright (running)");
    });

    it("marks failed entries", () => {
      background.set(PYRIGHT, { title: "Pyright", status: "running" });
      background.set("ide-client:ruff:/home/me/proj", { title: "Ruff", status: "failed" });

      expect(backgroundElement.count.textContent).toBe("2");
      expect(backgroundElement.classList.contains("has-failed")).toBe(true);
      expect(backgroundElement.failed.hidden).toBe(false);
      expect(backgroundElement.failed.textContent).toBe("1");

      background.set("ide-client:ruff:/home/me/proj", { title: "Ruff", status: "running" });
      expect(backgroundElement.classList.contains("has-failed")).toBe(false);
      expect(backgroundElement.failed.hidden).toBe(true);
    });

    it("keeps the entry order stable across status transitions", () => {
      background.set("a", { title: "A", status: "starting" });
      background.set("b", { title: "B", status: "starting" });
      background.set("a", { title: "A", status: "running" });

      expect(registry.getEntries().map((entry) => entry.title)).toEqual(["A", "B"]);
    });

    it("pools the entries of every provider", () => {
      const other = registry.create();
      background.set(PYRIGHT, { title: "Pyright" });
      other.set(PYRIGHT, { title: "Pyright in another window root" });

      expect(backgroundElement.count.textContent).toBe("2");

      other.dispose();
      expect(backgroundElement.count.textContent).toBe("1");
    });

    it("removes an entry by id and hides the zone once empty", () => {
      background.set(PYRIGHT, { title: "Pyright" });
      background.remove("ide-client:unknown");
      expect(backgroundElement.hidden).toBe(false);

      background.remove(PYRIGHT);
      expect(backgroundElement.hidden).toBe(true);
      expect(registry.getEntries().length).toBe(0);
    });

    it("clears all entries of a provider", () => {
      const other = registry.create();
      background.set("a", { title: "A" });
      background.set("b", { title: "B" });
      other.set("c", { title: "C" });

      background.clear();
      expect(backgroundElement.hidden).toBe(false);
      expect(registry.getEntries().map((entry) => entry.title)).toEqual(["C"]);
    });

    it("removes the entries of a disposed provider", () => {
      background.set(PYRIGHT, { title: "Pyright" });
      background.dispose();

      expect(backgroundElement.hidden).toBe(true);
      expect(registry.getEntries().length).toBe(0);
    });
  });

  describe("the background zone", () => {
    let background;

    beforeEach(() => {
      background = mainModule.provideBusySignalBackgroundRegistry().create();
      background.set("ide-client:pyright:/home/me/proj", {
        title: "Pyright",
        detail: "/home/me/proj",
        status: "failed",
      });
    });

    it("stays hidden while the setting is off", () => {
      atom.config.set("busy-signal.showBackground", false);
      expect(backgroundElement.hidden).toBe(true);

      background.set("ide-client:ruff:/home/me/proj", { title: "Ruff" });
      expect(backgroundElement.hidden).toBe(true);

      atom.config.set("busy-signal.showBackground", true);
      expect(backgroundElement.hidden).toBe(false);
      expect(backgroundElement.count.textContent).toBe("2");
    });

    it("opens the background list on click", () => {
      spyOn(mainModule.instance, "showBackgroundList");
      backgroundElement.click();
      expect(mainModule.instance.showBackgroundList).toHaveBeenCalled();
    });

    it("lists the entries with their detail and status", () => {
      mainModule.instance.showBackgroundList();
      const list = mainModule.instance.backgroundList;

      expect(list.selectList.isVisible()).toBe(true);
      expect(list.selectList.items).toEqual([
        {
          id: "ide-client:pyright:/home/me/proj",
          title: "Pyright",
          detail: "/home/me/proj",
          status: "failed",
          label: "Pyright - /home/me/proj",
        },
      ]);

      const [item] = list.selectList.items;
      const view = list.selectList.props.elementForItem(item, {
        filterKey: item.label,
        matchIndices: null,
      });
      expect(view.querySelector(".primary-line").textContent).toBe("Pyright - /home/me/proj");
      expect(view.querySelector(".primary-line").classList.contains("icon-alert")).toBe(true);

      const status = view.querySelector(".busy-signal-background-status");
      expect(status.textContent).toBe("failed");
      expect(status.classList.contains("status-failed")).toBe(true);

      list.selectList.hide();
    });

    it("keeps an open list in sync with the registry", () => {
      mainModule.instance.showBackgroundList();
      const list = mainModule.instance.backgroundList;
      expect(list.selectList.items.length).toBe(1);

      background.set("ide-client:ruff:/home/me/proj", { title: "Ruff", status: "running" });
      expect(list.selectList.items.length).toBe(2);

      background.remove("ide-client:ruff:/home/me/proj");
      expect(list.selectList.items.length).toBe(1);

      list.selectList.hide();
    });

    it("copies the detail of the confirmed entry", () => {
      mainModule.instance.showBackgroundList();
      const list = mainModule.instance.backgroundList;
      list.selectList.confirmSelection();

      expect(list.selectList.isVisible()).toBe(false);
      expect(atom.clipboard.read()).toBe("/home/me/proj");
    });
  });
});
