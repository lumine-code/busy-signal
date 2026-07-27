# busy-signal

Show a busy signal in the status bar.

A base package that provides an easy-to-use API for other packages to signal they are performing a task.

## Features

- **Animated dot indicator**: a colored dot in the status bar pulses orange while busy and turns green when idle.
- **Minimum display duration**: the busy state is shown for at least 1 second to avoid flickering on fast operations.
- **Hover tooltip**: shows the currently running tasks and a history of recently completed ones with their durations.
- **Clickable messages**: a reported message can carry an `onDidClick` handler, so its tooltip entry acts as a button.

## Installation

To install `busy-signal` search for _busy-signal_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/busy-signal`.

## Usage

Other packages report their work through the `busy-signal` service. `create()` hands out a provider
for work that starts and finishes; the busy dot spins while any provider has a live message.

```js
consumeBusySignal(busySignal) {
  this.busySignal = busySignal;
  return new Disposable(() => (this.busySignal = null));
},

async scan(root) {
  const provider = this.busySignal?.create();
  provider?.add(`Scanning ${root}`);
  try {
    return await doScan(root);
  } finally {
    provider?.dispose();
  }
}
```

The full contract — the cardinality rule and the `changeTitle` argument order — is in
[docs/busy-signal.md](docs/busy-signal.md).

## Customization

The style can be adjusted according to user preferences in the `styles.less` file, e.g. change the dot color while busy:

```less
.busy-signal.busy::before {
  background-color: var(--text-color-error);
}
```

## Services

- **[busy-signal](docs/busy-signal.md)** (`1.0.0`): provided to let other packages report work in progress on the busy indicator.
- **status-bar** (`^1.0.0`): consumed to place the busy indicator tile in the status bar.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
