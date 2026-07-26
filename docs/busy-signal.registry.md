# busy-signal.registry

The low-level busy indicator: create a provider, then add, rename, remove, and clear titles on it directly.

|             |                                                             |
| ----------- | ----------------------------------------------------------- |
| Version     | `1.0.0`                                                     |
| Provided by | `provideBusySignalRegistry()` returning the registry        |
| Consumed by | `consumeBusySignalRegistry(registry)`                       |
| Owner       | [`busy-signal`](https://github.com/lumine-code/busy-signal) |

Use this only when the lifetime of a message does not line up with a promise. When it does — which is most of the time — [`busy-signal.reporter`](busy-signal.reporter.md) is built on top of this and clears the message for you even on failure.

## Registration

In your `package.json`:

```json
{
  "consumedServices": {
    "busy-signal.registry": {
      "versions": { "^1.0.0": "consumeBusySignalRegistry" }
    }
  }
}
```

## Contract

```ts
type Registry = {
  create(): Provider;
};

type Provider = {
  add(title: string, options?: object): void;
  remove(title: string): void;
  changeTitle(title: string, oldTitle: string): void;
  clear(): void;
  dispose(): void;
};
```

| Member                         | Description                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `create()`                     | A provider of your own. Call once per package, not once per message.                 |
| `add(title, options)`          | Shows a message. Titles are the identity — adding the same title twice is one entry. |
| `remove(title)`                | Removes it again. Must match the title exactly.                                      |
| `changeTitle(title, oldTitle)` | Renames in place, keeping its position.                                              |
| `clear()`                      | Removes everything this provider added.                                              |
| `dispose()`                    | Clears and unregisters the provider.                                                 |

## Minimal example

```js
const { Disposable } = require("atom");

module.exports = {
  consumeBusySignalRegistry(registry) {
    this.provider = registry.create();
    return new Disposable(() => {
      this.provider.dispose();
      this.provider = null;
    });
  },

  startBuild(name) {
    this.provider.add(`Building ${name}`);
  },

  finishBuild(name) {
    this.provider.remove(`Building ${name}`);
  },
};
```

## Behavior

**Messages are keyed by provider id plus title**, so the title is the handle. Two `add` calls with the same title collapse into one entry, and `remove` needs the exact string back — build titles from a stable template rather than interpolating something that may have changed.

Removed messages move to a short history the indicator shows as recent activity, with their elapsed time. Only `clear()` and `dispose()` drop them silently.

`changeTitle` is not `remove` plus `add`: it keeps the entry's position and its start time, which is what a multi-stage operation wants.

Because nothing clears a message for you, a thrown exception between `add` and `remove` leaves it on screen indefinitely. Wrap in `try`/`finally`, or use the reporter service, which does exactly that.

## Teardown

Call `dispose()` on the provider you created. It clears its messages and unregisters it, so nothing of yours survives. Do not create a provider per message — they accumulate.

## Versioning

`1.0.0` provided, `^1.0.0` consumed. A change that breaks this shape gets a new service name rather than a new major version, and both sides move in the same release.
