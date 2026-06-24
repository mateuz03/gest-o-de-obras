const Module = require("node:module");

const originalLoad = Module._load;

Module._load = function patchedCanvasLoad(request, parent, isMain) {
  if (request === "canvas") {
    return {};
  }

  return originalLoad.call(this, request, parent, isMain);
};
