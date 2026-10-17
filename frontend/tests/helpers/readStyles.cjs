const fs = require("node:fs");
const path = require("node:path");

/**
 * Resolves the CSS @import chain starting from a root CSS file (defaults to src/style.css),
 * concatenating all imported partials in their declared order.
 *
 * @param {string} [entryFile] - Path to the root CSS file
 * @returns {string} Fully resolved and concatenated CSS text
 */
function readStyles(entryFile) {
  const rootPath = entryFile || path.resolve(__dirname, "../../src/style.css");
  return resolveImports(rootPath, new Set());
}

function resolveImports(filePath, visited) {
  const resolvedPath = path.resolve(filePath);
  if (visited.has(resolvedPath)) {
    return "";
  }
  visited.add(resolvedPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CSS import file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, "utf8");
  const fileDir = path.dirname(resolvedPath);

  // Match @import statements: @import "./path.css"; or @import url("./path.css");
  const importRegex = /@import\s+(?:url\(['"]?|['"])([^'")]+)['"]?\)?;?/g;

  let hasImports = false;
  let resolvedContent = content.replace(importRegex, (match, importTarget) => {
    hasImports = true;
    const targetPath = path.resolve(fileDir, importTarget);
    return resolveImports(targetPath, visited);
  });

  return resolvedContent;
}

module.exports = { readStyles };
