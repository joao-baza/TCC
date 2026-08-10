#!/usr/bin/env node

import { readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const DRAWIO_COMMIT = "a1f615b7f5a5237da71de2ce2f057b5fa70b0aeb";
const DRAWIO_REPOSITORY = "https://github.com/jgraph/drawio";
const scriptRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptRoot, "..");
const sourceRoot = resolve(process.argv[2] ?? "");
const frontendRoot = join(projectRoot, "frontend");
const assetRoot = join(frontendRoot, "public/pid/symbols");
const manifestPath = join(frontendRoot, "src/features/pid/catalog/generated/drawio-pid2-catalog.json");

function main() {
  if (!process.argv[2]) throw new Error("Usage: import_drawio_pid2_catalog.mjs <drawio-checkout>");

  const registeredShapes = new Map();
  const context = createDrawioContext(registeredShapes);
  vm.createContext(context);
  for (const filename of ["mxPidInstruments.js", "mxPidMisc.js", "mxPidValves.js"]) {
    vm.runInContext(
      readFileSync(join(sourceRoot, "src/main/webapp/shapes/pid2", filename), "utf8"),
      context,
      { filename },
    );
  }
  vm.runInContext(
    readFileSync(join(sourceRoot, "src/main/webapp/js/diagramly/sidebar/Sidebar-PID.js"), "utf8"),
    context,
    { filename: "Sidebar-PID.js" },
  );

  const sidebar = new context.Sidebar();
  context.sb = sidebar;
  sidebar.addPidInstrumentsPalette();
  sidebar.addPidValvesPalette();
  sidebar.addPidMiscPalette();
  const entries = sidebar.entries.filter((entry) => parseStyle(entry.style).shape?.startsWith("mxgraph.pid2"));
  if (entries.length !== 69) throw new Error(`Expected 69 Draw.io pid2 entries, received ${entries.length}.`);

  for (const filename of readdirSync(assetRoot)) {
    if (filename.startsWith("drawio-pid2-") && filename.endsWith(".svg")) unlinkSync(join(assetRoot, filename));
  }

  const keys = new Set();
  const symbols = entries.map((entry) => catalogSymbol(entry, registeredShapes, keys)).sort((left, right) => left.key.localeCompare(right.key, "en"));
  writeFileSync(manifestPath, `${JSON.stringify(symbols, null, 2)}\n`, "utf8");
  console.log(`Generated ${symbols.length} Draw.io P&ID pid2 variants.`);
}

