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
      expect(element.classList.contains("busy-signal")).toBe(true);
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
      registry = mainModule.providerRegistry();
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

  describe("atom-ide-busy-signal service", () => {
    let api;

    beforeEach(() => {
      api = mainModule.provideBusySignal();
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
});
