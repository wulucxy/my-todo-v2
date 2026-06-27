import { defineConfig, mergeConfig, loadConfigFromFile } from "vite";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const EDITOR_RUNTIME = "\n(function () {\n  if (typeof window === \"undefined\") return;\n  if (window.__bfEditorInstalled) return;\n  if (window.parent === window) return; // only inside the IDE preview iframe\n  window.__bfEditorInstalled = true;\n\n  var enabled = false;\n  var lastHover = null;\n  var selectedEl = null;\n  var rectRAF = 0;\n\n  function post(msg) { try { window.parent.postMessage(msg, \"*\"); } catch (e) {} }\n  function pick(el) { return el && el.closest ? el.closest(\"[data-bf-loc]\") : null; }\n  function findByLoc(loc) {\n    if (!loc) return null;\n    var all = document.querySelectorAll(\"[data-bf-loc]\");\n    for (var i = 0; i < all.length; i++) {\n      if (all[i].getAttribute(\"data-bf-loc\") === loc) return all[i];\n    }\n    return null;\n  }\n  function rectOf(el) {\n    var r = el.getBoundingClientRect();\n    return { left: r.left, top: r.top, width: r.width, height: r.height };\n  }\n  function computedSubset(el) {\n    var cs = window.getComputedStyle(el);\n    var keys = [\"color\",\"backgroundColor\",\"fontSize\",\"fontWeight\",\"lineHeight\",\n      \"textAlign\",\"paddingTop\",\"paddingRight\",\"paddingBottom\",\"paddingLeft\",\n      \"marginTop\",\"marginRight\",\"marginBottom\",\"marginLeft\",\"borderRadius\",\n      \"display\",\"width\",\"height\"];\n    var out = {};\n    for (var i = 0; i < keys.length; i++) out[keys[i]] = cs[keys[i]];\n    return out;\n  }\n  function describe(el) {\n    return {\n      loc: el.getAttribute(\"data-bf-loc\"),\n      id: el.getAttribute(\"data-bf-id\"),\n      tag: el.tagName.toLowerCase(),\n      className: el.getAttribute(\"class\") || \"\",\n      text: (el.textContent || \"\").slice(0, 200),\n      computed: computedSubset(el),\n      rect: rectOf(el)\n    };\n  }\n\n  function onMove(e) {\n    if (!enabled) return;\n    var el = pick(e.target);\n    if (!el) {\n      if (lastHover) { lastHover = null; post({ type: \"BF_EDITOR_HOVER\", rect: null }); }\n      return;\n    }\n    if (el === lastHover) return;\n    lastHover = el;\n    post({ type: \"BF_EDITOR_HOVER\", rect: rectOf(el), tag: el.tagName.toLowerCase(), loc: el.getAttribute(\"data-bf-loc\") });\n  }\n\n  function onClick(e) {\n    if (!enabled) return;\n    var el = pick(e.target);\n    if (!el) return;\n    e.preventDefault();\n    e.stopPropagation();\n    selectedEl = el;\n    post(Object.assign({ type: \"BF_EDITOR_SELECTED\" }, describe(el)));\n  }\n\n  function setEnabled(on) {\n    enabled = on;\n    if (document.body) document.body.style.cursor = on ? \"crosshair\" : \"\";\n    if (!on) { lastHover = null; selectedEl = null; post({ type: \"BF_EDITOR_HOVER\", rect: null }); }\n  }\n\n  // Keep the parent's overlay aligned with the selected element while the page\n  // scrolls or resizes (rAF-throttled).\n  function postSelectedRect() {\n    if (!enabled || !selectedEl || rectRAF) return;\n    rectRAF = requestAnimationFrame(function () {\n      rectRAF = 0;\n      if (selectedEl && selectedEl.isConnected) {\n        post({ type: \"BF_EDITOR_RECT\", loc: selectedEl.getAttribute(\"data-bf-loc\"), rect: rectOf(selectedEl) });\n      }\n    });\n  }\n\n  // Serialize the *rendered* DOM into a static, self-contained-ish HTML string.\n  // Used by the parent IDE to store a \"last seen\" snapshot of the app that it\n  // can render (blurred) while the dev server is off. Scripts are stripped —\n  // the snapshot must be static; Vite module scripts would point at a dead\n  // origin. <style> tags survive the clone (Vite injects dev CSS inline), and\n  // same-origin <img>s are inlined as data URLs since the origin won't be\n  // reachable when the snapshot is shown.\n  function buildSnapshotHtml() {\n    var clone = document.documentElement.cloneNode(true);\n    var i;\n    var scripts = clone.querySelectorAll(\"script\");\n    for (i = 0; i < scripts.length; i++) {\n      if (scripts[i].parentNode) scripts[i].parentNode.removeChild(scripts[i]);\n    }\n    var stamped = clone.querySelectorAll(\"[data-bf-loc]\");\n    for (i = 0; i < stamped.length; i++) {\n      stamped[i].removeAttribute(\"data-bf-loc\");\n      stamped[i].removeAttribute(\"data-bf-id\");\n    }\n    // Inline same-origin images (best effort, bounded). Live <img> elements and\n    // their clones come back in the same document order, so we can pair them.\n    var liveImgs = document.querySelectorAll(\"img\");\n    var cloneImgs = clone.querySelectorAll(\"img\");\n    var inlined = 0;\n    for (i = 0; i < liveImgs.length && i < cloneImgs.length; i++) {\n      if (inlined >= 30) break;\n      var img = liveImgs[i];\n      if (!img.complete || !img.naturalWidth) continue;\n      var src = img.currentSrc || img.src || \"\";\n      if (src.indexOf(\"data:\") === 0) continue;\n      try {\n        var canvas = document.createElement(\"canvas\");\n        var w = Math.min(img.naturalWidth, 1280);\n        var scale = w / img.naturalWidth;\n        canvas.width = w;\n        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));\n        canvas.getContext(\"2d\").drawImage(img, 0, 0, canvas.width, canvas.height);\n        cloneImgs[i].setAttribute(\"src\", canvas.toDataURL(\"image/jpeg\", 0.8));\n        cloneImgs[i].removeAttribute(\"srcset\");\n        inlined++;\n      } catch (err) { /* cross-origin taint — leave the original src */ }\n    }\n    var head = clone.querySelector(\"head\");\n    if (head) {\n      var base = document.createElement(\"base\");\n      base.setAttribute(\"href\", window.location.origin + \"/\");\n      head.insertBefore(base, head.firstChild);\n    }\n    return \"<!DOCTYPE html>\" + String.fromCharCode(10) + clone.outerHTML;\n  }\n\n  window.addEventListener(\"message\", function (e) {\n    var d = e.data;\n    if (!d || typeof d !== \"object\") return;\n    if (d.type === \"BF_EDITOR_ENABLE\") setEnabled(true);\n    else if (d.type === \"BF_EDITOR_DISABLE\") setEnabled(false);\n    else if (d.type === \"BF_SNAPSHOT_REQUEST\") {\n      var html = null;\n      try { html = buildSnapshotHtml(); } catch (err) {}\n      post({ type: \"BF_SNAPSHOT_RESULT\", id: d.id || null, html: html });\n    }\n    else if (d.type === \"BF_EDITOR_PREVIEW\") {\n      var t = findByLoc(d.loc);\n      if (t) {\n        if (typeof d.className === \"string\") t.setAttribute(\"class\", d.className);\n        if (d.style && typeof d.style === \"object\") {\n          for (var k in d.style) { try { t.style[k] = d.style[k]; } catch (e2) {} }\n        }\n      }\n    } else if (d.type === \"BF_EDITOR_RESELECT\") {\n      var r = findByLoc(d.loc);\n      if (r) { selectedEl = r; post(Object.assign({ type: \"BF_EDITOR_SELECTED\" }, describe(r))); }\n    }\n  });\n\n  document.addEventListener(\"mousemove\", onMove, true);\n  document.addEventListener(\"click\", onClick, true);\n  window.addEventListener(\"scroll\", postSelectedRect, true);\n  window.addEventListener(\"resize\", postSelectedRect, true);\n\n  post({ type: \"BF_EDITOR_READY\" });\n})();\n";

