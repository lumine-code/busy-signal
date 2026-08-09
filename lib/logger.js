const PACKAGE_NAME = "busy-signal";

function isDebugEnabled() {
  if (!global.lumine || !lumine.config) return false;
  return Boolean(lumine.config.get(`${PACKAGE_NAME}.debug`));
}

function write(level, args) {
  if (level === "debug" && !isDebugEnabled()) return;

  const method = level === "debug" ? console.log : console[level] || console.log;
  method.call(console, `[${PACKAGE_NAME}] [${level}]`, ...args);
}

module.exports = {
  debug(...args) {
    write("debug", args);
  },
  info(...args) {
    write("info", args);
  },
  warn(...args) {
    write("warn", args);
  },
  error(...args) {
    write("error", args);
  },
};
