# busy-signal

Show a busy signal in the status bar.

A base package that provides an easy-to-use API for other packages to signal they are performing a task.

## Features

- **Animated dot indicator**: a colored dot in the status bar pulses orange while busy and turns green when idle.
- **Minimum display duration**: the busy state is shown for at least 1 second to avoid flickering on fast operations.
- **Hover tooltip**: shows the currently running tasks and a history of recently completed ones with their durations.
- **Background zone**: a separate, animation-free zone counts long-running processes such as language servers, marks the failed ones, and stays hidden while there are none.
- **Background list**: clicking the background zone opens a filterable list of the live processes with their details and statuses.
- **Three service APIs**: provides `busy-signal.reporter` (recommended, async-friendly), `busy-signal.registry` (lower-level, multi-message), and `busy-signal.background-registry` (long-running processes) service contracts.

## Installation

To install `busy-signal` search for _busy-signal_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/busy-signal`.

## Usage

Three service APIs are available. Use `busy-signal.reporter` for new packages: async lifecycle is handled automatically and each message is independently disposable. Use `busy-signal.registry` when you need multiple concurrent messages from a single provider or fine-grained `add`/`remove`/`clear` control, or for compatibility with older packages. Use `busy-signal.background-registry` for processes that stay alive for the whole session, such as one language server per project root: they are shown in their own zone and never spin the busy dot.

### The `busy-signal.reporter` service

High-level API that manages busy messages tied to async operations.

In your `package.json`:

```json
{
  "consumedServices": {
    "busy-signal.reporter": {
      "versions": {
        "^1.0.0": "consumeBusySignalReporter"
      }
    }
  }
}
```

In your main module:

```javascript
module.exports = {
  async consumeBusySignalReporter(api) {
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

### The `busy-signal.registry` service

Low-level API that allows adding and removing busy messages via a `Provider` instance.

In your `package.json`:

```json
{
  "consumedServices": {
    "busy-signal.registry": {
      "versions": {
        "^1.0.0": "consumeBusySignalRegistry"
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
  consumeBusySignalRegistry(registry) {
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

### The `busy-signal.background-registry` service

API for processes that are alive for a long time and belong in the background zone instead of the busy dot.

In your `package.json`:

```json
{
  "consumedServices": {
    "busy-signal.background-registry": {
      "versions": {
        "^1.0.0": "consumeBusySignalBackgroundRegistry"
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
  consumeBusySignalBackgroundRegistry(registry) {
    const background = registry.create();
    this.subscriptions.add(background);
    background.set("ide-client:pyright:/home/me/proj", {
      title: "Pyright",
      detail: "/home/me/proj",
      status: "starting",
    });
    // ... the same id updates the entry in place:
    background.set("ide-client:pyright:/home/me/proj", {
      title: "Pyright",
      detail: "/home/me/proj",
      status: "running",
    });
    // ... later:
    background.remove("ide-client:pyright:/home/me/proj");
  },
  deactivate() {
    this.subscriptions.dispose();
  },
};
```

Provider methods:

| Method           | Description                                       |
| ---------------- | ------------------------------------------------- |
| `set(id, entry)` | Add the entry, or update the one with the same id |
| `remove(id)`     | Remove the entry with the given id                |
| `clear()`        | Remove all entries of this provider               |
| `dispose()`      | Remove all entries and dispose the provider       |

Entry fields:

| Field    | Description                                                              |
| -------- | ------------------------------------------------------------------------ |
| `title`  | Short label shown in the zone, defaults to the id                        |
| `detail` | Optional secondary text, such as the project root                        |
| `status` | One of `starting`, `running`, `failed`, `stopped`, defaults to `running` |

## Customization

The style can be adjusted according to user preferences in the `styles.less` file, e.g. change the dot color while busy and the background zone color:

```less
.busy-signal.busy::before {
  background-color: var(--text-color-error);
}

.busy-signal-background {
  color: var(--text-color-info);
}
```

## Services

- **busy-signal.registry** (`1.0.0`): provided to let other packages show busy messages through a low-level provider registry with `add`/`remove`/`clear` control.
- **busy-signal.background-registry** (`1.0.0`): provided to let other packages register long-running background processes through a provider registry with `set`/`remove`/`clear` control.
- **busy-signal.reporter** (`1.0.0`): provided to let other packages report busy states with an async-friendly `reportBusy`/`reportBusyWhile` API.
- **status-bar** (`^1.0.0`): consumed to place the busy indicator tile in the status bar.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