// Reuse the @babel/core that @vitejs/plugin-react depends on (pnpm keeps it
// out of the project root, so a bare require usually misses it).
function loadBabel() {
  try { return require("@babel/core"); } catch (e) {}
  try {
    const pr = require.resolve("@vitejs/plugin-react");
    return createRequire(pr)("@babel/core");
  } catch (e) {}
  try {
    const pr = require.resolve("@vitejs/plugin-react-swc");
    return createRequire(pr)("@babel/core");
  } catch (e) {}
  return null;
}

// First host-element line in a source string (or null). Used to detect the
// line offset between Vite's transform input (which has a prepended HMR/refresh
// preamble) and the pristine on-disk file the write-back reads.
function firstHostLine(babel, src) {
  const t = babel.types;
  let line = null;
  try {
    const ast = babel.parse(src, {
      babelrc: false, configFile: false,
      parserOpts: { plugins: ["jsx", "typescript"] },
    });
    babel.traverse(ast, {
      JSXOpeningElement(p) {
        if (line !== null) return;
        const n = p.node;
        if (t.isJSXIdentifier(n.name) && /^[a-z]/.test(n.name.name) && n.loc) {
          line = n.loc.start.line;
        }
      },
    });
  } catch (e) {}
  return line;
}

function bfStampPlugin(babel, root, originalSrc) {
  const t = babel.types;
  // The pristine on-disk first host line. The difference between the transform
  // input's first host line and this is the preamble offset to subtract, so the
  // stamped line numbers index into the on-disk file (what the API edits).
  const diskFirst = firstHostLine(babel, originalSrc);
  let offset = 0;
  let offsetSet = false;
  return {
    name: "bf-stamp",
    visitor: {
      JSXOpeningElement(p, state) {
        const nameNode = p.node.name;
        if (!t.isJSXIdentifier(nameNode)) return;       // skip member/namespaced
        if (!/^[a-z]/.test(nameNode.name)) return;       // host elements only
        const has = p.node.attributes.some(
          (a) => t.isJSXAttribute(a) && a.name && a.name.name === "data-bf-loc"
        );
        if (has) return;
        const loc = p.node.loc;
        if (!loc) return;
        if (!offsetSet) {
          // First host element visited (document order) lines up with diskFirst.
          if (diskFirst !== null) offset = loc.start.line - diskFirst;
          if (offset < 0) offset = 0;
          offsetSet = true;
        }
        const abs = (state.file && state.file.opts && state.file.opts.filename) || "";
        const rel = path.relative(root, abs).split(path.sep).join("/");
        const line = loc.start.line - offset; // columns are unaffected by a top preamble
        const col = loc.start.column + 1;
        p.node.attributes.push(
          t.jsxAttribute(t.jsxIdentifier("data-bf-loc"), t.stringLiteral(rel + ":" + line + ":" + col)),
          t.jsxAttribute(t.jsxIdentifier("data-bf-id"), t.stringLiteral(path.basename(rel) + "_" + line + "_" + col))
        );
      }
    }
  };
}

