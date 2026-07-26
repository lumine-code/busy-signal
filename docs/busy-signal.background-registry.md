# busy-signal.background-registry

Registers long-running background work — an indexer, a language server starting, a watch build — as an entry the user can look at rather than a spinner that flashes past.

|             |                                                                |
| ----------- | -------------------------------------------------------------- |
| Version     | `1.0.0`                                                        |
| Provided by | `provideBusySignalBackgroundRegistry()` returning the registry |
| Consumed by | `consumeBusySignalBackgroundRegistry(registry)`                |
| Owner       | [`busy-signal`](https://github.com/lumine-code/busy-signal)    |

The difference from [`busy-signal.registry`](busy-signal.registry.md) is lifetime and identity. Transient messages are keyed by title and kept in a short history; background entries are keyed by an id you choose, carry a status and a detail line, and live until you remove them.

## Registration

In your `package.json`:

```json
{
  "consumedServices": {
    "busy-signal.background-registry": {
      "versions": { "^1.0.0": "consumeBusySignalBackgroundRegistry" }
    }
  }
}
```

## Contract

```ts
type BackgroundRegistry = {
  create(): BackgroundProvider;
};

type BackgroundProvider = {
  set(id: string, entry: Entry): void;
  remove(id: string): void;
  clear(): void;
  dispose(): void;
};

type Entry = {
  title?: string;
  detail?: string;
  status?: string;
};
```

| Member           | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `create()`       | A provider of your own. Call once per package.                         |
| `set(id, entry)` | Adds or updates the entry under `id`. `id` must be a non-empty string. |
| `remove(id)`     | Removes it.                                                            |
| `clear()`        | Removes every entry from this provider.                                |
| `dispose()`      | Clears and unregisters the provider.                                   |

The entry fields are all optional: `title` falls back to the `id`, `detail` to `null`, and `status` is normalized to a known value.

## Minimal example

```js
const { Disposable } = require("atom");

module.exports = {
  consumeBusySignalBackgroundRegistry(registry) {
    this.background = registry.create();
    return new Disposable(() => {
      this.background.dispose();
      this.background = null;
    });
  },

  onServerStateChange(server) {
    this.background.set(server.id, {
      title: server.displayName,
      detail: server.rootPath,
      status: server.state,
    });
  },
};
```

## Behavior

`set` is an **upsert keyed by your id**, and that is the whole point: calling it again with the same id updates the entry in place. The original start time is kept across updates and the insertion order is preserved, so a status transition never reorders the list under the user's eyes.

A `set` with an id that is not a non-empty string is **ignored with a console warning** rather than throwing, so a bad id fails silently — pass a stable identifier you control.

There is no history. An entry exists until you remove it, clear the provider, or dispose it; nothing expires on its own. Work that finishes must be removed explicitly.

Because entries persist, this is the wrong service for anything that completes in under a second — the user sees a row appear and vanish. Use the reporter for that.

## Teardown

Call `dispose()` on your provider. It clears its entries and unregisters it. An entry left behind after your package deactivates stays on screen with nothing able to remove it.

## Versioning

`1.0.0` provided, `^1.0.0` consumed. A change that breaks this shape gets a new service name rather than a new major version, and both sides move in the same release.
