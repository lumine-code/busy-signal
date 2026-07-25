# busy-signal

Show a busy signal in the status bar.

A base package that provides an easy-to-use API for other packages to signal they are performing a task.

## Features

- **Animated dot indicator**: a colored dot in the status bar pulses orange while busy and turns green when idle.
- **Minimum display duration**: the busy state is shown for at least 1 second to avoid flickering on fast operations.
- **Hover tooltip**: shows the currently running tasks and a history of recently completed ones with their durations.
- **Two service APIs**: provides both `atom-ide-busy-signal` (recommended, async-friendly) and `busy-signal` (lower-level, multi-message) service contracts.

## Installation

To install `busy-signal` search for _busy-signal_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/busy-signal`.

## Usage

Two service APIs are available. Use `atom-ide-busy-signal` for new packages: async lifecycle is handled automatically and each message is independently disposable. Use `busy-signal` when you need multiple concurrent messages from a single provider or fine-grained `add`/`remove`/`clear` control, or for compatibility with older packages.

### The `atom-ide-busy-signal` service

High-level API that manages busy messages tied to async operations.

In your `package.json`:

```json
{
  "consumedServices": {
    "atom-ide-busy-signal": {
      "versions": {
        "^1.0.0": "consumeBusySignal"
      }
    }
  }
}
```

In your main module:

```javascript
module.exports = {
  async consumeBusySignal(api) {
    // Automatically shown while the promise is pending:
    const result = await api.reportBusyWhile("Downloading data...", () => fetch("https://..."));

    // Or manage the message manually:
    const message = api.reportBusy("Formatting...");
    await format();
    message.setTitle("Writing to disk...");
    await writeToDisk();
    message.dispose();
  },
};
```

API methods:

| Method                       | Returns       | Description                                                     |
| ---------------------------- | ------------- | --------------------------------------------------------------- |
| `reportBusy(title)`          | `BusyMessage` | Show a busy message, returned handle must be disposed when done |
| `reportBusyWhile(title, fn)` | `Promise`     | Show a busy message for the duration of the async `fn`          |

BusyMessage methods:

| Method            | Description             |
| ----------------- | ----------------------- |
| `setTitle(title)` | Update the message text |
| `dispose()`       | Remove the message      |

### The `busy-signal` service

Low-level API that allows adding and removing busy messages via a `Provider` instance.

In your `package.json`:

```json
{
  "consumedServices": {
    "busy-signal": {
      "versions": {
        "^1.0.0": "consumeSignal"
      }
    }
  }
}
```

In your main module:

```javascript
const { CompositeDisposable } = require("atom");

module.exports = {
  activate() {
    this.subscriptions = new CompositeDisposable();
  },
  consumeSignal(registry) {
    const provider = registry.create();
    this.subscriptions.add(provider);
    provider.add("Building project");
    // ... later:
    provider.remove("Building project");
  },
  deactivate() {
    this.subscriptions.dispose();
  },
};
```

Provider methods:

| Method          | Description                                  |
| --------------- | -------------------------------------------- |
| `add(title)`    | Show a busy message with the given title     |
| `remove(title)` | Remove a previously added message            |
| `clear()`       | Remove all messages from this provider       |
| `dispose()`     | Remove all messages and dispose the provider |

## Customization

The style can be adjusted according to user preferences in the `styles.less` file, e.g. change the dot color while busy:

```less
.busy-signal.busy::before {
  background-color: var(--text-color-error);
}
```

## Services

- **busy-signal** (`1.0.0`): provided to let other packages show busy messages through a low-level provider registry with `add`/`remove`/`clear` control.
- **atom-ide-busy-signal** (`1.0.0`): provided to let other packages report busy states with an async-friendly `reportBusy`/`reportBusyWhile` API.
- **status-bar** (`^1.0.0`): consumed to place the busy indicator tile in the status bar.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