function botflowEditorPlugin() {
  const babel = loadBabel();
  const root = process.cwd();
  if (!babel) {
    console.warn("[botflow] visual editor: @babel/core not found; source stamping disabled");
  }
  return {
    name: "botflow-visual-editor",
    enforce: "pre",
    transform(code, id) {
      if (!babel) return null;
      const clean = id.split("?")[0];
      if (!/\.(tsx|jsx)$/.test(clean)) return null;
      if (clean.includes("/node_modules/")) return null;
      // Vite's transform input may carry a prepended HMR/refresh preamble, which
      // shifts line numbers. Read the pristine file so stamped lines index into
      // what the write-back API edits.
      let originalSrc = code;
      try { originalSrc = fs.readFileSync(clean, "utf8"); } catch (e) {}
      try {
        const result = babel.transformSync(code, {
          filename: clean,
          root,
          babelrc: false,
          configFile: false,
          sourceMaps: true,
          parserOpts: { plugins: ["jsx", "typescript"] },
          plugins: [bfStampPlugin(babel, root, originalSrc)]
        });
        if (!result || !result.code) return null;
        return { code: result.code, map: result.map };
      } catch (e) {
        console.warn("[botflow] stamp skipped for " + clean + ": " + (e && e.message));
        return null;
      }
    },
    transformIndexHtml() {
      return [{ tag: "script", attrs: { type: "module" }, children: EDITOR_RUNTIME, injectTo: "body" }];
    }
  };
}

export default defineConfig(async ({ command, mode }) => {
  const candidates = ["vite.config.ts", "vite.config.js", "vite.config.mjs"];
  let userConfig = {};
  for (const file of candidates) {
    const abs = path.resolve(process.cwd(), file);
    try {
      const result = await loadConfigFromFile({ command, mode }, abs);
      if (result && result.config) { userConfig = result.config; break; }
    } catch (e) {
      console.warn("[botflow] Failed to load " + file + ":", (e && e.message) || e);
    }
  }
  const overlay = { server: { host: "0.0.0.0", allowedHosts: true } };
  if (command === "serve") {
    overlay.plugins = [botflowEditorPlugin()];
  }
  return mergeConfig(userConfig, overlay);
});
