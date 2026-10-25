// Preload entry. Same split as main.cjs: source apppreload.cjs in development, bytecode apppreload.jsc in a
// packaged build. The preload cannot ask app.isPackaged, so the main process passes --pr-packaged to packaged
// windows (webPreferences.additionalArguments); guessing from the path (app.asar) proved unreliable.
const path = require("path");

if (!process.argv.includes("--pr-packaged")) {
  require("./apppreload.cjs");
} else {
  require("bytenode");
  require(path.join(__dirname, "apppreload.jsc"));
}
