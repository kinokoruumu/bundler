const { main } = require("../src");
const { resolve } = require("path");

main({
  entry: resolve(__dirname, "./sample/index.js"),
  output: resolve(__dirname, "./output"),
});
