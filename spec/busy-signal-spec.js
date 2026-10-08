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
  let workspaceElement, container, mainModule, element, statusBarDisposable;

  function attachStatusBar(target = container) {
    return mainModule.consumeStatusBar({
      addRightTile({ item }) {
        target.appendChild(item);
        return { destroy: () => item.remove() };
      },
    });
  }

  beforeEach(async () => {
    workspaceElement = lumine.views.getView(lumine.workspace);
    jasmine.attachToDOM(workspaceElement);

    const pack = await lumine.packages.activatePackage("busy-signal");
    mainModule = pack.mainModule;

    container = document.createElement("div");
    workspaceElement.appendChild(container);
    statusBarDisposable = attachStatusBar();
    element = mainModule.instance.element;

    // Settle the initial minimum-display timer so the dot starts idle.
    advanceClock(2000);
  });

  describe("activation", () => {
    it("activates and attaches the signal element to the status bar", () => {
      expect(lumine.packages.isPackageActive("busy-signal")).toBe(true);
      expect(container.contains(element)).toBe(true);
      expect(element.tagName.toLowerCase()).toBe("busy-signal");
      // The element is the tile item itself, not wrapped. It carries no
      // status-bar class of its own: the bar stamps `.status-bar-item` on
      // whatever it is handed, and the stub above stands in for the bar.
      expect(element.parentElement).toBe(container);
      expect(element.classList.contains("busy-signal")).toBe(true);
      expect(element.classList.contains("inline-block")).toBe(false);
      expect(element.classList.contains("idle")).toBe(true);
      expect(element.tooltipContent.textContent).toBe("Idle");
    });

    it("removes the status-bar tile on deactivation", async () => {
      await lumine.packages.deactivatePackage("busy-signal");
      expect(container.contains(element)).toBe(false);
    });

    it("removes the status-bar tile when the service edge disappears", () => {
      statusBarDisposable.dispose();
      expect(container.contains(element)).toBe(false);
    });

    it("keeps active work and replaces tooltip ownership when the status bar reconnects", () => {
      const provider = mainModule.provideBusySignal().create();
      provider.add("Building project");
      advanceClock(1200);
      const previousTooltip = element.tooltip;
      const disposeTooltip = spyOn(previousTooltip, "dispose").and.callThrough();

      statusBarDisposable.dispose();
      expect(disposeTooltip).toHaveBeenCalledTimes(1);
      expect(element.tooltip).toBeNull();
      statusBarDisposable = attachStatusBar();

      expect(element.tooltip).not.toBe(previousTooltip);
      expect(element.classList.contains("busy")).toBe(true);
      expect(element.tooltipContent.textContent).toContain("Current:");
      expect(element.tooltipContent.textContent).toContain("Building project");
    });

    it("replays history and current messages changed while the tile was detached", () => {
      const provider = mainModule.provideBusySignal().create();
      provider.add("Finished while offline");
      statusBarDisposable.dispose();
      provider.remove("Finished while offline");
      provider.add("Started while offline");

      statusBarDisposable = attachStatusBar();

      expect(element.classList.contains("busy")).toBe(true);
      expect(element.tooltipContent.textContent).toContain("History:");
      expect(element.tooltipContent.textContent).toContain("Finished while offline");
      expect(element.tooltipContent.textContent).toContain("Current:");
      expect(element.tooltipContent.textContent).toContain("Started while offline");
    });

    it("does not let a replaced service edge remove the new tile", () => {
      const replacement = document.createElement("div");
      workspaceElement.appendChild(replacement);
      const nextEdge = attachStatusBar(replacement);
      try {
        statusBarDisposable.dispose();
        expect(replacement.contains(element)).toBe(true);
      } finally {
        nextEdge.dispose();
        replacement.remove();
      }
    });

    it("releases connection resources when its DOM node is moved directly", () => {
      const provider = mainModule.provideBusySignal().create();
      provider.add("Still running");
      const previousTooltip = element.tooltip;
      const disposeTooltip = spyOn(previousTooltip, "dispose").and.callThrough();
      const otherContainer = document.createElement("div");
      workspaceElement.appendChild(otherContainer);
      try {
        otherContainer.appendChild(element);
        expect(disposeTooltip).toHaveBeenCalledTimes(1);
        expect(element.tooltip).not.toBe(previousTooltip);
        expect(element.tooltipContent.textContent).toContain("Still running");
        container.appendChild(element);
        expect(element.tooltipContent.textContent).toContain("Still running");
      } finally {
        otherContainer.remove();
      }
    });

    it("cancels the minimum-display timer when the tile disconnects", () => {
      const provider = mainModule.provideBusySignal().create();
      provider.add("Quick task");
      provider.remove("Quick task");
      expect(element.deactivateTimer).not.toBeNull();
      const updateBusy = spyOn(element, "setBusy").and.callThrough();

      statusBarDisposable.dispose();

      expect(element.deactivateTimer).toBeNull();
      advanceClock(2000);
      expect(updateBusy).not.toHaveBeenCalled();
    });

    it("does not recreate a timer as provider cleanup deactivates the package", async () => {
      const provider = mainModule.provideBusySignal().create();
      provider.add("Canceled by deactivation");
      const updateBusy = spyOn(element, "setBusy").and.callThrough();

      await lumine.packages.deactivatePackage("busy-signal");

      expect(element.deactivateTimer).toBeNull();
      updateBusy.calls.reset();
      advanceClock(2000);
      expect(updateBusy).not.toHaveBeenCalled();
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

    it("ends the minimum busy display at its one-second deadline", () => {
      const provider = registry.create();
      provider.add("Quick task");
      provider.remove("Quick task");

      advanceClock(999);
      expect(element.classList.contains("busy")).toBe(true);
      advanceClock(1);

      expect(element.classList.contains("idle")).toBe(true);
      expect(element.classList.contains("busy")).toBe(false);
      expect(element.deactivateTimer).toBeNull();
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
