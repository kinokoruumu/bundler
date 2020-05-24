const { promises, readFileSync } = require("fs");
const { dirname, basename, join } = require("path");
const parser = require("@babel/parser");
const { default: traverse } = require("@babel/traverse");

function mainTemplate(entryName, modules) {
  return `((modules) => {
    const installedModules = {};

    function require(moduleName) {
      if (installedModules[moduleName]) {
        return installedModules[moduleName].exports;
      }

      installedModules[moduleName] = { exports: {} };
      const module = installedModules[moduleName];
      modules[moduleName](module, exports, require);

      return module.exports;
    }
    
    return require('${entryName}');
  })({
    ${Object.entries(modules)
      .map(([fileName, code]) => {
        return `'${fileName}': ${moduleTemplate(code)}`;
      })
      .join(",")}
  })`;
}

function moduleTemplate(code) {
  return `function(module, exports, require) {
    ${code}
  }`;
}

async function main({ entry, output }) {
  const data = await promises.readFile(entry, "utf-8");

  // directoryまでの絶対パス
  const basePath = dirname(entry);

  // ファイルの名前(index.js)
  const entryName = basename(entry);

  const modules = {};
  modules[entryName] = data;

  walk(data);

  function walk(code) {
    const ast = parser.parse(code);
    traverse(ast, {
      CallExpression({ node }) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require"
        ) {
          // requireは一つしか指定しないので[0]を使う
          const key = node.arguments[0].value;

          // 本来はkeyにif分が必要 (/ならindex.jsとか)
          const c = readFileSync(join(basePath, `${key}.js`), "utf-8");
          modules[key] = c;

          // もう一度再帰させる
          walk(c);
        }
      },
    });
  }

  // TODO: outputにfs.writeする
  console.log(mainTemplate(entryName, modules));
}

module.exports = {
  main,
};
