describe("busy-signal services", () => {
  it("provides exactly one service, named after the package", () => {
    const { providedServices } = require("../package.json");
    expect(Object.keys(providedServices)).toEqual(["busy-signal"]);
    expect(providedServices["busy-signal"].versions["1.0.0"]).toBe("provideBusySignal");
  });

  it("no longer provides the split or atom-ide names", () => {
    const { providedServices } = require("../package.json");
    // One package, one service. The registry-level names, the background
    // service, the reporter facade, and the atom-ide branding are all gone.
    for (const gone of [
      "busy-signal.registry",
      "busy-signal.background-registry",
      "busy-signal.reporter",
      "background-signal",
      "atom-ide-busy-signal",
    ]) {
      expect(providedServices[gone]).toBeUndefined();
    }
  });
});

describe("busy-signal", () => {
  let workspaceElement, container, mainModule, element;

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

    // Settle the initial minimum-display timer so the dot starts idle.
    advanceClock(2000);
  });

  describe("activation", () => {
    it("activates and attaches the signal element to the status bar", () => {
      expect(atom.packages.isPackageActive("busy-signal")).toBe(true);
      expect(container.contains(element)).toBe(true);
      expect(element.tagName.toLowerCase()).toBe("busy-signal");
      // The element is the tile item itself, not wrapped: it carries the
      // status-bar layout class on its own.
      expect(element.parentElement).toBe(container);
      expect(element.classList.contains("busy-signal")).toBe(true);
      expect(element.classList.contains("inline-block")).toBe(true);
      expect(element.classList.contains("idle")).toBe(true);
      expect(element.tooltipContent.textContent).toBe("Idle");
    });

    it("removes the status-bar tile on deactivation", async () => {
      await atom.packages.deactivatePackage("busy-signal");
      expect(container.contains(element)).toBe(false);
    });
  });

  describe("busy-signal service", () => {
    let registry;

    beforeEach(() => {
      registry = mainModule.provideBusySignal();
    });

    it("mints providers off the registry", () => {
      expect(typeof registry.create).toBe("function");
      // The long-running half moved to the package that owned the data.
      expect(registry.createBackground).toBeUndefined();
      expect(mainModule.instance.registry.providers.size).toBe(0);
      const provider = registry.create();
      expect(mainModule.instance.registry.providers.has(provider)).toBe(true);
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
});
