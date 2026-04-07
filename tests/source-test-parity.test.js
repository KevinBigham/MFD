import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walkJsFiles(dir) {
  var out = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(function (entry) {
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walkJsFiles(full));
      return;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  });
  return out;
}

describe("source/test parity", function () {
  it("keeps a test file for every src .js basename", function () {
    var root = path.resolve(__dirname, "..");
    var srcRoot = path.join(root, "src");
    var testsRoot = path.join(root, "tests");
    var srcBasenames = new Set(
      walkJsFiles(srcRoot).map(function (f) {
        return path.basename(f, ".js");
      })
    );
    var testBasenames = new Set(
      walkJsFiles(testsRoot)
        .filter(function (f) {
          return f.endsWith(".test.js");
        })
        .map(function (f) {
          return path.basename(f, ".test.js");
        })
    );
    var missing = Array.from(srcBasenames)
      .filter(function (name) {
        return !testBasenames.has(name);
      })
      .sort();
    expect(missing).toEqual([]);
  });
});