function createDrawioContext(shapes) {
  function mxShape() {}
  function mxPoint(x, y) { Object.assign(this, { x, y }); }
  function mxConnectionConstraint(point, perimeter) { Object.assign(this, { point, perimeter }); }
  function mxGeometry(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
  function mxCell(value, geometry, style) {
    Object.assign(this, { value, geometry, style, children: [] });
    this.insert = (cell) => { this.children.push(cell); return cell; };
  }
  function Sidebar() { this.entries = []; }
  Sidebar.prototype.createVertexTemplateEntry = function (style, width, height, value, title) {
    return { style, width, height, value, title };
  };
  Sidebar.prototype.createVertexTemplateFromCells = function (cells, width, height, title) {
    return { style: cells[0]?.style ?? "", width, height, value: cells[0]?.value ?? "", title };
  };
  Sidebar.prototype.addEntry = function (_tags, factory) { return factory(); };
  Sidebar.prototype.addPaletteFunctions = function (_id, _title, _expanded, entries) { this.entries.push(...entries); };
  Sidebar.prototype.getTagsForStencil = function () { return []; };
  Sidebar.prototype.setCurrentSearchEntryLibrary = function () {};
  Sidebar.prototype.addStencilPalette = function () {};
  const mxUtils = {
    extend(child, parent) {
      const own = child.prototype;
      child.prototype = Object.assign(Object.create(parent.prototype), own);
      child.prototype.constructor = child;
    },
    getValue(style, key, fallback) { return style?.[key] ?? fallback; },
    indexOf(values, value) { return values.indexOf(value); },
  };
  const mxConstants = new Proxy({
    ALIGN_CENTER: "center",
    ALIGN_MIDDLE: "middle",
    STYLE_SHAPE: "shape",
    STYLE_FILLCOLOR: "fillColor",
    STYLE_STROKECOLOR: "strokeColor",
    STYLE_DASHED: "dashed",
  }, { get: (target, key) => target[key] ?? String(key).toLowerCase() });
  const mxCellRenderer = { registerShape(name, constructor) { shapes.set(name, constructor); } };
  return { console, mxShape, mxPoint, mxConnectionConstraint, mxGeometry, mxCell, Sidebar, mxUtils, mxConstants, mxCellRenderer };
}

function catalogSymbol(entry, shapes, keys) {
  const style = parseStyle(entry.style);
  const shapeName = style.shape;
  const Constructor = shapes.get(shapeName);
  if (!Constructor) throw new Error(`No renderer registered for pid2 shape ${shapeName}.`);
  const family = shapeName.includes("pid2inst") ? "instruments" : shapeName.includes("pid2valves") ? "valves" : "misc";
  const rawSlug = slugify(entry.title);
  const baseSlug = /^\d/.test(rawSlug) ? `symbol-${rawSlug}` : rawSlug;
  let key = `drawio.pid2.${family}.${baseSlug}`;
  for (let suffix = 2; keys.has(key); suffix += 1) key = `drawio.pid2.${family}.${baseSlug}-${suffix}`;
  keys.add(key);
  const filename = `drawio-pid2-${family}-${key.split(".").at(-1)}.svg`;
  const instance = new Constructor({}, "#ffffff", "currentColor", 1);
  instance.style = style;
  instance.fill = "#ffffff";
  instance.stroke = "currentColor";
  instance.strokewidth = 1;
  const canvas = new SvgCanvas(entry.width, entry.height);
  instance.paintVertexShape(canvas, 0, 0, entry.width, entry.height);
  writeFileSync(join(assetRoot, filename), canvas.svg(), "utf8");
  const size = defaultSize(entry.width, entry.height);
  return {
    key,
    name: entry.title,
    aliases: [...new Set([entry.title.toLowerCase(), baseSlug.replaceAll("-", " ")])],
    category: family === "instruments" ? "Instrumentação" : family === "valves" ? "Válvulas" : "Equipamentos diversos",
    assetUrl: `/pid/symbols/${filename}`,
    viewBox: `0 0 ${number(entry.width)} ${number(entry.height)}`,
    defaultSize: size,
    portTemplates: portsForEntry(shapeName, style, instance),
    standards: ["free"],
    catalogVersion: "local-v1",
    source: {
      sourceKind: "drawio",
      sourceName: "Draw.io P&ID",
      license: {
        name: "Apache-2.0",
        reference: `${DRAWIO_REPOSITORY}/blob/${DRAWIO_COMMIT}/LICENSE`,
      },
      attribution: `Draw.io P&ID pid2 shape, commit ${DRAWIO_COMMIT}.`,
    },
  };
}

function portsForEntry(shapeName, style, instance) {
  const port = (key, x, y, connectionClass = "process") => ({
    key, direction: "bidirectional", connectionClass, capacity: 8, anchor: { x, y },
  });
  if (shapeName.includes("pid2inst")) {
    return instance.constraints.map((constraint, index) => {
      const { x, y } = constraint.point;
      return port(anchorKey(x, y, index), x, y, "signal");
    });
  }
  if (shapeName.includes("pid2valves")) {
    const valveType = style.valveType ?? "gate";
    const ports = valveType === "threeWay" || shapeName.endsWith("autoRecircValve")
      ? [port("w", 0, 0.65), port("e", 1, 0.65), port("s", 0.5, 1)]
      : valveType === "angle" || valveType === "angleGlobe"
        ? [port("w", 0, 0.65), port("s", 0.5, 1)]
        : [port("w", 0, 0.65), port("e", 1, 0.65)];
    if ((style.actuator ?? "none") !== "none") ports.push(port("signal", 0.5, 0, "signal"));
    return ports;
  }
  if (shapeName.endsWith("column")) return [port("n", 0.5, 0), port("e", 1, 0.5), port("s", 0.5, 1), port("w", 0, 0.5)];
  return [port("w", 0, 0.5), port("e", 1, 0.5)];
}

function anchorKey(x, y, index) {
  if (x === 0.5 && y === 0) return "n";
  if (x === 1 && y === 0.5) return "e";
  if (x === 0.5 && y === 1) return "s";
  if (x === 0 && y === 0.5) return "w";
  const horizontal = x === 0 ? "w" : x === 1 ? "e" : "";
  const vertical = y === 0 ? "n" : y === 1 ? "s" : "";
  if (horizontal || vertical) return `${vertical}${horizontal}-${index + 1}`;
  return `inner-${index + 1}`;
}

class SvgCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tx = 0;
    this.ty = 0;
    this.fill = "#ffffff";
    this.strokeColor = "currentColor";
    this.strokeWidth = 1;
    this.lineJoin = "round";
    this.dashed = false;
    this.fontSize = 12;
    this.items = [];
    this.current = null;
  }
  translate(x, y) { this.tx += x; this.ty += y; }
  begin() { this.current = { kind: "path", commands: [] }; }
  moveTo(x, y) { this.ensurePath().commands.push(`M ${number(x + this.tx)} ${number(y + this.ty)}`); }
  lineTo(x, y) { this.ensurePath().commands.push(`L ${number(x + this.tx)} ${number(y + this.ty)}`); }
  curveTo(x1, y1, x2, y2, x3, y3) { this.ensurePath().commands.push(`C ${number(x1 + this.tx)} ${number(y1 + this.ty)} ${number(x2 + this.tx)} ${number(y2 + this.ty)} ${number(x3 + this.tx)} ${number(y3 + this.ty)}`); }
  arcTo(rx, ry, rotation, largeArc, sweep, x, y) { this.ensurePath().commands.push(`A ${number(rx)} ${number(ry)} ${number(rotation)} ${Number(Boolean(largeArc))} ${Number(Boolean(sweep))} ${number(x + this.tx)} ${number(y + this.ty)}`); }
  close() { this.ensurePath().commands.push("Z"); }
  rect(x, y, width, height) { this.current = { kind: "rect", x: x + this.tx, y: y + this.ty, width, height }; }
  ellipse(x, y, width, height) { this.current = { kind: "ellipse", x: x + this.tx, y: y + this.ty, width, height }; }
  fillAndStroke() { this.flush(true, true); }
  stroke() { this.flush(false, true); }
  fill() { this.flush(true, false); }
  setFillColor(value) { this.fill = paint(value, "#ffffff"); }
  setStrokeColor(value) { this.strokeColor = paint(value, "currentColor"); }
  setStrokeWidth(value) { this.strokeWidth = Number(value) || 1; }
  setDashed(value) { this.dashed = Boolean(value); }
  setLineJoin(value) { this.lineJoin = ["round", "miter", "bevel"].includes(value) ? value : "round"; }
  setShadow() {}
  setFontFamily() {}
  setFontStyle() {}
  setFontSize(value) { this.fontSize = Number(value) || 12; }
  text(x, y, _width, _height, value, align = "center", valign = "middle") {
    const anchor = { left: "start", center: "middle", right: "end" }[align] ?? "middle";
    const baseline = { top: "hanging", middle: "middle", bottom: "auto" }[valign] ?? "middle";
    this.items.push(`<text x="${number(x + this.tx)}" y="${number(y + this.ty)}" fill="currentColor" font-size="${number(this.fontSize)}" text-anchor="${anchor}" dominant-baseline="${baseline}">${escapeText(String(value))}</text>`);
  }
  ensurePath() {
    if (!this.current || this.current.kind !== "path") this.begin();
    return this.current;
  }
  flush(withFill, withStroke) {
    if (!this.current) return;
    const fill = withFill ? this.fill : "none";
    const stroke = withStroke ? this.strokeColor : "none";
    const style = `fill="${fill}" stroke="${stroke}" stroke-width="${number(this.strokeWidth)}" stroke-linejoin="${this.lineJoin}" stroke-linecap="round"${this.dashed && withStroke ? ' stroke-dasharray="3 3"' : ""}`;
    if (this.current.kind === "path") this.items.push(`<path d="${this.current.commands.join(" ")}" ${style}></path>`);
    if (this.current.kind === "rect") this.items.push(`<rect x="${number(this.current.x)}" y="${number(this.current.y)}" width="${number(this.current.width)}" height="${number(this.current.height)}" ${style}></rect>`);
    if (this.current.kind === "ellipse") this.items.push(`<ellipse cx="${number(this.current.x + this.current.width / 2)}" cy="${number(this.current.y + this.current.height / 2)}" rx="${number(this.current.width / 2)}" ry="${number(this.current.height / 2)}" ${style}></ellipse>`);
    this.current = null;
  }
  svg() { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${number(this.width)} ${number(this.height)}">${this.items.join("")}</svg>\n`; }
}

function parseStyle(value) {
  return Object.fromEntries(String(value).split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? [part, "1"] : [part.slice(0, index), part.slice(index + 1)];
  }));
}

function defaultSize(width, height) {
  let scale = Math.min(1, 120 / Math.max(width, height));
  if (Math.min(width * scale, height * scale) < 40) scale *= 40 / Math.min(width * scale, height * scale);
  return { width: rounded(width * scale), height: rounded(height * scale) };
}

function slugify(value) { return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "symbol"; }
function paint(value, fallback) { return value === "none" || value === "currentColor" || /^#[0-9a-f]{3,8}$/i.test(value ?? "") ? value : fallback; }
function escapeText(value) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function rounded(value) { return Math.round(value * 1_000_000) / 1_000_000; }
function number(value) { return String(Object.is(rounded(Number(value)), -0) ? 0 : rounded(Number(value))); }

main();
