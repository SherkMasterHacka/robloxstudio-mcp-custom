#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/install-plugin.ts
var install_plugin_exports = {};
__export(install_plugin_exports, {
  installPlugin: () => installPlugin
});
import { createWriteStream, existsSync as existsSync2, mkdirSync as mkdirSync2, unlinkSync } from "fs";
import { join as join2 } from "path";
import { homedir as homedir2 } from "os";
import { get } from "https";
function getPluginsFolder() {
  if (process.platform === "win32") {
    return join2(process.env.LOCALAPPDATA || join2(homedir2(), "AppData", "Local"), "Roblox", "Plugins");
  }
  return join2(homedir2(), "Documents", "Roblox", "Plugins");
}
function httpsGet(url) {
  return new Promise((resolve2, reject) => {
    const req = get(url, { headers: { "User-Agent": "robloxstudio-mcp" } }, resolve2);
    req.on("error", reject);
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
    });
  });
}
async function download(url, dest, redirects = 0) {
  const res = await httpsGet(url);
  if (res.statusCode === 301 || res.statusCode === 302) {
    if (redirects >= MAX_REDIRECTS) throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
    const location = res.headers.location;
    if (!location) throw new Error("Redirect with no location header");
    return download(location, dest, redirects + 1);
  }
  if (res.statusCode !== 200) {
    throw new Error(`Download failed: HTTP ${res.statusCode}`);
  }
  return new Promise((resolve2, reject) => {
    const file = createWriteStream(dest);
    const cleanup = (err) => {
      file.close(() => {
        try {
          unlinkSync(dest);
        } catch {
        }
        reject(err);
      });
    };
    res.pipe(file);
    file.on("finish", () => {
      file.close();
      resolve2();
    });
    file.on("error", cleanup);
    res.on("error", cleanup);
  });
}
async function fetchJson(url) {
  const res = await httpsGet(url);
  if (res.statusCode !== 200) {
    throw new Error(`GitHub API returned HTTP ${res.statusCode}`);
  }
  const chunks = [];
  for await (const chunk of res) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function findDevRelease() {
  const releases = await fetchJson(`https://api.github.com/repos/${REPO}/releases?per_page=20`);
  const prerelease = releases.find(
    (r) => r.prerelease && r.assets.some((a) => a.name === ASSET_NAME)
  );
  if (!prerelease) {
    throw new Error(`No prerelease found with ${ASSET_NAME}`);
  }
  return prerelease;
}
async function installPlugin() {
  const dev = process.argv.includes("--dev");
  const pluginsFolder = getPluginsFolder();
  if (!existsSync2(pluginsFolder)) {
    mkdirSync2(pluginsFolder, { recursive: true });
  }
  console.log(dev ? "Fetching latest dev prerelease..." : "Fetching latest release...");
  const release = dev ? await findDevRelease() : await fetchJson(`https://api.github.com/repos/${REPO}/releases/latest`);
  const asset = release.assets?.find((a) => a.name === ASSET_NAME);
  if (!asset) {
    throw new Error(`${ASSET_NAME} not found in release ${release.tag_name}`);
  }
  const dest = join2(pluginsFolder, ASSET_NAME);
  console.log(`Downloading ${ASSET_NAME} from ${release.tag_name}...`);
  await download(asset.browser_download_url, dest);
  console.log(`Installed to ${dest}`);
}
var REPO, ASSET_NAME, TIMEOUT_MS, MAX_REDIRECTS;
var init_install_plugin = __esm({
  "src/install-plugin.ts"() {
    "use strict";
    REPO = "boshyxd/robloxstudio-mcp";
    ASSET_NAME = "MCPPlugin.rbxmx";
    TIMEOUT_MS = 3e4;
    MAX_REDIRECTS = 5;
  }
});

// ../core/dist/server.js
import { Server as Server2 } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema as CallToolRequestSchema2, ErrorCode as ErrorCode2, ListToolsRequestSchema as ListToolsRequestSchema2, McpError as McpError2 } from "@modelcontextprotocol/sdk/types.js";

// ../core/dist/http-server.js
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";
var TOOL_HANDLERS = {
  get_file_tree: (tools, body) => tools.getFileTree(body.path),
  search_files: (tools, body) => tools.searchFiles(body.query, body.searchType),
  get_place_info: (tools) => tools.getPlaceInfo(),
  get_services: (tools, body) => tools.getServices(body.serviceName),
  search_objects: (tools, body) => tools.searchObjects(body.query, body.searchType, body.propertyName),
  get_instance_properties: (tools, body) => tools.getInstanceProperties(body.instancePath, body.excludeSource),
  get_instance_children: (tools, body) => tools.getInstanceChildren(body.instancePath),
  search_by_property: (tools, body) => tools.searchByProperty(body.propertyName, body.propertyValue),
  get_class_info: (tools, body) => tools.getClassInfo(body.className),
  get_project_structure: (tools, body) => tools.getProjectStructure(body.path, body.maxDepth, body.scriptsOnly),
  set_property: (tools, body) => tools.setProperty(body.instancePath, body.propertyName, body.propertyValue),
  set_properties: (tools, body) => tools.setProperties(body.instancePath, body.properties),
  mass_set_property: (tools, body) => tools.massSetProperty(body.paths, body.propertyName, body.propertyValue),
  mass_get_property: (tools, body) => tools.massGetProperty(body.paths, body.propertyName),
  create_object: (tools, body) => tools.createObject(body.className, body.parent, body.name, body.properties),
  create_ui_tree: (tools, body) => tools.createUITree(body.parentPath, body.tree),
  mass_create_objects: (tools, body) => tools.massCreateObjects(body.objects),
  delete_object: (tools, body) => tools.deleteObject(body.instancePath),
  smart_duplicate: (tools, body) => tools.smartDuplicate(body.instancePath, body.count, body.options),
  mass_duplicate: (tools, body) => tools.massDuplicate(body.duplications),
  grep_scripts: (tools, body) => tools.grepScripts(body.pattern, {
    caseSensitive: body.caseSensitive,
    usePattern: body.usePattern,
    contextLines: body.contextLines,
    maxResults: body.maxResults,
    maxResultsPerScript: body.maxResultsPerScript,
    filesOnly: body.filesOnly,
    path: body.path,
    classFilter: body.classFilter
  }),
  get_script_source: (tools, body) => tools.getScriptSource(body.instancePath, body.startLine, body.endLine),
  set_script_source: (tools, body) => tools.setScriptSource(body.instancePath, body.source),
  edit_script_lines: (tools, body) => tools.editScriptLines(body.instancePath, body.old_string, body.new_string),
  insert_script_lines: (tools, body) => tools.insertScriptLines(body.instancePath, body.afterLine, body.newContent),
  delete_script_lines: (tools, body) => tools.deleteScriptLines(body.instancePath, body.startLine, body.endLine),
  get_attribute: (tools, body) => tools.getAttribute(body.instancePath, body.attributeName),
  set_attribute: (tools, body) => tools.setAttribute(body.instancePath, body.attributeName, body.attributeValue, body.valueType),
  get_attributes: (tools, body) => tools.getAttributes(body.instancePath),
  delete_attribute: (tools, body) => tools.deleteAttribute(body.instancePath, body.attributeName),
  get_tags: (tools, body) => tools.getTags(body.instancePath),
  add_tag: (tools, body) => tools.addTag(body.instancePath, body.tagName),
  remove_tag: (tools, body) => tools.removeTag(body.instancePath, body.tagName),
  get_tagged: (tools, body) => tools.getTagged(body.tagName),
  get_selection: (tools) => tools.getSelection(),
  execute_luau: (tools, body) => tools.executeLuau(body.code, body.target),
  start_playtest: (tools, body) => tools.startPlaytest(body.mode, body.numPlayers),
  stop_playtest: (tools) => tools.stopPlaytest(),
  get_playtest_output: (tools, body) => tools.getPlaytestOutput(body.target),
  get_connected_instances: (tools) => tools.getConnectedInstances(),
  export_build: (tools, body) => tools.exportBuild(body.instancePath, body.outputId, body.style),
  create_build: (tools, body) => tools.createBuild(body.id, body.style, body.palette, body.parts, body.bounds),
  generate_build: (tools, body) => tools.generateBuild(body.id, body.style, body.palette, body.code, body.seed),
  import_build: (tools, body) => tools.importBuild(body.buildData, body.targetPath, body.position),
  list_library: (tools, body) => tools.listLibrary(body.style),
  search_materials: (tools, body) => tools.searchMaterials(body.query, body.maxResults),
  get_build: (tools, body) => tools.getBuild(body.id),
  import_scene: (tools, body) => tools.importScene(body.sceneData, body.targetPath),
  undo: (tools) => tools.undo(),
  redo: (tools) => tools.redo(),
  search_assets: (tools, body) => tools.searchAssets(body.assetType, body.query, body.maxResults, body.sortBy, body.verifiedCreatorsOnly),
  get_asset_details: (tools, body) => tools.getAssetDetails(body.assetId),
  get_asset_thumbnail: (tools, body) => tools.getAssetThumbnail(body.assetId, body.size),
  insert_asset: (tools, body) => tools.insertAsset(body.assetId, body.parentPath, body.position),
  preview_asset: (tools, body) => tools.previewAsset(body.assetId, body.includeProperties, body.maxDepth),
  clone_object: (tools, body) => tools.cloneObject(body.instancePath, body.targetParentPath),
  move_object: (tools, body) => tools.moveObject(body.instancePath, body.targetParentPath),
  rename_object: (tools, body) => tools.renameObject(body.instancePath, body.newName),
  get_descendants: (tools, body) => tools.getDescendants(body.instancePath, body.maxDepth, body.classFilter),
  compare_instances: (tools, body) => tools.compareInstances(body.instancePathA, body.instancePathB),
  get_output_log: (tools, body) => tools.getOutputLog(body.maxEntries, body.messageType),
  get_script_analysis: (tools, body) => tools.getScriptAnalysis(body.instancePath),
  bulk_set_attributes: (tools, body) => tools.bulkSetAttributes(body.instancePath, body.attributes),
  capture_screenshot: (tools) => tools.captureScreenshot(),
  simulate_mouse_input: (tools, body) => tools.simulateMouseInput(body.action, body.x, body.y, body.button, body.scrollDirection, body.target),
  simulate_keyboard_input: (tools, body) => tools.simulateKeyboardInput(body.keyCode, body.action, body.duration, body.target),
  character_navigation: (tools, body) => tools.characterNavigation(body.position, body.instancePath, body.waitForCompletion, body.timeout, body.target),
  find_and_replace_in_scripts: (tools, body) => tools.findAndReplaceInScripts(body.pattern, body.replacement, {
    caseSensitive: body.caseSensitive,
    usePattern: body.usePattern,
    path: body.path,
    classFilter: body.classFilter,
    dryRun: body.dryRun,
    maxReplacements: body.maxReplacements
  })
};
function createHttpServer(tools, bridge, allowedTools, serverConfig) {
  const app = express();
  let mcpServerActive = false;
  let lastMCPActivity = 0;
  let mcpServerStartTime = 0;
  const proxyInstances = /* @__PURE__ */ new Set();
  const setMCPServerActive = (active) => {
    mcpServerActive = active;
    if (active) {
      mcpServerStartTime = Date.now();
      lastMCPActivity = Date.now();
    } else {
      mcpServerStartTime = 0;
      lastMCPActivity = 0;
    }
  };
  const trackMCPActivity = () => {
    if (mcpServerActive) {
      lastMCPActivity = Date.now();
    }
  };
  const isMCPServerActive = () => {
    if (!mcpServerActive)
      return false;
    return Date.now() - lastMCPActivity < 3e4;
  };
  const isPluginConnected = () => {
    return bridge.getInstances().length > 0;
  };
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/health", (req, res) => {
    const instances = bridge.getInstances();
    res.json({
      status: "ok",
      service: "robloxstudio-mcp",
      version: serverConfig?.version,
      pluginConnected: instances.length > 0,
      instanceCount: instances.length,
      instances: instances.map((i) => ({
        instanceId: i.instanceId,
        role: i.role,
        lastActivity: i.lastActivity,
        connectedAt: i.connectedAt
      })),
      mcpServerActive: isMCPServerActive(),
      uptime: mcpServerActive ? Date.now() - mcpServerStartTime : 0,
      pendingRequests: bridge.getPendingRequestCount(),
      proxyInstanceCount: proxyInstances.size,
      streamableHttp: !!serverConfig
    });
  });
  app.post("/ready", (req, res) => {
    const { instanceId, role } = req.body;
    if (instanceId && role) {
      const assignedRole = bridge.registerInstance(instanceId, role);
      res.json({ success: true, assignedRole });
    } else {
      bridge.registerInstance("legacy", "edit");
      res.json({ success: true, assignedRole: "edit" });
    }
  });
  app.post("/disconnect", (req, res) => {
    const { instanceId } = req.body;
    if (instanceId) {
      bridge.unregisterInstance(instanceId);
    } else {
      bridge.unregisterInstance("legacy");
      bridge.clearAllPendingRequests();
    }
    res.json({ success: true });
  });
  app.get("/status", (req, res) => {
    const instances = bridge.getInstances();
    res.json({
      pluginConnected: instances.length > 0,
      instanceCount: instances.length,
      instances: instances.map((i) => ({ instanceId: i.instanceId, role: i.role })),
      mcpServerActive: isMCPServerActive(),
      lastMCPActivity,
      uptime: mcpServerActive ? Date.now() - mcpServerStartTime : 0
    });
  });
  app.get("/instances", (req, res) => {
    res.json({ instances: bridge.getInstances() });
  });
  app.get("/poll", (req, res) => {
    const instanceId = req.query.instanceId;
    if (instanceId) {
      bridge.updateInstanceActivity(instanceId);
    }
    let callerRole = "edit";
    if (instanceId) {
      const inst = bridge.getInstances().find((i) => i.instanceId === instanceId);
      if (inst) {
        callerRole = inst.role;
      }
    }
    if (!isMCPServerActive()) {
      res.status(503).json({
        error: "MCP server not connected",
        pluginConnected: true,
        mcpConnected: false,
        request: null
      });
      return;
    }
    const pendingRequest = bridge.getPendingRequest(callerRole);
    if (pendingRequest) {
      res.json({
        request: pendingRequest.request,
        requestId: pendingRequest.requestId,
        mcpConnected: true,
        pluginConnected: true,
        proxyInstanceCount: proxyInstances.size
      });
    } else {
      res.json({
        request: null,
        mcpConnected: true,
        pluginConnected: true,
        proxyInstanceCount: proxyInstances.size
      });
    }
  });
  app.post("/response", (req, res) => {
    const { requestId, response, error } = req.body;
    if (error) {
      bridge.rejectRequest(requestId, error);
    } else {
      bridge.resolveRequest(requestId, response);
    }
    res.json({ success: true });
  });
  app.post("/proxy", async (req, res) => {
    const { endpoint, data, target, proxyInstanceId } = req.body;
    if (!endpoint) {
      res.status(400).json({ error: "endpoint is required" });
      return;
    }
    if (proxyInstanceId) {
      proxyInstances.add(proxyInstanceId);
    }
    try {
      const response = await bridge.sendRequest(endpoint, data, target || "edit");
      res.json({ response });
    } catch (err) {
      res.status(500).json({ error: err.message || "Proxy request failed" });
    }
  });
  if (serverConfig) {
    const filteredTools = serverConfig.tools.filter((t) => !allowedTools || allowedTools.has(t.name));
    app.post("/mcp", async (req, res) => {
      try {
        trackMCPActivity();
        const server = new Server({ name: serverConfig.name, version: serverConfig.version }, { capabilities: { tools: {} } });
        server.setRequestHandler(ListToolsRequestSchema, async () => ({
          tools: filteredTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        }));
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
          const { name, arguments: args } = request.params;
          if (allowedTools && !allowedTools.has(name)) {
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
          }
          const handler = TOOL_HANDLERS[name];
          if (!handler) {
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
          }
          try {
            return await handler(tools, args || {});
          } catch (error) {
            if (error instanceof McpError)
              throw error;
            throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: void 0
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on("close", () => {
          transport.close();
          server.close();
        });
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null
          });
        }
      }
    });
    app.get("/mcp", (req, res) => {
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32e3, message: "Method not allowed." },
        id: null
      }));
    });
    app.delete("/mcp", (req, res) => {
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32e3, message: "Method not allowed." },
        id: null
      }));
    });
  }
  app.use("/mcp/*", (req, res, next) => {
    trackMCPActivity();
    next();
  });
  for (const [toolName, handler] of Object.entries(TOOL_HANDLERS)) {
    if (allowedTools && !allowedTools.has(toolName))
      continue;
    app.post(`/mcp/${toolName}`, async (req, res) => {
      try {
        const result = await handler(tools, req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
      }
    });
  }
  app.isPluginConnected = isPluginConnected;
  app.setMCPServerActive = setMCPServerActive;
  app.isMCPServerActive = isMCPServerActive;
  app.trackMCPActivity = trackMCPActivity;
  return app;
}
function listenWithRetry(app, host, startPort, maxAttempts = 5) {
  return new Promise(async (resolve2, reject) => {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      try {
        const server = await bindPort(app, host, port);
        resolve2({ server, port });
        return;
      } catch (err) {
        if (err.code === "EADDRINUSE") {
          console.error(`Port ${port} in use, trying next...`);
          continue;
        }
        reject(err);
        return;
      }
    }
    reject(new Error(`All ports ${startPort}-${startPort + maxAttempts - 1} are in use. Stop some MCP server instances and retry.`));
  });
}
function bindPort(app, host, port) {
  return new Promise((resolve2, reject) => {
    const server = http.createServer(app);
    const onError = (err) => {
      server.removeListener("error", onError);
      reject(err);
    };
    server.once("error", onError);
    server.listen(port, host, () => {
      server.removeListener("error", onError);
      resolve2(server);
    });
  });
}

// ../core/dist/tools/studio-client.js
var StudioHttpClient = class {
  bridge;
  constructor(bridge) {
    this.bridge = bridge;
  }
  async request(endpoint, data, target = "edit") {
    try {
      const response = await this.bridge.sendRequest(endpoint, data, target);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === "Request timeout") {
        throw new Error("Studio plugin connection timeout. Make sure the Roblox Studio plugin is running and activated.");
      }
      throw error;
    }
  }
};

// ../core/dist/tools/build-executor.js
import * as vm from "vm";
var DEFAULT_TIMEOUT = 1e4;
var DEFAULT_MAX_PARTS = 1e4;
var VALID_SHAPES = /* @__PURE__ */ new Set(["Block", "Wedge", "Cylinder", "Ball", "CornerWedge"]);
function createSeededRng(seed) {
  let s = seed;
  return () => {
    s = s * 1664525 + 1013904223 & 4294967295;
    return (s >>> 0) / 4294967296;
  };
}
function computeBoundsFromParts(parts) {
  let maxX = 0, maxY = 0, maxZ = 0;
  for (const p of parts) {
    const px = Math.abs(p[0]) + p[3] / 2;
    const py = Math.abs(p[1]) + p[4] / 2;
    const pz = Math.abs(p[2]) + p[5] / 2;
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
    maxZ = Math.max(maxZ, pz);
  }
  return [
    Math.round(maxX * 2 * 10) / 10,
    Math.round(maxY * 2 * 10) / 10,
    Math.round(maxZ * 2 * 10) / 10
  ];
}
function runBuildExecutor(code, palette, seed, options) {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxParts = options?.maxParts ?? DEFAULT_MAX_PARTS;
  const paletteKeys = new Set(Object.keys(palette));
  const parts = [];
  function checkLimit() {
    if (parts.length >= maxParts) {
      throw new Error(`Part limit exceeded: max ${maxParts} parts allowed`);
    }
  }
  function validateKey(key, fnName) {
    if (!paletteKeys.has(key)) {
      throw new Error(`${fnName}: palette key "${key}" not found. Available keys: ${[...paletteKeys].join(", ")}`);
    }
  }
  function validateNumber(val, name) {
    if (typeof val !== "number" || !isFinite(val)) {
      throw new Error(`${name} must be a finite number, got ${val}`);
    }
  }
  function partFn(x, y, z, sx, sy, sz, key, shape, transparency) {
    validateNumber(x, "part x");
    validateNumber(y, "part y");
    validateNumber(z, "part z");
    validateNumber(sx, "part sx");
    validateNumber(sy, "part sy");
    validateNumber(sz, "part sz");
    validateKey(key, "part");
    if (shape !== void 0 && !VALID_SHAPES.has(shape)) {
      throw new Error(`part: invalid shape "${shape}". Valid: ${[...VALID_SHAPES].join(", ")}`);
    }
    checkLimit();
    const entry = [x, y, z, sx, sy, sz, 0, 0, 0, key];
    if (shape !== void 0)
      entry.push(shape);
    if (transparency !== void 0)
      entry.push(transparency);
    parts.push(entry);
  }
  function rpartFn(x, y, z, sx, sy, sz, rx, ry, rz, key, shape, transparency) {
    validateNumber(x, "rpart x");
    validateNumber(y, "rpart y");
    validateNumber(z, "rpart z");
    validateNumber(sx, "rpart sx");
    validateNumber(sy, "rpart sy");
    validateNumber(sz, "rpart sz");
    validateNumber(rx, "rpart rx");
    validateNumber(ry, "rpart ry");
    validateNumber(rz, "rpart rz");
    validateKey(key, "rpart");
    if (shape !== void 0 && !VALID_SHAPES.has(shape)) {
      throw new Error(`rpart: invalid shape "${shape}". Valid: ${[...VALID_SHAPES].join(", ")}`);
    }
    checkLimit();
    const entry = [x, y, z, sx, sy, sz, rx, ry, rz, key];
    if (shape !== void 0)
      entry.push(shape);
    if (transparency !== void 0)
      entry.push(transparency);
    parts.push(entry);
  }
  function fillFn(x1, y1, z1, x2, y2, z2, key, unitSize) {
    validateKey(key, "fill");
    [x1, y1, z1, x2, y2, z2].forEach((v, i) => validateNumber(v, `fill arg${i}`));
    if (!unitSize) {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const cz = (z1 + z2) / 2;
      const sx = Math.abs(x2 - x1);
      const sy = Math.abs(y2 - y1);
      const sz = Math.abs(z2 - z1);
      checkLimit();
      parts.push([cx, cy, cz, sx, sy, sz, 0, 0, 0, key]);
    } else {
      const [ux, uy, uz] = unitSize;
      validateNumber(ux, "fill unitSize[0]");
      validateNumber(uy, "fill unitSize[1]");
      validateNumber(uz, "fill unitSize[2]");
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const minZ = Math.min(z1, z2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);
      const maxZ = Math.max(z1, z2);
      for (let x = minX + ux / 2; x < maxX; x += ux) {
        for (let y = minY + uy / 2; y < maxY; y += uy) {
          for (let z = minZ + uz / 2; z < maxZ; z += uz) {
            checkLimit();
            parts.push([
              Math.round(x * 1e3) / 1e3,
              Math.round(y * 1e3) / 1e3,
              Math.round(z * 1e3) / 1e3,
              ux,
              uy,
              uz,
              0,
              0,
              0,
              key
            ]);
          }
        }
      }
    }
  }
  function beamFn(x1, y1, z1, x2, y2, z2, thickness, key) {
    validateKey(key, "beam");
    [x1, y1, z1, x2, y2, z2, thickness].forEach((v, i) => validateNumber(v, `beam arg${i}`));
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const cz = (z1 + z2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const ry = Math.atan2(dx, dz) * (180 / Math.PI);
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const rx = -Math.atan2(dy, horizontalDist) * (180 / Math.PI);
    checkLimit();
    parts.push([
      Math.round(cx * 1e3) / 1e3,
      Math.round(cy * 1e3) / 1e3,
      Math.round(cz * 1e3) / 1e3,
      thickness,
      thickness,
      Math.round(length * 1e3) / 1e3,
      Math.round(rx * 100) / 100,
      Math.round(ry * 100) / 100,
      0,
      key
    ]);
  }
  function wallFn(x1, z1, x2, z2, height, thickness, key) {
    validateKey(key, "wall");
    [x1, z1, x2, z2, height, thickness].forEach((v, i) => validateNumber(v, `wall arg${i}`));
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const cy = height / 2;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const wallLength = Math.sqrt(dx * dx + dz * dz);
    const ry = Math.atan2(dx, dz) * (180 / Math.PI);
    checkLimit();
    parts.push([
      Math.round(cx * 1e3) / 1e3,
      Math.round(cy * 1e3) / 1e3,
      Math.round(cz * 1e3) / 1e3,
      thickness,
      height,
      Math.round(wallLength * 1e3) / 1e3,
      0,
      Math.round(ry * 100) / 100,
      0,
      key
    ]);
  }
  function floorFn(x1, z1, x2, z2, y, thickness, key) {
    validateKey(key, "floor");
    [x1, z1, x2, z2, y, thickness].forEach((v, i) => validateNumber(v, `floor arg${i}`));
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const sx = Math.abs(x2 - x1);
    const sz = Math.abs(z2 - z1);
    checkLimit();
    parts.push([
      Math.round(cx * 1e3) / 1e3,
      y,
      Math.round(cz * 1e3) / 1e3,
      sx,
      thickness,
      sz,
      0,
      0,
      0,
      key
    ]);
  }
  function rowFn(x, y, z, count, spacingX, spacingZ, partFnCb) {
    validateNumber(x, "row x");
    validateNumber(y, "row y");
    validateNumber(z, "row z");
    validateNumber(count, "row count");
    validateNumber(spacingX, "row spacingX");
    validateNumber(spacingZ, "row spacingZ");
    if (typeof partFnCb !== "function") {
      throw new Error("row: partFn must be a function");
    }
    for (let i = 0; i < count; i++) {
      partFnCb(i, x + i * spacingX, y, z + i * spacingZ);
    }
  }
  function gridFn(x, y, z, countX, countZ, spacingX, spacingZ, partFnCb) {
    validateNumber(x, "grid x");
    validateNumber(y, "grid y");
    validateNumber(z, "grid z");
    validateNumber(countX, "grid countX");
    validateNumber(countZ, "grid countZ");
    validateNumber(spacingX, "grid spacingX");
    validateNumber(spacingZ, "grid spacingZ");
    if (typeof partFnCb !== "function") {
      throw new Error("grid: partFn must be a function");
    }
    for (let ix = 0; ix < countX; ix++) {
      for (let iz = 0; iz < countZ; iz++) {
        partFnCb(ix, iz, x + ix * spacingX, y, z + iz * spacingZ);
      }
    }
  }
  function roomFn(x, y, z, w, h, d, wallKey, floorKey, ceilKey, wallThickness) {
    const t = wallThickness ?? 1;
    const fk = floorKey ?? wallKey;
    const ck = ceilKey ?? wallKey;
    floorFn(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y, t, fk);
    floorFn(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y + h, t, ck);
    wallFn(x - w / 2, z - d / 2, x - w / 2, z + d / 2, h, t, wallKey);
    wallFn(x + w / 2, z - d / 2, x + w / 2, z + d / 2, h, t, wallKey);
    wallFn(x - w / 2, z - d / 2, x + w / 2, z - d / 2, h, t, wallKey);
    wallFn(x - w / 2, z + d / 2, x + w / 2, z + d / 2, h, t, wallKey);
  }
  function roofFn(x, y, z, w, d, style, key, overhang) {
    const oh = overhang ?? 1;
    validateKey(key, "roof");
    if (style === "flat") {
      floorFn(x - w / 2 - oh, z - d / 2 - oh, x + w / 2 + oh, z + d / 2 + oh, y, 1, key);
    } else if (style === "gable") {
      const peakH = w / 2 * 0.6;
      const slopeW = Math.sqrt((w / 2 + oh) * (w / 2 + oh) + peakH * peakH);
      const angle = Math.atan2(peakH, w / 2 + oh) * (180 / Math.PI);
      rpartFn(x - (w / 4 + oh / 2) * 0.5, y + peakH / 2, z, slopeW, 0.5, d + oh * 2, -angle, 0, 0, key);
      rpartFn(x + (w / 4 + oh / 2) * 0.5, y + peakH / 2, z, slopeW, 0.5, d + oh * 2, angle, 0, 0, key);
    } else if (style === "hip") {
      const peakH = w / 3;
      floorFn(x - w / 4, z - d / 4, x + w / 4, z + d / 4, y + peakH, 0.5, key);
      const slopeW = Math.sqrt((w / 2 + oh) * (w / 2 + oh) + peakH * peakH);
      const angle = Math.atan2(peakH, w / 2 + oh) * (180 / Math.PI);
      rpartFn(x - w / 4, y + peakH / 2, z, slopeW * 0.6, 0.5, d + oh, -angle, 0, 0, key);
      rpartFn(x + w / 4, y + peakH / 2, z, slopeW * 0.6, 0.5, d + oh, angle, 0, 0, key);
    }
  }
  function stairsFn(x1, y1, z1, x2, y2, z2, w, key) {
    validateKey(key, "stairs");
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const stepCount = Math.max(2, Math.round(Math.abs(dy) / 0.5));
    const stepH = dy / stepCount;
    const stepDx = dx / stepCount;
    const stepDz = dz / stepCount;
    for (let i = 0; i < stepCount; i++) {
      checkLimit();
      const sx = x1 + stepDx * (i + 0.5);
      const sy = y1 + stepH * (i + 0.5);
      const sz = z1 + stepDz * (i + 0.5);
      const stepDepth = dist / stepCount;
      partFn(Math.round(sx * 100) / 100, Math.round(sy * 100) / 100, Math.round(sz * 100) / 100, w, Math.abs(stepH), stepDepth, key);
    }
  }
  function archFn(x, y, z, w, h, thickness, key, segments) {
    validateKey(key, "arch");
    const segs = segments ?? 8;
    const radius = w / 2;
    const archH = h - radius;
    if (archH > 0) {
      partFn(x - w / 2, y + archH / 2, z, thickness, archH, thickness, key);
      partFn(x + w / 2, y + archH / 2, z, thickness, archH, thickness, key);
    }
    for (let i = 0; i < segs; i++) {
      const a1 = Math.PI / segs * i;
      const a2 = Math.PI / segs * (i + 1);
      const mx = x + radius * Math.cos((a1 + a2) / 2 + Math.PI / 2);
      const my = y + archH + radius * Math.sin((a1 + a2) / 2 + Math.PI / 2) * (radius / (radius || 1));
      checkLimit();
      const segLen = 2 * radius * Math.sin((a2 - a1) / 2);
      const angle = (a1 + a2) / 2 * (180 / Math.PI);
      rpartFn(Math.round(mx * 100) / 100, Math.round(my * 100) / 100, z, segLen, thickness, thickness, 0, 0, Math.round(angle * 100) / 100, key);
    }
  }
  function columnFn(x, y, z, height, radius, key, capKey) {
    validateKey(key, "column");
    rpartFn(x, y + height / 2, z, height, radius * 2, radius * 2, 0, 0, 90, key, "Cylinder");
    const ck = capKey ?? key;
    validateKey(ck, "column cap");
    partFn(x, y + 0.25, z, radius * 2.5, 0.5, radius * 2.5, ck);
    partFn(x, y + height - 0.25, z, radius * 2.5, 0.5, radius * 2.5, ck);
  }
  function pewFn(x, y, z, w, d, seatKey, legKey) {
    validateKey(seatKey, "pew");
    const lk = legKey ?? seatKey;
    validateKey(lk, "pew legs");
    partFn(x, y + 1.5, z, w, 0.3, d, seatKey);
    partFn(x, y + 2.5, z - d / 2 + 0.15, w, 2, 0.3, seatKey);
    partFn(x - w / 2 + 0.25, y + 0.75, z, 0.5, 1.5, d, lk);
    partFn(x + w / 2 - 0.25, y + 0.75, z, 0.5, 1.5, d, lk);
  }
  function fenceFn(x1, z1, x2, z2, y, key, postSpacing) {
    validateKey(key, "fence");
    const spacing = postSpacing ?? 4;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const count = Math.max(2, Math.round(length / spacing) + 1);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      checkLimit();
      partFn(x1 + dx * t, y + 1.5, z1 + dz * t, 0.5, 3, 0.5, key);
    }
    wallFn(x1, z1, x2, z2, 1, 0.3, key);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const ry = Math.atan2(dx, dz) * (180 / Math.PI);
    checkLimit();
    parts.push([
      Math.round(cx * 1e3) / 1e3,
      y + 2.5,
      Math.round(cz * 1e3) / 1e3,
      0.3,
      0.3,
      Math.round(length * 1e3) / 1e3,
      0,
      Math.round(ry * 100) / 100,
      0,
      key
    ]);
  }
  const rng = createSeededRng(seed ?? 42);
  const sandbox = {
    part: partFn,
    rpart: rpartFn,
    fill: fillFn,
    beam: beamFn,
    wall: wallFn,
    floor: floorFn,
    row: rowFn,
    grid: gridFn,
    room: roomFn,
    roof: roofFn,
    stairs: stairsFn,
    arch: archFn,
    column: columnFn,
    pew: pewFn,
    fence: fenceFn,
    Math,
    GRID_SIZE: 1,
    rng,
    console: { log: () => {
    }, warn: () => {
    }, error: () => {
    } }
  };
  const context = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false }
  });
  const script = new vm.Script(code, { filename: "build-generator.js" });
  try {
    script.runInContext(context, { timeout });
  } catch (err) {
    if (err.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
      throw new Error(`Build code execution timed out after ${timeout}ms`);
    }
    throw new Error(`Build code execution error: ${err.message}`);
  }
  if (parts.length === 0) {
    throw new Error("Build code produced no parts. Make sure to call part(), wall(), floor(), etc.");
  }
  const bounds = computeBoundsFromParts(parts);
  return { parts, bounds, partCount: parts.length };
}

// ../core/dist/opencloud-client.js
var OpenCloudClient = class {
  apiKey;
  baseUrl;
  timeout;
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ROBLOX_OPEN_CLOUD_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://apis.roblox.com";
    this.timeout = config.timeout || 3e4;
  }
  hasApiKey() {
    return !!this.apiKey;
  }
  async request(endpoint, options = {}) {
    if (!this.apiKey) {
      throw new Error("Open Cloud API key not configured. Set ROBLOX_OPEN_CLOUD_API_KEY environment variable.");
    }
    const { method = "GET", params, body } = options;
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== void 0) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : void 0,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.detail || errorJson.message || errorBody;
        } catch {
          errorMessage = errorBody;
        }
        if (response.status === 401) {
          throw new Error("Invalid or expired API key");
        } else if (response.status === 403) {
          throw new Error(`API key lacks required permissions: ${errorMessage}`);
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else {
          throw new Error(`Open Cloud API error (${response.status}): ${errorMessage}`);
        }
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timed out");
        }
        throw error;
      }
      throw new Error(`Unknown error: ${String(error)}`);
    }
  }
  async searchAssets(params) {
    return this.request("/toolbox-service/v2/assets:search", {
      params: {
        searchCategoryType: params.searchCategoryType,
        query: params.query,
        pageToken: params.pageToken,
        pageNumber: params.pageNumber,
        maxPageSize: params.maxPageSize || 25,
        sortDirection: params.sortDirection,
        sortCategory: params.sortCategory,
        includeOnlyVerifiedCreators: params.includeOnlyVerifiedCreators,
        userId: params.userId,
        groupId: params.groupId
      }
    });
  }
  async getAssetDetails(assetId) {
    return this.request(`/toolbox-service/v2/assets/${assetId}`);
  }
  async getAssetThumbnail(assetId, size = "420x420") {
    const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=${size}&format=Png`;
    try {
      const response = await fetch(url);
      if (!response.ok)
        return null;
      const data = await response.json();
      const thumbnail = data.data[0];
      if (!thumbnail || thumbnail.state !== "Completed" || !thumbnail.imageUrl) {
        return null;
      }
      const imageResponse = await fetch(thumbnail.imageUrl);
      if (!imageResponse.ok)
        return null;
      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return { base64, mimeType: "image/png" };
    } catch {
      return null;
    }
  }
  async getAssetThumbnails(assetIds, size = "420x420") {
    const result = /* @__PURE__ */ new Map();
    if (assetIds.length === 0)
      return result;
    const batches = [];
    for (let i = 0; i < assetIds.length; i += 100) {
      batches.push(assetIds.slice(i, i + 100));
    }
    for (const batch of batches) {
      const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${batch.join(",")}&size=${size}&format=Png`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          for (const thumbnail of data.data) {
            if (thumbnail.state === "Completed" && thumbnail.imageUrl) {
              result.set(thumbnail.targetId, thumbnail.imageUrl);
            }
          }
        }
      } catch {
      }
    }
    return result;
  }
  async createAsset(uploadRequest, fileContent, fileName) {
    const formData = new FormData();
    formData.append("request", JSON.stringify(uploadRequest));
    formData.append("fileContent", new Blob([new Uint8Array(fileContent)], { type: this.getMimeType(fileName) }), fileName);
    const operation = await this.requestMultipart("/assets/v1/assets", formData);
    if (operation.done)
      return operation;
    return this.pollOperation(operation.path);
  }
  getMimeType(fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      bmp: "image/bmp",
      tga: "image/x-tga"
    };
    if (!ext || !mimeTypes[ext]) {
      throw new Error(`Unsupported image format: ${fileName}. Supported: PNG, JPG, BMP, TGA`);
    }
    return mimeTypes[ext];
  }
  async requestMultipart(endpoint, formData) {
    if (!this.apiKey) {
      throw new Error("Open Cloud API key not configured. Set ROBLOX_OPEN_CLOUD_API_KEY environment variable.");
    }
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "x-api-key": this.apiKey },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.detail || errorJson.message || errorBody;
        } catch {
          errorMessage = errorBody;
        }
        if (response.status === 401) {
          throw new Error("Invalid or expired API key");
        } else if (response.status === 403) {
          throw new Error(`API key lacks required permissions: ${errorMessage}`);
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else {
          throw new Error(`Open Cloud API error (${response.status}): ${errorMessage}`);
        }
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timed out");
        }
        throw error;
      }
      throw new Error(`Unknown error: ${String(error)}`);
    }
  }
  async pollOperation(operationPath, maxAttempts = 15, intervalMs = 2e3) {
    const operationId = operationPath.replace("operations/", "");
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.request(`/assets/v1/operations/${operationId}`);
      if (result.done)
        return result;
      if (result.error) {
        throw new Error(`Asset upload failed: ${result.error.message}`);
      }
      await new Promise((resolve2) => setTimeout(resolve2, intervalMs));
    }
    throw new Error(`Asset upload timed out after ${maxAttempts * intervalMs / 1e3}s. Operation ID: ${operationId}`);
  }
};

// ../core/dist/roblox-cookie-client.js
var RobloxCookieClient = class {
  cookie;
  csrfToken = null;
  constructor(cookie) {
    this.cookie = cookie || process.env.ROBLOSECURITY || "";
  }
  hasCookie() {
    return !!this.cookie;
  }
  async fetchWithCsrf(url, options = {}) {
    const headers = {
      Cookie: `.ROBLOSECURITY=${this.cookie}`,
      ...options.headers || {}
    };
    if (this.csrfToken) {
      headers["X-CSRF-TOKEN"] = this.csrfToken;
    }
    const response = await fetch(url, { ...options, headers });
    if (response.status === 403) {
      const newToken = response.headers.get("x-csrf-token");
      if (newToken) {
        this.csrfToken = newToken;
        headers["X-CSRF-TOKEN"] = newToken;
        return fetch(url, { ...options, headers });
      }
    }
    return response;
  }
  async uploadDecal(fileContent, name, description) {
    if (!this.cookie) {
      throw new Error("ROBLOSECURITY cookie is not set.");
    }
    const encodedName = encodeURIComponent(name);
    const encodedDesc = encodeURIComponent(description);
    const url = `https://data.roblox.com/data/upload/json?assetTypeId=13&name=${encodedName}&description=${encodedDesc}`;
    const response = await this.fetchWithCsrf(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "User-Agent": "RobloxStudio/WinInet",
        Requester: "Client"
      },
      body: new Uint8Array(fileContent)
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Decal upload failed (${response.status}): ${body}`);
    }
    const result = await response.json();
    if (!result.Success || !result.AssetId) {
      throw new Error(`Decal upload failed: ${result.Message || "Unknown error"}`);
    }
    return {
      assetId: result.AssetId,
      backingAssetId: result.BackingAssetId || 0
    };
  }
  async getAssetDetails(assetIds) {
    if (!this.cookie) {
      throw new Error("ROBLOSECURITY cookie is not set.");
    }
    const response = await this.fetchWithCsrf("https://itemconfiguration.roblox.com/v1/creations/get-asset-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds })
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to get asset details (${response.status}): ${body}`);
    }
    return response.json();
  }
};

// ../core/dist/png-encoder.js
import { deflateSync } from "zlib";
var PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
var CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++)
    c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let crc = 4294967295;
  for (let i = 0; i < buf.length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function writeChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBytes, data, checksum]);
}
function rgbaToPng(rgba, width, height) {
  if (width <= 0 || height <= 0)
    throw new Error(`Invalid PNG dimensions: ${width}x${height}`);
  const expected = width * height * 4;
  if (rgba.length < expected)
    throw new Error(`Buffer too small: got ${rgba.length}, need ${expected}`);
  const stride = width * 4;
  const filtered = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + stride)] = 0;
    rgba.copy(filtered, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIGNATURE,
    writeChunk("IHDR", ihdr),
    writeChunk("IDAT", deflateSync(filtered)),
    writeChunk("IEND", Buffer.alloc(0))
  ]);
}

// ../core/dist/tools/index.js
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
function encodePngFromRgbaResponse(response) {
  if (!response.data || response.width === void 0 || response.height === void 0) {
    throw new Error("Render response missing data, width, or height");
  }
  const rgbaBuffer = Buffer.from(response.data, "base64");
  return rgbaToPng(rgbaBuffer, response.width, response.height);
}
var RobloxStudioTools = class _RobloxStudioTools {
  client;
  bridge;
  openCloudClient;
  cookieClient;
  constructor(bridge) {
    this.client = new StudioHttpClient(bridge);
    this.bridge = bridge;
    this.openCloudClient = new OpenCloudClient();
    this.cookieClient = new RobloxCookieClient();
  }
  async getFileTree(path2 = "") {
    const response = await this.client.request("/api/file-tree", { path: path2 });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async searchFiles(query, searchType = "name") {
    const response = await this.client.request("/api/search-files", { query, searchType });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getPlaceInfo() {
    const response = await this.client.request("/api/place-info", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getServices(serviceName) {
    const response = await this.client.request("/api/services", { serviceName });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async searchObjects(query, searchType = "name", propertyName) {
    const response = await this.client.request("/api/search-objects", {
      query,
      searchType,
      propertyName
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getInstanceProperties(instancePath, excludeSource) {
    if (!instancePath) {
      throw new Error("Instance path is required for get_instance_properties");
    }
    const response = await this.client.request("/api/instance-properties", { instancePath, excludeSource });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getInstanceChildren(instancePath) {
    if (!instancePath) {
      throw new Error("Instance path is required for get_instance_children");
    }
    const response = await this.client.request("/api/instance-children", { instancePath });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async searchByProperty(propertyName, propertyValue) {
    if (!propertyName || !propertyValue) {
      throw new Error("Property name and value are required for search_by_property");
    }
    const response = await this.client.request("/api/search-by-property", {
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getClassInfo(className) {
    if (!className) {
      throw new Error("Class name is required for get_class_info");
    }
    const response = await this.client.request("/api/class-info", { className });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getProjectStructure(path2, maxDepth, scriptsOnly) {
    const response = await this.client.request("/api/project-structure", {
      path: path2,
      maxDepth,
      scriptsOnly
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async setProperty(instancePath, propertyName, propertyValue) {
    if (!instancePath || !propertyName) {
      throw new Error("Instance path and property name are required for set_property");
    }
    const response = await this.client.request("/api/set-property", {
      instancePath,
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async setProperties(instancePath, properties) {
    if (!instancePath || !properties) {
      throw new Error("instancePath and properties are required for set_properties");
    }
    const response = await this.client.request("/api/set-properties", { instancePath, properties });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async massSetProperty(paths, propertyName, propertyValue) {
    if (!paths || paths.length === 0 || !propertyName) {
      throw new Error("Paths array and property name are required for mass_set_property");
    }
    const response = await this.client.request("/api/mass-set-property", {
      paths,
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async massGetProperty(paths, propertyName) {
    if (!paths || paths.length === 0 || !propertyName) {
      throw new Error("Paths array and property name are required for mass_get_property");
    }
    const response = await this.client.request("/api/mass-get-property", {
      paths,
      propertyName
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async createObject(className, parent, name, properties) {
    if (!className || !parent) {
      throw new Error("Class name and parent are required for create_object");
    }
    const response = await this.client.request("/api/create-object", {
      className,
      parent,
      name,
      properties
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async createUITree(parentPath, tree) {
    if (!parentPath || !tree) {
      throw new Error("parentPath and tree are required for create_ui_tree");
    }
    const response = await this.client.request("/api/create-ui-tree", { parentPath, tree });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async massCreateObjects(objects) {
    if (!objects || objects.length === 0) {
      throw new Error("Objects array is required for mass_create_objects");
    }
    const hasProperties = objects.some((o) => o.properties && Object.keys(o.properties).length > 0);
    const endpoint = hasProperties ? "/api/mass-create-objects-with-properties" : "/api/mass-create-objects";
    const response = await this.client.request(endpoint, { objects });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async deleteObject(instancePath) {
    if (!instancePath) {
      throw new Error("Instance path is required for delete_object");
    }
    const response = await this.client.request("/api/delete-object", { instancePath });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async smartDuplicate(instancePath, count, options) {
    if (!instancePath || count < 1) {
      throw new Error("Instance path and count > 0 are required for smart_duplicate");
    }
    const response = await this.client.request("/api/smart-duplicate", {
      instancePath,
      count,
      options
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async massDuplicate(duplications) {
    if (!duplications || duplications.length === 0) {
      throw new Error("Duplications array is required for mass_duplicate");
    }
    const response = await this.client.request("/api/mass-duplicate", { duplications });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getScriptSource(instancePath, startLine, endLine) {
    if (!instancePath) {
      throw new Error("Instance path is required for get_script_source");
    }
    const response = await this.client.request("/api/get-script-source", { instancePath, startLine, endLine });
    if (response.error) {
      return { content: [{ type: "text", text: `Error: ${response.error}` }] };
    }
    const scriptTypeInfo = {
      "Script": "Server Script, runs on the server only",
      "LocalScript": "Local Script, runs on the client",
      "ModuleScript": "Module Script, shared library loaded via require()"
    };
    const serviceInfo = {
      "Workspace": "Workspace, 3D world replicated to all clients",
      "ServerScriptService": "ServerScriptService, server only",
      "ServerStorage": "ServerStorage, server only storage",
      "StarterGui": "StarterGui, UI templates copied to each player",
      "StarterPlayerScripts": "StarterPlayerScripts, client scripts",
      "StarterCharacterScripts": "StarterCharacterScripts, character scripts",
      "ReplicatedStorage": "ReplicatedStorage, shared server and client",
      "ReplicatedFirst": "ReplicatedFirst, first to load on client"
    };
    const pathStr = response.instancePath || instancePath;
    const pathSegments = pathStr.split(".");
    const topService = typeof response.topService === "string" && response.topService.length > 0 ? response.topService : pathSegments[0] === "game" ? pathSegments[1] ?? "game" : pathSegments[0];
    const typeNote = scriptTypeInfo[response.className] || response.className;
    const serviceNote = serviceInfo[topService] || topService;
    const headerLines = [
      `Path:     ${pathStr}`,
      `Type:     ${typeNote}`,
      `Location: ${serviceNote}`,
      `Lines:    ${response.lineCount} total${response.isPartial ? ` (showing ${response.startLine}-${response.endLine})` : ""}`
    ];
    if (response.enabled === false) {
      headerLines.push(`Status:   DISABLED`);
    }
    if (response.truncated) {
      headerLines.push(`Note:     Truncated to first 1000 lines, use startLine/endLine to read more`);
    }
    const header = headerLines.join("\n");
    const code = response.numberedSource || response.source;
    return {
      content: [{
        type: "text",
        text: `${header}

${code}`
      }]
    };
  }
  async setScriptSource(instancePath, source) {
    if (!instancePath || typeof source !== "string") {
      throw new Error("Instance path and source code string are required for set_script_source");
    }
    const response = await this.client.request("/api/set-script-source", { instancePath, source });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async editScriptLines(instancePath, oldString, newString) {
    if (!instancePath || typeof oldString !== "string" || typeof newString !== "string") {
      throw new Error("Instance path, old_string, and new_string are required for edit_script_lines");
    }
    const response = await this.client.request("/api/edit-script-lines", { instancePath, old_string: oldString, new_string: newString });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async insertScriptLines(instancePath, afterLine, newContent) {
    if (!instancePath || typeof newContent !== "string") {
      throw new Error("Instance path and newContent are required for insert_script_lines");
    }
    const response = await this.client.request("/api/insert-script-lines", { instancePath, afterLine: afterLine || 0, newContent });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async deleteScriptLines(instancePath, startLine, endLine) {
    if (!instancePath || !startLine || !endLine) {
      throw new Error("Instance path, startLine, and endLine are required for delete_script_lines");
    }
    const response = await this.client.request("/api/delete-script-lines", { instancePath, startLine, endLine });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async grepScripts(pattern, options) {
    if (!pattern) {
      throw new Error("Pattern is required for grep_scripts");
    }
    const response = await this.client.request("/api/grep-scripts", {
      pattern,
      ...options
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getAttribute(instancePath, attributeName) {
    if (!instancePath || !attributeName) {
      throw new Error("Instance path and attribute name are required for get_attribute");
    }
    const response = await this.client.request("/api/get-attribute", { instancePath, attributeName });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async setAttribute(instancePath, attributeName, attributeValue, valueType) {
    if (!instancePath || !attributeName) {
      throw new Error("Instance path and attribute name are required for set_attribute");
    }
    const response = await this.client.request("/api/set-attribute", { instancePath, attributeName, attributeValue, valueType });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getAttributes(instancePath) {
    if (!instancePath) {
      throw new Error("Instance path is required for get_attributes");
    }
    const response = await this.client.request("/api/get-attributes", { instancePath });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async deleteAttribute(instancePath, attributeName) {
    if (!instancePath || !attributeName) {
      throw new Error("Instance path and attribute name are required for delete_attribute");
    }
    const response = await this.client.request("/api/delete-attribute", { instancePath, attributeName });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getTags(instancePath) {
    if (!instancePath) {
      throw new Error("Instance path is required for get_tags");
    }
    const response = await this.client.request("/api/get-tags", { instancePath });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async addTag(instancePath, tagName) {
    if (!instancePath || !tagName) {
      throw new Error("Instance path and tag name are required for add_tag");
    }
    const response = await this.client.request("/api/add-tag", { instancePath, tagName });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async removeTag(instancePath, tagName) {
    if (!instancePath || !tagName) {
      throw new Error("Instance path and tag name are required for remove_tag");
    }
    const response = await this.client.request("/api/remove-tag", { instancePath, tagName });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getTagged(tagName) {
    if (!tagName) {
      throw new Error("Tag name is required for get_tagged");
    }
    const response = await this.client.request("/api/get-tagged", { tagName });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getSelection() {
    const response = await this.client.request("/api/get-selection", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async executeLuau(code, target) {
    if (!code) {
      throw new Error("Code is required for execute_luau");
    }
    const response = await this.client.request("/api/execute-luau", { code }, target || "edit");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async startPlaytest(mode, numPlayers) {
    if (mode !== "play" && mode !== "run") {
      throw new Error('mode must be "play" or "run"');
    }
    const data = { mode };
    if (numPlayers !== void 0) {
      data.numPlayers = numPlayers;
    }
    const response = await this.client.request("/api/start-playtest", data);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async stopPlaytest() {
    const response = await this.client.request("/api/stop-playtest", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getPlaytestOutput(target) {
    const response = await this.client.request("/api/get-playtest-output", {}, target || "edit");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getConnectedInstances() {
    const instances = this.bridge.getInstances();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ instances, count: instances.length })
        }
      ]
    };
  }
  async undo() {
    const response = await this.client.request("/api/undo", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async redo() {
    const response = await this.client.request("/api/redo", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async auditToolCoverage() {
    const response = await this.client.request("/api/audit-tool-coverage", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  static findProjectRoot(startDir) {
    let dir = path.resolve(startDir);
    while (true) {
      if (fs.existsSync(path.join(dir, ".git")) || fs.existsSync(path.join(dir, "package.json"))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir)
        return null;
      dir = parent;
    }
  }
  static isDirectory(candidate) {
    if (!candidate)
      return false;
    try {
      return fs.statSync(candidate).isDirectory();
    } catch {
      return false;
    }
  }
  static ensureWritableDirectory(candidate, label) {
    const resolved = path.resolve(candidate);
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch (error) {
      throw new Error(`Unable to create ${label} build-library directory at ${resolved}: ${error.message}`);
    }
    if (!_RobloxStudioTools.isDirectory(resolved)) {
      throw new Error(`${label} build-library path is not a directory: ${resolved}`);
    }
    try {
      fs.accessSync(resolved, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`${label} build-library directory is not writable: ${resolved}. ${error.message}`);
    }
    return resolved;
  }
  static _cachedLibraryPath;
  static findLibraryPath() {
    if (_RobloxStudioTools._cachedLibraryPath)
      return _RobloxStudioTools._cachedLibraryPath;
    const overridePath = process.env.ROBLOXSTUDIO_MCP_BUILD_LIBRARY || process.env.BUILD_LIBRARY_PATH;
    const cwd = path.resolve(process.cwd());
    const projectRoot = _RobloxStudioTools.findProjectRoot(cwd);
    const homeLibraryPath = path.join(os.homedir(), ".robloxstudio-mcp", "build-library");
    const projectLibraryPath = projectRoot ? path.join(projectRoot, "build-library") : null;
    const cwdLibraryPath = path.join(cwd, "build-library");
    let result;
    if (overridePath) {
      result = _RobloxStudioTools.ensureWritableDirectory(overridePath, "override");
    } else {
      const existing = [projectLibraryPath, cwdLibraryPath].find((c) => c && _RobloxStudioTools.isDirectory(c) && (() => {
        try {
          fs.accessSync(c, fs.constants.W_OK);
          return true;
        } catch {
          return false;
        }
      })());
      if (existing) {
        result = path.resolve(existing);
      } else if (projectLibraryPath) {
        try {
          result = _RobloxStudioTools.ensureWritableDirectory(projectLibraryPath, "project-root");
        } catch (err) {
          console.error(`Warning: could not create build-library at project root (${projectLibraryPath}): ${err.message}. Falling back to home directory.`);
          result = _RobloxStudioTools.ensureWritableDirectory(homeLibraryPath, "home");
        }
      } else {
        result = _RobloxStudioTools.ensureWritableDirectory(homeLibraryPath, "home");
      }
    }
    _RobloxStudioTools._cachedLibraryPath = result;
    return result;
  }
  async exportBuild(instancePath, outputId, style = "misc") {
    if (!instancePath) {
      throw new Error("Instance path is required for export_build");
    }
    const response = await this.client.request("/api/export-build", {
      instancePath,
      outputId,
      style
    });
    if (response && response.success && response.buildData) {
      const buildData = response.buildData;
      const buildId = buildData.id || `${style}/exported`;
      const filePath = path.join(_RobloxStudioTools.findLibraryPath(), `${buildId}.json`);
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));
      response.savedTo = filePath;
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  normalizePalette(palette) {
    if (!palette || typeof palette !== "object" || Array.isArray(palette)) {
      throw new Error("palette must be an object mapping keys to [BrickColor, Material] tuples");
    }
    const normalized = {};
    for (const [key, value] of Object.entries(palette)) {
      if (!Array.isArray(value) || value.length < 2) {
        throw new Error(`Palette key "${key}" must map to [BrickColor, Material]`);
      }
      normalized[key] = [String(value[0]), String(value[1])];
    }
    if (Object.keys(normalized).length === 0) {
      throw new Error("palette must contain at least one key");
    }
    return normalized;
  }
  normalizeBuildParts(parts, paletteKeys) {
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("parts must be a non-empty array");
    }
    const ALLOWED_SHAPES = /* @__PURE__ */ new Set(["Block", "Wedge", "Cylinder", "Ball", "CornerWedge"]);
    const normalized = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (Array.isArray(part)) {
        if (part.length < 10) {
          throw new Error(`Part ${i} must have at least 10 elements`);
        }
        const [px, py, pz, sx, sy, sz, rx, ry, rz, paletteKey, ...rest] = part;
        if (typeof paletteKey !== "string" || !paletteKeys.has(paletteKey)) {
          throw new Error(`Part ${i} references unknown palette key "${paletteKey}"`);
        }
        const tuple2 = [px, py, pz, sx, sy, sz, rx, ry, rz, paletteKey];
        if (rest[0] !== void 0) {
          if (!ALLOWED_SHAPES.has(rest[0]))
            throw new Error(`Part ${i} has invalid shape "${rest[0]}"`);
          tuple2.push(rest[0]);
        }
        if (rest[1] !== void 0) {
          if (!rest[0])
            tuple2.push("Block");
          tuple2.push(rest[1]);
        }
        normalized.push(tuple2);
        continue;
      }
      if (!part || typeof part !== "object") {
        throw new Error(`Part ${i} must be an array or object`);
      }
      const r = part;
      const position = r.position;
      const size = r.size;
      const rotation = r.rotation;
      const pk = r.paletteKey;
      if (!Array.isArray(position) || position.length !== 3)
        throw new Error(`Part ${i}: position must be [x,y,z]`);
      if (!Array.isArray(size) || size.length !== 3)
        throw new Error(`Part ${i}: size must be [x,y,z]`);
      if (!Array.isArray(rotation) || rotation.length !== 3)
        throw new Error(`Part ${i}: rotation must be [x,y,z]`);
      if (typeof pk !== "string" || !paletteKeys.has(pk))
        throw new Error(`Part ${i} references unknown palette key "${pk}"`);
      const tuple = [...position, ...size, ...rotation, pk];
      if (r.shape !== void 0) {
        if (!ALLOWED_SHAPES.has(r.shape))
          throw new Error(`Part ${i} has invalid shape "${r.shape}"`);
        tuple.push(r.shape);
      }
      if (r.transparency !== void 0) {
        if (!r.shape)
          tuple.push("Block");
        tuple.push(r.transparency);
      }
      normalized.push(tuple);
    }
    return normalized;
  }
  async createBuild(id, style, palette, parts, bounds) {
    if (!id) {
      throw new Error("id is required for create_build");
    }
    const normalizedPalette = this.normalizePalette(palette);
    const normalizedParts = this.normalizeBuildParts(parts, new Set(Object.keys(normalizedPalette)));
    const computedBounds = bounds || this.computeBounds(normalizedParts);
    const buildData = { id, style, bounds: computedBounds, palette: normalizedPalette, parts: normalizedParts };
    const filePath = path.join(_RobloxStudioTools.findLibraryPath(), `${id}.json`);
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            id,
            style,
            bounds: computedBounds,
            partCount: normalizedParts.length,
            paletteKeys: Object.keys(normalizedPalette),
            savedTo: filePath
          })
        }
      ]
    };
  }
  computeBounds(parts) {
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const p of parts) {
      const px = Math.abs(p[0]) + p[3] / 2;
      const py = Math.abs(p[1]) + p[4] / 2;
      const pz = Math.abs(p[2]) + p[5] / 2;
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
      maxZ = Math.max(maxZ, pz);
    }
    return [
      Math.round(maxX * 2 * 10) / 10,
      Math.round(maxY * 2 * 10) / 10,
      Math.round(maxZ * 2 * 10) / 10
    ];
  }
  async generateBuild(id, style, palette, code, seed) {
    if (!id || !palette || !code) {
      throw new Error("id, palette, and code are required for generate_build");
    }
    for (const [key, value] of Object.entries(palette)) {
      if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
        throw new Error(`Palette key "${key}" must map to [BrickColor, Material] or [BrickColor, Material, MaterialVariant]`);
      }
    }
    const result = runBuildExecutor(code, palette, seed);
    const buildData = {
      id,
      style,
      bounds: result.bounds,
      palette,
      parts: result.parts,
      generatorCode: code
    };
    if (seed !== void 0)
      buildData.generatorSeed = seed;
    const filePath = path.join(_RobloxStudioTools.findLibraryPath(), `${id}.json`);
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            id,
            style,
            bounds: result.bounds,
            partCount: result.partCount,
            paletteKeys: Object.keys(palette),
            savedTo: filePath
          })
        }
      ]
    };
  }
  async importBuild(buildData, targetPath, position) {
    if (!buildData || !targetPath) {
      throw new Error("buildData (or library ID string) and targetPath are required for import_build");
    }
    let resolved;
    if (typeof buildData === "string") {
      const filePath = path.join(_RobloxStudioTools.findLibraryPath(), `${buildData}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildData}`);
      }
      resolved = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } else if (buildData.id && !buildData.parts) {
      const filePath = path.join(_RobloxStudioTools.findLibraryPath(), `${buildData.id}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildData.id}`);
      }
      resolved = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } else {
      resolved = buildData;
    }
    const response = await this.client.request("/api/import-build", {
      buildData: resolved,
      targetPath,
      position
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async listLibrary(style) {
    const libraryPath = _RobloxStudioTools.findLibraryPath();
    const styles = style ? [style] : ["medieval", "modern", "nature", "scifi", "misc"];
    const builds = [];
    for (const s of styles) {
      const dirPath = path.join(libraryPath, s);
      if (!fs.existsSync(dirPath))
        continue;
      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
          const data = JSON.parse(content);
          builds.push({
            id: data.id || `${s}/${file.replace(".json", "")}`,
            style: data.style || s,
            bounds: data.bounds || [0, 0, 0],
            partCount: Array.isArray(data.parts) ? data.parts.length : 0
          });
        } catch {
        }
      }
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ builds, total: builds.length })
        }
      ]
    };
  }
  async searchMaterials(query, maxResults) {
    const response = await this.client.request("/api/search-materials", {
      query: query ?? "",
      maxResults: maxResults ?? 50
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  async getBuild(id) {
    if (!id) {
      throw new Error("Build ID is required for get_build");
    }
    const filePath = path.join(_RobloxStudioTools.findLibraryPath(), `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Build not found in library: ${id}`);
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const result = {
      id: data.id,
      style: data.style,
      bounds: data.bounds,
      partCount: Array.isArray(data.parts) ? data.parts.length : 0,
      paletteKeys: data.palette ? Object.keys(data.palette) : [],
      palette: data.palette
    };
    if (data.generatorCode) {
      result.generatorCode = data.generatorCode;
      result.generatorSeed = data.generatorSeed;
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result)
        }
      ]
    };
  }
  async importScene(sceneData, targetPath = "game.Workspace") {
    if (!sceneData) {
      throw new Error("sceneData is required for import_scene");
    }
    const libraryPath = _RobloxStudioTools.findLibraryPath();
    const expandedBuilds = [];
    const modelMap = sceneData.models || {};
    const placements = sceneData.place || [];
    const isVec3Tuple = (value) => {
      return Array.isArray(value) && value.length === 3 && value.every((component) => typeof component === "number" && Number.isFinite(component));
    };
    for (const [placementIndex, placement] of placements.entries()) {
      let modelKey;
      let position;
      let rotation;
      let validatedKeyPath;
      if (Array.isArray(placement)) {
        if (placement.length < 2 || placement.length > 3) {
          throw new Error(`Invalid sceneData.place[${placementIndex}]: expected [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]]`);
        }
        const [tupleModelKey, tuplePosition, tupleRotation] = placement;
        if (typeof tupleModelKey !== "string" || tupleModelKey.trim() === "") {
          throw new Error(`Invalid sceneData.place[${placementIndex}][0]: model key must be a non-empty string`);
        }
        modelKey = tupleModelKey.trim();
        validatedKeyPath = `sceneData.place[${placementIndex}][0]`;
        if (!isVec3Tuple(tuplePosition)) {
          throw new Error(`Invalid sceneData.place[${placementIndex}][1]: position must be a numeric [x,y,z] tuple`);
        }
        position = tuplePosition;
        if (tupleRotation !== void 0) {
          if (!isVec3Tuple(tupleRotation)) {
            throw new Error(`Invalid sceneData.place[${placementIndex}][2]: rotation must be a numeric [x,y,z] tuple when provided`);
          }
          rotation = tupleRotation;
        }
      } else if (placement && typeof placement === "object") {
        const placementRecord = placement;
        const objectModelKey = placementRecord.modelKey;
        const objectPosition = placementRecord.position;
        const objectRotation = placementRecord.rotation;
        if (typeof objectModelKey !== "string" || objectModelKey.trim() === "") {
          throw new Error(`Invalid sceneData.place[${placementIndex}].modelKey: model key must be a non-empty string`);
        }
        if (!isVec3Tuple(objectPosition)) {
          throw new Error(`Invalid sceneData.place[${placementIndex}].position: must be a numeric [x,y,z] tuple`);
        }
        if (objectRotation !== void 0 && !isVec3Tuple(objectRotation)) {
          throw new Error(`Invalid sceneData.place[${placementIndex}].rotation: must be a numeric [x,y,z] tuple when provided`);
        }
        modelKey = objectModelKey.trim();
        validatedKeyPath = `sceneData.place[${placementIndex}].modelKey`;
        position = objectPosition;
        rotation = objectRotation;
      } else {
        throw new Error(`Invalid sceneData.place[${placementIndex}]: expected an object placement or [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]] tuple`);
      }
      const buildId = modelMap[modelKey];
      if (!buildId) {
        throw new Error(`Invalid ${validatedKeyPath}: model key "${modelKey}" is not defined in sceneData.models`);
      }
      const filePath = path.join(libraryPath, `${buildId}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildId}`);
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const buildData = JSON.parse(content);
      const buildName = buildId.split("/").pop() || buildId;
      expandedBuilds.push({
        buildData,
        position,
        rotation: rotation || [0, 0, 0],
        name: buildName
      });
    }
    const customs = sceneData.custom || [];
    for (const custom of customs) {
      expandedBuilds.push({
        buildData: {
          palette: custom.palette,
          parts: custom.parts
        },
        position: custom.o || [0, 0, 0],
        rotation: [0, 0, 0],
        name: custom.n || "Custom"
      });
    }
    if (expandedBuilds.length === 0) {
      throw new Error("No builds to import \u2014 check model references and library");
    }
    const response = await this.client.request("/api/import-scene", {
      expandedBuilds,
      targetPath
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response)
        }
      ]
    };
  }
  // === Asset Tools ===
  async searchAssets(assetType, query, maxResults, sortBy, verifiedCreatorsOnly) {
    if (!this.openCloudClient.hasApiKey()) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: "ROBLOX_OPEN_CLOUD_API_KEY environment variable is not set. Set it to use Creator Store asset tools." })
        }]
      };
    }
    const response = await this.openCloudClient.searchAssets({
      searchCategoryType: assetType,
      query,
      maxPageSize: maxResults,
      sortCategory: sortBy,
      includeOnlyVerifiedCreators: verifiedCreatorsOnly
    });
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response)
      }]
    };
  }
  async getAssetDetails(assetId) {
    if (!assetId) {
      throw new Error("Asset ID is required for get_asset_details");
    }
    if (this.cookieClient.hasCookie() && !this.openCloudClient.hasApiKey()) {
      const results = await this.cookieClient.getAssetDetails([assetId]);
      const asset = results[0];
      if (!asset) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Asset not found or not owned by authenticated user" }) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(asset) }] };
    }
    if (!this.openCloudClient.hasApiKey()) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: "No auth configured. Set ROBLOSECURITY or ROBLOX_OPEN_CLOUD_API_KEY env var." })
        }]
      };
    }
    const response = await this.openCloudClient.getAssetDetails(assetId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response)
      }]
    };
  }
  async getAssetThumbnail(assetId, size) {
    if (!assetId) {
      throw new Error("Asset ID is required for get_asset_thumbnail");
    }
    if (!this.openCloudClient.hasApiKey()) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: "ROBLOX_OPEN_CLOUD_API_KEY environment variable is not set. Set it to use Creator Store asset tools." })
        }]
      };
    }
    const result = await this.openCloudClient.getAssetThumbnail(assetId, size);
    if (!result) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: "Thumbnail not available for this asset" })
        }]
      };
    }
    return {
      content: [{
        type: "image",
        data: result.base64,
        mimeType: result.mimeType
      }]
    };
  }
  async insertAsset(assetId, parentPath, position) {
    if (!assetId) {
      throw new Error("Asset ID is required for insert_asset");
    }
    const response = await this.client.request("/api/insert-asset", {
      assetId,
      parentPath: parentPath || "game.Workspace",
      position
    });
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response)
      }]
    };
  }
  async previewAsset(assetId, includeProperties, maxDepth) {
    if (!assetId) {
      throw new Error("Asset ID is required for preview_asset");
    }
    const response = await this.client.request("/api/preview-asset", {
      assetId,
      includeProperties: includeProperties ?? true,
      maxDepth: maxDepth ?? 10
    });
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response)
      }]
    };
  }
  async uploadDecal(filePath, displayName, description, userId, groupId) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    if (this.cookieClient.hasCookie()) {
      const result2 = await this.cookieClient.uploadDecal(fileContent, displayName, description || "");
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            done: true,
            response: {
              assetId: String(result2.assetId),
              displayName,
              assetType: "Decal",
              backingAssetId: String(result2.backingAssetId)
            }
          })
        }]
      };
    }
    if (!this.openCloudClient.hasApiKey()) {
      throw new Error("No auth configured for asset upload. Set ROBLOSECURITY env var (recommended) or ROBLOX_OPEN_CLOUD_API_KEY.");
    }
    const resolvedGroupId = groupId || process.env.ROBLOX_CREATOR_GROUP_ID;
    const resolvedUserId = userId || process.env.ROBLOX_CREATOR_USER_ID;
    if (!resolvedUserId && !resolvedGroupId) {
      throw new Error("Creator identity required for Open Cloud upload. Set ROBLOX_CREATOR_USER_ID or ROBLOX_CREATOR_GROUP_ID, or pass userId/groupId as parameters. Alternatively, set ROBLOSECURITY to use cookie auth instead.");
    }
    const creator = {};
    if (resolvedGroupId) {
      creator.groupId = resolvedGroupId;
    } else {
      creator.userId = resolvedUserId;
    }
    const result = await this.openCloudClient.createAsset({
      assetType: "Decal",
      displayName,
      description: description || "",
      creationContext: { creator }
    }, fileContent, fileName);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result)
      }]
    };
  }
  async simulateMouseInput(action, x, y, button, scrollDirection, target) {
    if (!action) {
      throw new Error("action is required for simulate_mouse_input");
    }
    const response = await this.client.request("/api/simulate-mouse-input", {
      action,
      x,
      y,
      button,
      scrollDirection
    }, target || "edit");
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response)
      }]
    };
  }
  async simulateKeyboardInput(keyCode, action, duration, target) {
    if (!keyCode) {
      throw new Error("keyCode is required for simulate_keyboard_input");
    }
    const response = await this.client.request("/api/simulate-keyboard-input", {
      keyCode,
      action,
      duration
    }, target || "edit");
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response)
      }]
    };
  }
  async characterNavigation(position, instancePath, waitForCompletion, timeout, target) {
    if (!position && !instancePath) {
      throw new Error("Either position or instancePath is required for character_navigation");
    }
    const response = await this.client.request("/api/character-navigation", {
      position,
      instancePath,
      waitForCompletion,
      timeout
    }, target || "edit");
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response)
      }]
    };
  }
  async cloneObject(instancePath, targetParentPath) {
    if (!instancePath || !targetParentPath) {
      throw new Error("instancePath and targetParentPath are required for clone_object");
    }
    const response = await this.client.request("/api/clone-object", { instancePath, targetParentPath });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async moveObject(instancePath, targetParentPath) {
    if (!instancePath || !targetParentPath) {
      throw new Error("instancePath and targetParentPath are required for move_object");
    }
    const response = await this.client.request("/api/move-object", { instancePath, targetParentPath });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async renameObject(instancePath, newName) {
    if (!instancePath || !newName) {
      throw new Error("instancePath and newName are required for rename_object");
    }
    const response = await this.client.request("/api/set-property", {
      instancePath,
      propertyName: "Name",
      propertyValue: newName
    });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async getDescendants(instancePath, maxDepth, classFilter) {
    if (!instancePath) {
      throw new Error("instancePath is required for get_descendants");
    }
    const response = await this.client.request("/api/get-descendants", { instancePath, maxDepth, classFilter });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async compareInstances(instancePathA, instancePathB) {
    if (!instancePathA || !instancePathB) {
      throw new Error("instancePathA and instancePathB are required for compare_instances");
    }
    const response = await this.client.request("/api/compare-instances", { instancePathA, instancePathB });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async getOutputLog(maxEntries, messageType) {
    const response = await this.client.request("/api/get-output-log", { maxEntries, messageType });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async getScriptAnalysis(instancePath) {
    if (!instancePath) {
      throw new Error("instancePath is required for get_script_analysis");
    }
    const response = await this.client.request("/api/get-script-analysis", { instancePath });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async bulkSetAttributes(instancePath, attributes) {
    if (!instancePath || !attributes) {
      throw new Error("instancePath and attributes are required for bulk_set_attributes");
    }
    const response = await this.client.request("/api/bulk-set-attributes", { instancePath, attributes });
    return { content: [{ type: "text", text: JSON.stringify(response) }] };
  }
  async findAndReplaceInScripts(pattern, replacement, options) {
    if (!pattern) {
      throw new Error("pattern is required for find_and_replace_in_scripts");
    }
    if (replacement === void 0 || replacement === null) {
      throw new Error("replacement is required for find_and_replace_in_scripts");
    }
    const response = await this.client.request("/api/find-and-replace-in-scripts", {
      pattern,
      replacement,
      ...options
    });
    return {
      content: [{
        type: "text",
        text: JSON.stringify(response)
      }]
    };
  }
  async captureScreenshot() {
    const response = await this.client.request("/api/capture-screenshot", {});
    if (response.error) {
      return {
        content: [{
          type: "text",
          text: response.error
        }]
      };
    }
    const pngBuffer = encodePngFromRgbaResponse(response);
    return {
      content: [{
        type: "image",
        data: pngBuffer.toString("base64"),
        mimeType: "image/png"
      }]
    };
  }
};

// ../core/dist/bridge-service.js
import { v4 as uuidv4 } from "uuid";
var STALE_INSTANCE_MS = 3e4;
var BridgeService = class {
  pendingRequests = /* @__PURE__ */ new Map();
  instances = /* @__PURE__ */ new Map();
  nextClientIndex = 1;
  requestTimeout = 3e4;
  registerInstance(instanceId, role) {
    let assignedRole = role;
    if (role === "client") {
      assignedRole = `client-${this.nextClientIndex}`;
      this.nextClientIndex++;
    }
    this.instances.set(instanceId, {
      instanceId,
      role: assignedRole,
      lastActivity: Date.now(),
      connectedAt: Date.now()
    });
    return assignedRole;
  }
  unregisterInstance(instanceId) {
    this.instances.delete(instanceId);
    for (const [id, req] of this.pendingRequests.entries()) {
      const targetRole = req.target;
      const hasHandler = Array.from(this.instances.values()).some((i) => i.role === targetRole);
      if (!hasHandler) {
        clearTimeout(req.timeoutId);
        this.pendingRequests.delete(id);
        req.reject(new Error(`Target instance "${targetRole}" disconnected`));
      }
    }
  }
  getInstances() {
    return Array.from(this.instances.values());
  }
  getPendingRequestCount() {
    return this.pendingRequests.size;
  }
  updateInstanceActivity(instanceId) {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.lastActivity = Date.now();
    }
  }
  cleanupStaleInstances() {
    const now = Date.now();
    for (const [id, inst] of this.instances.entries()) {
      if (now - inst.lastActivity > STALE_INSTANCE_MS) {
        this.unregisterInstance(id);
      }
    }
  }
  async sendRequest(endpoint, data, target = "edit") {
    const requestId = uuidv4();
    return new Promise((resolve2, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error("Request timeout"));
        }
      }, this.requestTimeout);
      const request = {
        id: requestId,
        endpoint,
        data,
        target,
        timestamp: Date.now(),
        resolve: resolve2,
        reject,
        timeoutId
      };
      this.pendingRequests.set(requestId, request);
    });
  }
  getPendingRequest(callerRole = "edit") {
    let oldestRequest = null;
    for (const request of this.pendingRequests.values()) {
      if (request.target !== callerRole)
        continue;
      if (!oldestRequest || request.timestamp < oldestRequest.timestamp) {
        oldestRequest = request;
      }
    }
    if (oldestRequest) {
      return {
        requestId: oldestRequest.id,
        request: {
          endpoint: oldestRequest.endpoint,
          data: oldestRequest.data
        }
      };
    }
    return null;
  }
  resolveRequest(requestId, response) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      clearTimeout(request.timeoutId);
      this.pendingRequests.delete(requestId);
      request.resolve(response);
    }
  }
  rejectRequest(requestId, error) {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      clearTimeout(request.timeoutId);
      this.pendingRequests.delete(requestId);
      request.reject(error);
    }
  }
  cleanupOldRequests() {
    const now = Date.now();
    for (const [id, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.requestTimeout) {
        clearTimeout(request.timeoutId);
        this.pendingRequests.delete(id);
        request.reject(new Error("Request timeout"));
      }
    }
  }
  clearAllPendingRequests() {
    for (const [, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeoutId);
      request.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
  }
};

// ../core/dist/proxy-bridge-service.js
import { v4 as uuidv42 } from "uuid";
var ProxyBridgeService = class extends BridgeService {
  primaryBaseUrl;
  proxyInstanceId;
  proxyRequestTimeout = 3e4;
  constructor(primaryBaseUrl) {
    super();
    this.primaryBaseUrl = primaryBaseUrl;
    this.proxyInstanceId = uuidv42();
  }
  async sendRequest(endpoint, data, target = "edit") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.proxyRequestTimeout);
    try {
      const response = await fetch(`${this.primaryBaseUrl}/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, data, target, proxyInstanceId: this.proxyInstanceId }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Proxy request failed (${response.status}): ${body}`);
      }
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      return result.response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Proxy request timeout");
      }
      throw err;
    }
  }
  cleanupOldRequests() {
  }
  clearAllPendingRequests() {
  }
};

// ../core/dist/server.js
var RobloxStudioMCPServer = class {
  server;
  tools;
  bridge;
  allowedToolNames;
  config;
  constructor(config) {
    this.config = config;
    this.allowedToolNames = new Set(config.tools.map((t) => t.name));
    this.server = new Server2({
      name: config.name,
      version: config.version
    }, {
      capabilities: {
        tools: {}
      }
    });
    this.bridge = new BridgeService();
    this.tools = new RobloxStudioTools(this.bridge);
    this.setupToolHandlers();
  }
  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema2, async () => {
      return {
        tools: this.config.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema
        }))
      };
    });
    this.server.setRequestHandler(CallToolRequestSchema2, async (request) => {
      const { name, arguments: args } = request.params;
      if (!this.allowedToolNames.has(name)) {
        throw new McpError2(ErrorCode2.MethodNotFound, `Unknown tool: ${name}`);
      }
      try {
        switch (name) {
          case "get_file_tree":
            return await this.tools.getFileTree(args?.path || "");
          case "search_files":
            return await this.tools.searchFiles(args?.query, args?.searchType || "name");
          case "get_place_info":
            return await this.tools.getPlaceInfo();
          case "get_services":
            return await this.tools.getServices(args?.serviceName);
          case "search_objects":
            return await this.tools.searchObjects(args?.query, args?.searchType || "name", args?.propertyName);
          case "get_instance_properties":
            return await this.tools.getInstanceProperties(args?.instancePath, args?.excludeSource);
          case "get_instance_children":
            return await this.tools.getInstanceChildren(args?.instancePath);
          case "search_by_property":
            return await this.tools.searchByProperty(args?.propertyName, args?.propertyValue);
          case "get_class_info":
            return await this.tools.getClassInfo(args?.className);
          case "get_project_structure":
            return await this.tools.getProjectStructure(args?.path, args?.maxDepth, args?.scriptsOnly);
          case "set_property":
            return await this.tools.setProperty(args?.instancePath, args?.propertyName, args?.propertyValue);
          case "set_properties":
            return await this.tools.setProperties(args?.instancePath, args?.properties);
          case "mass_set_property":
            return await this.tools.massSetProperty(args?.paths, args?.propertyName, args?.propertyValue);
          case "mass_get_property":
            return await this.tools.massGetProperty(args?.paths, args?.propertyName);
          case "create_object":
            return await this.tools.createObject(args?.className, args?.parent, args?.name, args?.properties);
          case "create_ui_tree":
            return await this.tools.createUITree(args?.parentPath, args?.tree);
          case "mass_create_objects":
            return await this.tools.massCreateObjects(args?.objects);
          case "delete_object":
            return await this.tools.deleteObject(args?.instancePath);
          case "smart_duplicate":
            return await this.tools.smartDuplicate(args?.instancePath, args?.count, args?.options);
          case "mass_duplicate":
            return await this.tools.massDuplicate(args?.duplications);
          case "grep_scripts":
            return await this.tools.grepScripts(args?.pattern, {
              caseSensitive: args?.caseSensitive,
              usePattern: args?.usePattern,
              contextLines: args?.contextLines,
              maxResults: args?.maxResults,
              maxResultsPerScript: args?.maxResultsPerScript,
              filesOnly: args?.filesOnly,
              path: args?.path,
              classFilter: args?.classFilter
            });
          case "get_script_source":
            return await this.tools.getScriptSource(args?.instancePath, args?.startLine, args?.endLine);
          case "set_script_source":
            return await this.tools.setScriptSource(args?.instancePath, args?.source);
          case "edit_script_lines":
            return await this.tools.editScriptLines(args?.instancePath, args?.old_string, args?.new_string);
          case "insert_script_lines":
            return await this.tools.insertScriptLines(args?.instancePath, args?.afterLine, args?.newContent);
          case "delete_script_lines":
            return await this.tools.deleteScriptLines(args?.instancePath, args?.startLine, args?.endLine);
          case "get_attribute":
            return await this.tools.getAttribute(args?.instancePath, args?.attributeName);
          case "set_attribute":
            return await this.tools.setAttribute(args?.instancePath, args?.attributeName, args?.attributeValue, args?.valueType);
          case "get_attributes":
            return await this.tools.getAttributes(args?.instancePath);
          case "delete_attribute":
            return await this.tools.deleteAttribute(args?.instancePath, args?.attributeName);
          case "get_tags":
            return await this.tools.getTags(args?.instancePath);
          case "add_tag":
            return await this.tools.addTag(args?.instancePath, args?.tagName);
          case "remove_tag":
            return await this.tools.removeTag(args?.instancePath, args?.tagName);
          case "get_tagged":
            return await this.tools.getTagged(args?.tagName);
          case "get_selection":
            return await this.tools.getSelection();
          case "execute_luau":
            return await this.tools.executeLuau(args?.code, args?.target);
          case "start_playtest":
            return await this.tools.startPlaytest(args?.mode, args?.numPlayers);
          case "stop_playtest":
            return await this.tools.stopPlaytest();
          case "get_playtest_output":
            return await this.tools.getPlaytestOutput(args?.target);
          case "get_connected_instances":
            return await this.tools.getConnectedInstances();
          case "export_build":
            return await this.tools.exportBuild(args?.instancePath, args?.outputId, args?.style);
          case "create_build":
            return await this.tools.createBuild(args?.id, args?.style, args?.palette, args?.parts, args?.bounds);
          case "generate_build":
            return await this.tools.generateBuild(args?.id, args?.style, args?.palette, args?.code, args?.seed);
          case "import_build":
            return await this.tools.importBuild(args?.buildData, args?.targetPath, args?.position);
          case "list_library":
            return await this.tools.listLibrary(args?.style);
          case "search_materials":
            return await this.tools.searchMaterials(args?.query, args?.maxResults);
          case "get_build":
            return await this.tools.getBuild(args?.id);
          case "import_scene":
            return await this.tools.importScene(args?.sceneData, args?.targetPath);
          case "undo":
            return await this.tools.undo();
          case "redo":
            return await this.tools.redo();
          case "audit_tool_coverage":
            return await this.tools.auditToolCoverage();
          case "search_assets":
            return await this.tools.searchAssets(args?.assetType, args?.query, args?.maxResults, args?.sortBy, args?.verifiedCreatorsOnly);
          case "get_asset_details":
            return await this.tools.getAssetDetails(args?.assetId);
          case "get_asset_thumbnail":
            return await this.tools.getAssetThumbnail(args?.assetId, args?.size);
          case "insert_asset":
            return await this.tools.insertAsset(args?.assetId, args?.parentPath, args?.position);
          case "preview_asset":
            return await this.tools.previewAsset(args?.assetId, args?.includeProperties, args?.maxDepth);
          case "upload_decal":
            return await this.tools.uploadDecal(args?.filePath, args?.displayName, args?.description, args?.userId, args?.groupId);
          case "clone_object":
            return await this.tools.cloneObject(args?.instancePath, args?.targetParentPath);
          case "move_object":
            return await this.tools.moveObject(args?.instancePath, args?.targetParentPath);
          case "rename_object":
            return await this.tools.renameObject(args?.instancePath, args?.newName);
          case "get_descendants":
            return await this.tools.getDescendants(args?.instancePath, args?.maxDepth, args?.classFilter);
          case "compare_instances":
            return await this.tools.compareInstances(args?.instancePathA, args?.instancePathB);
          case "get_output_log":
            return await this.tools.getOutputLog(args?.maxEntries, args?.messageType);
          case "get_script_analysis":
            return await this.tools.getScriptAnalysis(args?.instancePath);
          case "bulk_set_attributes":
            return await this.tools.bulkSetAttributes(args?.instancePath, args?.attributes);
          case "capture_screenshot":
            return await this.tools.captureScreenshot();
          case "simulate_mouse_input":
            return await this.tools.simulateMouseInput(args?.action, args?.x, args?.y, args?.button, args?.scrollDirection, args?.target);
          case "simulate_keyboard_input":
            return await this.tools.simulateKeyboardInput(args?.keyCode, args?.action, args?.duration, args?.target);
          case "character_navigation":
            return await this.tools.characterNavigation(args?.position, args?.instancePath, args?.waitForCompletion, args?.timeout, args?.target);
          case "find_and_replace_in_scripts":
            return await this.tools.findAndReplaceInScripts(args?.pattern, args?.replacement, {
              caseSensitive: args?.caseSensitive,
              usePattern: args?.usePattern,
              path: args?.path,
              classFilter: args?.classFilter,
              dryRun: args?.dryRun,
              maxReplacements: args?.maxReplacements
            });
          default:
            throw new McpError2(ErrorCode2.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError2)
          throw error;
        throw new McpError2(ErrorCode2.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }
  async run() {
    const basePort = process.env.ROBLOX_STUDIO_PORT ? parseInt(process.env.ROBLOX_STUDIO_PORT) : 58741;
    const host = process.env.ROBLOX_STUDIO_HOST || "0.0.0.0";
    let bridgeMode = "primary";
    let httpHandle;
    let primaryApp;
    let boundPort = 0;
    let promotionInterval;
    try {
      primaryApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames, this.config);
      const result = await listenWithRetry(primaryApp, host, basePort, 5);
      httpHandle = result.server;
      boundPort = result.port;
      console.error(`HTTP server listening on ${host}:${boundPort} for Studio plugin (primary mode)`);
      console.error(`Streamable HTTP MCP endpoint: http://localhost:${boundPort}/mcp`);
    } catch {
      bridgeMode = "proxy";
      primaryApp = void 0;
      const proxyBridge = new ProxyBridgeService(`http://localhost:${basePort}`);
      this.bridge = proxyBridge;
      this.tools = new RobloxStudioTools(this.bridge);
      console.error(`All ports ${basePort}-${basePort + 4} in use \u2014 entering proxy mode (forwarding to localhost:${basePort})`);
      const promotionIntervalMs = parseInt(process.env.ROBLOX_STUDIO_PROXY_PROMOTION_INTERVAL_MS || "5000");
      promotionInterval = setInterval(async () => {
        try {
          this.bridge = new BridgeService();
          this.tools = new RobloxStudioTools(this.bridge);
          primaryApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames, this.config);
          const result = await listenWithRetry(primaryApp, host, basePort, 5);
          httpHandle = result.server;
          boundPort = result.port;
          bridgeMode = "primary";
          primaryApp.setMCPServerActive(true);
          console.error(`Promoted from proxy to primary on port ${boundPort}`);
          if (promotionInterval)
            clearInterval(promotionInterval);
        } catch {
          this.bridge = new ProxyBridgeService(`http://localhost:${basePort}`);
          this.tools = new RobloxStudioTools(this.bridge);
          primaryApp = void 0;
        }
      }, promotionIntervalMs);
    }
    const LEGACY_PORT = 3002;
    let legacyHandle;
    let legacyApp;
    if (boundPort !== LEGACY_PORT && bridgeMode === "primary") {
      legacyApp = createHttpServer(this.tools, this.bridge, this.allowedToolNames, this.config);
      try {
        const result = await listenWithRetry(legacyApp, host, LEGACY_PORT, 1);
        legacyHandle = result.server;
        console.error(`Legacy HTTP server also listening on ${host}:${LEGACY_PORT} for old plugins`);
        legacyApp.setMCPServerActive(true);
      } catch {
        console.error(`Legacy port ${LEGACY_PORT} in use, skipping backward-compat listener`);
      }
    }
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${this.config.name} v${this.config.version} running on stdio`);
    if (primaryApp) {
      primaryApp.setMCPServerActive(true);
    }
    console.error(bridgeMode === "primary" ? "MCP server marked as active (primary mode)" : "MCP server active in proxy mode \u2014 forwarding requests to primary");
    console.error("Waiting for Studio plugin to connect...");
    const activityInterval = setInterval(() => {
      if (primaryApp)
        primaryApp.trackMCPActivity();
      if (legacyApp)
        legacyApp.trackMCPActivity();
      if (bridgeMode === "primary" && primaryApp) {
        const pluginConnected = primaryApp.isPluginConnected();
        const mcpActive = primaryApp.isMCPServerActive();
        if (pluginConnected && mcpActive) {
        } else if (pluginConnected && !mcpActive) {
          console.error("Studio plugin connected, but MCP server inactive");
        } else if (!pluginConnected && mcpActive) {
          console.error("MCP server active, waiting for Studio plugin...");
        } else {
          console.error("Waiting for connections...");
        }
      }
    }, 5e3);
    const cleanupInterval = setInterval(() => {
      this.bridge.cleanupOldRequests();
      this.bridge.cleanupStaleInstances();
    }, 5e3);
    const shutdown = async () => {
      console.error("Shutting down MCP server...");
      clearInterval(activityInterval);
      clearInterval(cleanupInterval);
      if (promotionInterval)
        clearInterval(promotionInterval);
      await this.server.close().catch(() => {
      });
      if (httpHandle)
        httpHandle.close();
      if (legacyHandle)
        legacyHandle.close();
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    process.on("SIGHUP", shutdown);
    process.stdin.on("end", shutdown);
    process.stdin.on("close", shutdown);
  }
};

// ../core/dist/tools/definitions.js
var TOOL_DEFINITIONS = [
  // === File & Instance Browsing ===
  {
    name: "get_file_tree",
    category: "read",
    description: "Get instance hierarchy tree from Studio",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Root path (default: game root)"
        }
      }
    }
  },
  {
    name: "search_files",
    category: "read",
    description: "Search instances by name, class, or script content",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Name, class, or code pattern"
        },
        searchType: {
          type: "string",
          enum: ["name", "type", "content"],
          description: "Search mode (default: name)"
        }
      },
      required: ["query"]
    }
  },
  // === Place & Service Info ===
  {
    name: "get_place_info",
    category: "read",
    description: "Get place ID, name, and game settings",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_services",
    category: "read",
    description: "Get available services and their children",
    inputSchema: {
      type: "object",
      properties: {
        serviceName: {
          type: "string",
          description: "Specific service name"
        }
      }
    }
  },
  {
    name: "search_objects",
    category: "read",
    description: "Find instances by name, class, or properties",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        },
        searchType: {
          type: "string",
          enum: ["name", "class", "property"],
          description: "Search mode (default: name)"
        },
        propertyName: {
          type: "string",
          description: 'Property name when searchType is "property"'
        }
      },
      required: ["query"]
    }
  },
  // === Instance Inspection ===
  {
    name: "get_instance_properties",
    category: "read",
    description: "Get all properties of an instance",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        },
        excludeSource: {
          type: "boolean",
          description: "For scripts, return SourceLength/LineCount instead of full source (default: false)"
        }
      },
      required: ["instancePath"]
    }
  },
  {
    name: "get_instance_children",
    category: "read",
    description: "Get children and their class types",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        }
      },
      required: ["instancePath"]
    }
  },
  {
    name: "search_by_property",
    category: "read",
    description: "Find objects with specific property values",
    inputSchema: {
      type: "object",
      properties: {
        propertyName: {
          type: "string",
          description: "Property name"
        },
        propertyValue: {
          type: "string",
          description: "Value to match"
        }
      },
      required: ["propertyName", "propertyValue"]
    }
  },
  {
    name: "get_class_info",
    category: "read",
    description: "Get properties/methods for a class",
    inputSchema: {
      type: "object",
      properties: {
        className: {
          type: "string",
          description: "Roblox class name"
        }
      },
      required: ["className"]
    }
  },
  // === Project Structure ===
  {
    name: "get_project_structure",
    category: "read",
    description: "Get full game hierarchy tree. Increase maxDepth (default 3) for deeper traversal.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Root path (default: workspace root)"
        },
        maxDepth: {
          type: "number",
          description: "Max traversal depth (default: 3)"
        },
        scriptsOnly: {
          type: "boolean",
          description: "Show only scripts (default: false)"
        }
      }
    }
  },
  // === Property Write ===
  {
    name: "set_property",
    category: "write",
    description: "Set a property on an instance",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        },
        propertyName: {
          type: "string",
          description: "Property name"
        },
        propertyValue: {
          description: "Value to set (string, number, boolean, or object for Vector3/Color3/UDim2)"
        }
      },
      required: ["instancePath", "propertyName", "propertyValue"]
    }
  },
  {
    name: "mass_set_property",
    category: "write",
    description: "Set a property on multiple instances",
    inputSchema: {
      type: "object",
      properties: {
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Instance paths"
        },
        propertyName: {
          type: "string",
          description: "Property name"
        },
        propertyValue: {
          description: "Value to set (string, number, boolean, or object for Vector3/Color3/UDim2)"
        }
      },
      required: ["paths", "propertyName", "propertyValue"]
    }
  },
  {
    name: "mass_get_property",
    category: "read",
    description: "Get a property from multiple instances",
    inputSchema: {
      type: "object",
      properties: {
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Instance paths"
        },
        propertyName: {
          type: "string",
          description: "Property name"
        }
      },
      required: ["paths", "propertyName"]
    }
  },
  {
    name: "set_properties",
    category: "write",
    description: "Set multiple properties on a single instance in one call.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path"
        },
        properties: {
          type: "object",
          description: "Map of property name to value"
        }
      },
      required: ["instancePath", "properties"]
    }
  },
  // === Object Creation/Deletion ===
  {
    name: "create_object",
    category: "write",
    description: "Create a new instance. Optionally set properties on creation.",
    inputSchema: {
      type: "object",
      properties: {
        className: {
          type: "string",
          description: "Roblox class name"
        },
        parent: {
          type: "string",
          description: "Parent instance path"
        },
        name: {
          type: "string",
          description: "Optional name"
        },
        properties: {
          type: "object",
          description: "Properties to set on creation"
        }
      },
      required: ["className", "parent"]
    }
  },
  {
    name: "create_ui_tree",
    category: "write",
    description: "Create an entire instance hierarchy from a nested JSON tree in one call.",
    inputSchema: {
      type: "object",
      properties: {
        parentPath: {
          type: "string",
          description: "Parent instance path"
        },
        tree: {
          type: "object",
          description: "Root node: { className: string, name?: string, properties?: { prop: value }, children?: [node, ...] }",
          properties: {
            className: { type: "string", description: "Roblox class name" },
            name: { type: "string", description: "Instance name" },
            properties: { type: "object", description: "Property name to value map" },
            children: {
              type: "array",
              description: "Child nodes with same structure",
              items: { type: "object" }
            }
          },
          required: ["className"]
        }
      },
      required: ["parentPath", "tree"]
    }
  },
  {
    name: "mass_create_objects",
    category: "write",
    description: "Create multiple instances. Each can have optional properties.",
    inputSchema: {
      type: "object",
      properties: {
        objects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              className: {
                type: "string",
                description: "Roblox class name"
              },
              parent: {
                type: "string",
                description: "Parent instance path"
              },
              name: {
                type: "string",
                description: "Optional name"
              },
              properties: {
                type: "object",
                description: "Properties to set on creation"
              }
            },
            required: ["className", "parent"]
          },
          description: "Objects to create"
        }
      },
      required: ["objects"]
    }
  },
  {
    name: "delete_object",
    category: "write",
    description: "Delete an instance",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        }
      },
      required: ["instancePath"]
    }
  },
  // === Duplication ===
  {
    name: "smart_duplicate",
    category: "write",
    description: "Duplicate with naming, positioning, and property variations",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        },
        count: {
          type: "number",
          description: "Number of duplicates"
        },
        options: {
          type: "object",
          properties: {
            namePattern: {
              type: "string",
              description: "Name pattern ({n} placeholder)"
            },
            positionOffset: {
              type: "array",
              items: { type: "number" },
              description: "X, Y, Z offset per duplicate"
            },
            rotationOffset: {
              type: "array",
              items: { type: "number" },
              description: "X, Y, Z rotation offset"
            },
            scaleOffset: {
              type: "array",
              items: { type: "number" },
              description: "X, Y, Z scale multiplier"
            },
            propertyVariations: {
              type: "object",
              description: "Property name to array of values"
            },
            targetParents: {
              type: "array",
              items: { type: "string" },
              description: "Different parent per duplicate"
            }
          }
        }
      },
      required: ["instancePath", "count"]
    }
  },
  {
    name: "mass_duplicate",
    category: "write",
    description: "Batch smart_duplicate operations",
    inputSchema: {
      type: "object",
      properties: {
        duplications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              instancePath: {
                type: "string",
                description: "Instance path (dot notation)"
              },
              count: {
                type: "number",
                description: "Number of duplicates"
              },
              options: {
                type: "object",
                properties: {
                  namePattern: {
                    type: "string",
                    description: "Name pattern ({n} placeholder)"
                  },
                  positionOffset: {
                    type: "array",
                    items: { type: "number" },
                    description: "X, Y, Z offset per duplicate"
                  },
                  rotationOffset: {
                    type: "array",
                    items: { type: "number" },
                    description: "X, Y, Z rotation offset"
                  },
                  scaleOffset: {
                    type: "array",
                    items: { type: "number" },
                    description: "X, Y, Z scale multiplier"
                  },
                  propertyVariations: {
                    type: "object",
                    description: "Property name to array of values"
                  },
                  targetParents: {
                    type: "array",
                    items: { type: "string" },
                    description: "Different parent per duplicate"
                  }
                }
              }
            },
            required: ["instancePath", "count"]
          },
          description: "Duplication operations"
        }
      },
      required: ["duplications"]
    }
  },
  // === Calculated/Relative Properties ===
  // === Script Read/Write ===
  {
    name: "get_script_source",
    category: "read",
    description: 'Get script source. Returns "source" and "numberedSource" (line-numbered). Use startLine/endLine for large scripts.',
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Script instance path"
        },
        startLine: {
          type: "number",
          description: "Start line (1-indexed)"
        },
        endLine: {
          type: "number",
          description: "End line (inclusive)"
        }
      },
      required: ["instancePath"]
    }
  },
  {
    name: "set_script_source",
    category: "write",
    description: "Replace entire script source. For partial edits use edit/insert/delete_script_lines.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Script instance path"
        },
        source: {
          type: "string",
          description: "New source code"
        }
      },
      required: ["instancePath", "source"]
    }
  },
  {
    name: "edit_script_lines",
    category: "write",
    description: "Replace exact text in a script. old_string must match exactly once in the script (whitespace-sensitive). Use get_script_source first to see current content.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Script instance path"
        },
        old_string: {
          type: "string",
          description: "Exact text to find and replace (must be unique in the script)"
        },
        new_string: {
          type: "string",
          description: "Replacement text"
        }
      },
      required: ["instancePath", "old_string", "new_string"]
    }
  },
  {
    name: "insert_script_lines",
    category: "write",
    description: "Insert lines after a given line number (0 = beginning).",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Script instance path"
        },
        afterLine: {
          type: "number",
          description: "Insert after this line (0 = beginning)"
        },
        newContent: {
          type: "string",
          description: "Content to insert"
        }
      },
      required: ["instancePath", "newContent"]
    }
  },
  {
    name: "delete_script_lines",
    category: "write",
    description: "Delete a range of lines. 1-indexed, inclusive.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Script instance path"
        },
        startLine: {
          type: "number",
          description: "Start line (1-indexed)"
        },
        endLine: {
          type: "number",
          description: "End line (inclusive)"
        }
      },
      required: ["instancePath", "startLine", "endLine"]
    }
  },
  // === Attributes ===
  {
    name: "get_attribute",
    category: "read",
    description: "Get an attribute value",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        },
        attributeName: {
          type: "string",
          description: "Attribute name"
        }
      },
      required: ["instancePath", "attributeName"]
    }
  },
  {
    name: "set_attribute",
    category: "write",
    description: "Set an attribute. Supports primitives, Vector3, Color3, UDim2, BrickColor.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        },
        attributeName: {
          type: "string",
          description: "Attribute name"
        },
        attributeValue: {
          description: "Value (string, number, boolean, or object for Vector3/Color3/UDim2)"
        },
        valueType: {
          type: "string",
          description: "Type hint if needed"
        }
      },
      required: ["instancePath", "attributeName", "attributeValue"]
    }
  },
  {
    name: "get_attributes",
    category: "read",
    description: "Get all attributes on an instance",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        }
      },
      required: ["instancePath"]
    }
  },
  {
    name: "delete_attribute",
    category: "write",
    description: "Delete an attribute",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        },
        attributeName: {
          type: "string",
          description: "Attribute name"
        }
      },
      required: ["instancePath", "attributeName"]
    }
  },
  // === Tags ===
  {
    name: "get_tags",
    category: "read",
    description: "Get all tags on an instance",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        }
      },
      required: ["instancePath"]
    }
  },
  {
    name: "add_tag",
    category: "write",
    description: "Add a tag",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        },
        tagName: {
          type: "string",
          description: "Tag name"
        }
      },
      required: ["instancePath", "tagName"]
    }
  },
  {
    name: "remove_tag",
    category: "write",
    description: "Remove a tag",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path (dot notation)"
        },
        tagName: {
          type: "string",
          description: "Tag name"
        }
      },
      required: ["instancePath", "tagName"]
    }
  },
  {
    name: "get_tagged",
    category: "read",
    description: "Get all instances with a specific tag",
    inputSchema: {
      type: "object",
      properties: {
        tagName: {
          type: "string",
          description: "Tag name"
        }
      },
      required: ["tagName"]
    }
  },
  // === Selection ===
  {
    name: "get_selection",
    category: "read",
    description: "Get all currently selected objects",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  // === Luau Execution ===
  {
    name: "execute_luau",
    category: "write",
    description: "Execute Luau code in plugin context. Use print()/warn() for output. Return value is captured.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Luau code to execute"
        },
        target: {
          type: "string",
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      },
      required: ["code"]
    }
  },
  // === Script Search ===
  {
    name: "grep_scripts",
    category: "read",
    description: "Ripgrep-inspired search across all script sources. Supports literal and Lua pattern matching, context lines, early termination, and results grouped by script with line/column numbers.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Search pattern (literal string or Lua pattern)"
        },
        caseSensitive: {
          type: "boolean",
          description: "Case-sensitive search (default: false)"
        },
        usePattern: {
          type: "boolean",
          description: "Use Lua pattern matching instead of literal (default: false)"
        },
        contextLines: {
          type: "number",
          description: "Number of context lines before/after each match (default: 0)"
        },
        maxResults: {
          type: "number",
          description: "Max total matches before stopping (default: 100)"
        },
        maxResultsPerScript: {
          type: "number",
          description: "Max matches per script (like rg -m)"
        },
        filesOnly: {
          type: "boolean",
          description: "Only return matching script paths, not line details (default: false)"
        },
        path: {
          type: "string",
          description: 'Subtree to search (e.g. "game.ServerScriptService")'
        },
        classFilter: {
          type: "string",
          enum: ["Script", "LocalScript", "ModuleScript"],
          description: "Only search scripts of this class type"
        }
      },
      required: ["pattern"]
    }
  },
  // === Playtest ===
  {
    name: "start_playtest",
    category: "read",
    description: "Start playtest. Captures print/warn/error via LogService. Poll with get_playtest_output, end with stop_playtest. Use numPlayers for multi-client testing (server + N clients).",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["play", "run"],
          description: "Play mode"
        },
        numPlayers: {
          type: "number",
          description: "Number of client players (1-8). Triggers server + clients mode via TestService."
        }
      },
      required: ["mode"]
    }
  },
  {
    name: "stop_playtest",
    category: "read",
    description: "Stop playtest and return all captured output.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_playtest_output",
    category: "read",
    description: "Poll output buffer without stopping. Returns isRunning and captured messages.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      }
    }
  },
  // === Multi-Instance ===
  {
    name: "get_connected_instances",
    category: "read",
    description: "List all connected plugin instances with their roles. Use during multi-client playtest to discover server and client instances for targeted commands.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  // === Undo/Redo ===
  {
    name: "undo",
    category: "write",
    description: "Undo the last change in Roblox Studio. Uses ChangeHistoryService to reverse the most recent operation.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "redo",
    category: "write",
    description: "Redo the last undone change in Roblox Studio. Uses ChangeHistoryService to reapply the most recently undone operation.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "audit_tool_coverage",
    category: "read",
    description: "Audit which MCP tools have a matching implemented route on the Studio plugin side. Returns per-category coverage%, missing tools, duplicated routes, and orphaned handlers.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  // === Build Library ===
  {
    name: "export_build",
    category: "read",
    description: "Export a Model/Folder into a compact, token-efficient build JSON format and auto-save it to the local build library. The output contains a palette (unique BrickColor+Material combos mapped to short keys) and compact part arrays with positions normalized relative to the bounding box center. The file is saved to build-library/{style}/{id}.json automatically.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Path to the Model or Folder to export (dot notation)"
        },
        outputId: {
          type: "string",
          description: 'Build ID for the output (e.g. "medieval/cottage_01"). Defaults to style/instance_name.'
        },
        style: {
          type: "string",
          enum: ["medieval", "modern", "nature", "scifi", "misc"],
          description: "Style category for the build (default: misc)"
        }
      },
      required: ["instancePath"]
    }
  },
  {
    name: "create_build",
    category: "write",
    description: "Create a new build model from scratch and save it to the library. Define parts using compact arrays [posX, posY, posZ, sizeX, sizeY, sizeZ, rotX, rotY, rotZ, paletteKey, shape?, transparency?]. Palette maps short keys to [BrickColor, Material] pairs. The build is saved and can be referenced by import_build or import_scene.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Build ID including style prefix (e.g. "medieval/torch_01", "nature/bush_small")'
        },
        style: {
          type: "string",
          enum: ["medieval", "modern", "nature", "scifi", "misc"],
          description: "Style category"
        },
        palette: {
          type: "object",
          description: 'Map of short keys to [BrickColor, Material] or [BrickColor, Material, MaterialVariant] tuples. E.g. {"a": ["Dark stone grey", "Concrete"], "b": ["Brown", "Wood", "MyCustomWood"]}'
        },
        parts: {
          type: "array",
          description: "Array of parts. Object format: {position:[x,y,z], size:[x,y,z], rotation:[x,y,z], paletteKey, shape?, transparency?}. Tuple format [posX,posY,posZ,sizeX,sizeY,sizeZ,rotX,rotY,rotZ,paletteKey,shape?,transparency?] also accepted.",
          items: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["position", "size", "rotation", "paletteKey"],
                properties: {
                  position: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                  size: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                  rotation: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                  paletteKey: { type: "string", minLength: 1 },
                  shape: { type: "string", enum: ["Block", "Wedge", "Cylinder", "Ball", "CornerWedge"] },
                  transparency: { type: "number", minimum: 0, maximum: 1 }
                }
              },
              {
                type: "array",
                minItems: 10,
                items: { anyOf: [{ type: "number" }, { type: "string" }] }
              }
            ]
          }
        },
        bounds: {
          type: "array",
          items: { type: "number" },
          description: "Optional bounding box [X, Y, Z]. Auto-computed if omitted."
        }
      },
      required: ["id", "style", "palette", "parts"]
    }
  },
  {
    name: "generate_build",
    category: "write",
    description: `Procedurally generate a build via JS code. ALWAYS generate the entire scene in ONE call \u2014 never split into multiple small builds. PREFER high-level primitives over manual loops. No comments. No unnecessary variables. Maximize build detail per line.

EDITING: When modifying an existing build, call get_build first to retrieve the original code. Then make ONLY the targeted changes the user requested \u2014 do not rewrite unchanged code. Pass the modified code to generate_build.

HIGH-LEVEL (use these first \u2014 each replaces 5-20 lines):
  room(x,y,z, w,h,d, wallKey, floorKey?, ceilKey?, wallThickness?) - Complete enclosed room (floor+ceiling+4 walls)
  roof(x,y,z, w,d, style, key, overhang?) - style: "flat"|"gable"|"hip"
  stairs(x1,y1,z1, x2,y2,z2, width, key) - Auto-generates steps between two points
  column(x,y,z, height, radius, key, capKey?) - Cylinder with base+capital
  pew(x,y,z, w,d, seatKey, legKey?) - Bench with seat+backrest+legs
  arch(x,y,z, w,h, thickness, key, segments?) - Curved archway
  fence(x1,z1, x2,z2, y, key, postSpacing?) - Fence with posts+rails

BASIC:
  part(x,y,z, sx,sy,sz, key, shape?, transparency?)
  rpart(x,y,z, sx,sy,sz, rx,ry,rz, key, shape?, transparency?)
  wall(x1,z1, x2,z2, height, thickness, key) \u2014 vertical plane from (x1,z1) to (x2,z2)
  floor(x1,z1, x2,z2, y, thickness, key) \u2014 horizontal plane at height y, corners (x1,z1)-(x2,z2). NOT fill \u2014 only takes 2D corners+y, not 3D points
  fill(x1,y1,z1, x2,y2,z2, key, [ux,uy,uz]?) \u2014 3D volume between two 3D points
  beam(x1,y1,z1, x2,y2,z2, thickness, key)

IMPORTANT: Palette keys must match exactly. Use only keys defined in your palette object, not color names.
CUSTOM MATERIALS: Use search_materials to find MaterialVariant names, then reference them as the 3rd palette element: {"a": ["Color", "BaseMaterial", "VariantName"]}.

REPETITION:
  row(x,y,z, count, spacingX, spacingZ, fn(i,cx,cy,cz))
  grid(x,y,z, countX, countZ, spacingX, spacingZ, fn(ix,iz,cx,cy,cz))

Shapes: Block(default), Wedge, Cylinder, Ball, CornerWedge. Max 10000 parts. Math and rng() available.
CYLINDER AXIS: Roblox cylinders extend along the X axis. For upright cylinders, use size (height, diameter, diameter) with rz=90. The column() primitive handles this automatically.

EXAMPLE \u2014 compact cabin (17 lines):
room(0,0,0,8,4,6,"a","b","a")
roof(0,4,0,8,6,"gable","c")
wall(-4,0,-2,4,0,-2,4,1,"a")
part(0,2,3,3,3,0.3,"a","Block",0.4)
row(-2,0,-1,3,0,2,(i,cx,cy,cz)=>{pew(cx,0,cz,3,2,"d")})
column(-3,0,-2,4,0.5,"a","b")
column(3,0,-2,4,0.5,"a","b")
part(0,2,0,2,1,1,"b")`,
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Build ID including style prefix (e.g. "medieval/church_01")'
        },
        style: {
          type: "string",
          enum: ["medieval", "modern", "nature", "scifi", "misc"],
          description: "Style category"
        },
        palette: {
          type: "object",
          description: 'Map of short keys to [BrickColor, Material] or [BrickColor, Material, MaterialVariant] tuples. E.g. {"a": ["Dark stone grey", "Cobblestone"], "b": ["Brown", "WoodPlanks", "MyCustomWood"]}. MaterialVariant is optional \u2014 use it to reference custom materials from MaterialService.'
        },
        code: {
          type: "string",
          description: "JavaScript code using the primitives above to generate parts procedurally"
        },
        seed: {
          type: "number",
          description: "Optional seed for deterministic rng() output (default: 42)"
        }
      },
      required: ["id", "style", "palette", "code"]
    }
  },
  {
    name: "import_build",
    category: "write",
    description: 'Import a build into Roblox Studio. Accepts either a full build data object OR a library ID string (e.g. "medieval/church_01") to load from the build library. When using generate_build or create_build, pass the build ID string instead of the full data.',
    inputSchema: {
      type: "object",
      properties: {
        buildData: {
          description: 'Either a build data object (with palette, parts, etc.) OR a library ID string (e.g. "medieval/church_01") to load from the build library'
        },
        targetPath: {
          type: "string",
          description: "Parent instance path where the model will be created"
        },
        position: {
          type: "array",
          items: { type: "number" },
          description: "World position offset [X, Y, Z]"
        }
      },
      required: ["buildData", "targetPath"]
    }
  },
  {
    name: "list_library",
    category: "read",
    description: "List available builds in the local build library. Returns build IDs, styles, bounds, and part counts. Optionally filter by style.",
    inputSchema: {
      type: "object",
      properties: {
        style: {
          type: "string",
          enum: ["medieval", "modern", "nature", "scifi", "misc"],
          description: "Filter by style category"
        }
      }
    }
  },
  {
    name: "search_materials",
    category: "read",
    description: "Search for MaterialVariant instances in MaterialService by name. Use this to find custom materials before using them in generate_build or create_build palettes. Returns material names and their base material types.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to match against material names (case-insensitive). Leave empty to list all."
        },
        maxResults: {
          type: "number",
          description: "Max results to return (default: 50)"
        }
      }
    }
  },
  {
    name: "get_build",
    category: "read",
    description: "Get a build from the library by ID. Returns metadata, palette, and generator code (if the build was created with generate_build). IMPORTANT: When the user asks to modify an existing build, ALWAYS call get_build first to retrieve the original code, then make targeted edits to only the relevant lines, and call generate_build with the modified code. Never rewrite the entire code from scratch \u2014 only change what the user asked to change.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Build ID (e.g. "medieval/church_01")'
        }
      },
      required: ["id"]
    }
  },
  {
    name: "import_scene",
    category: "write",
    description: "Import a full scene layout. Provide a scene with model references (resolved from library) and placement data. Each model is placed at the specified position/rotation. Can also include inline custom builds.",
    inputSchema: {
      type: "object",
      properties: {
        sceneData: {
          type: "object",
          description: "Scene layout object with: models (map of key to library build ID), place (array of [key, position, rotation?]), and optional custom (array of inline build objects with name, position, palette, parts)",
          properties: {
            models: {
              type: "object",
              description: 'Map of short keys to library build IDs (e.g. {"A": "medieval/cottage_01"})'
            },
            place: {
              type: "array",
              description: "Array of placements. Preferred format: {modelKey, position:[x,y,z], rotation?:[x,y,z]}. Legacy tuple format [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]] is also accepted.",
              items: {
                anyOf: [
                  {
                    type: "object",
                    additionalProperties: false,
                    required: ["modelKey", "position"],
                    properties: {
                      modelKey: {
                        type: "string"
                      },
                      position: {
                        type: "array",
                        items: { type: "number" }
                      },
                      rotation: {
                        type: "array",
                        items: { type: "number" }
                      }
                    }
                  },
                  {
                    type: "array",
                    items: {
                      anyOf: [
                        {
                          type: "string"
                        },
                        {
                          type: "array",
                          items: { type: "number" }
                        }
                      ]
                    }
                  }
                ]
              }
            },
            custom: {
              type: "array",
              description: "Array of inline custom builds with {n: name, o: [x,y,z], palette: {...}, parts: [...]}",
              items: { type: "object" }
            }
          }
        },
        targetPath: {
          type: "string",
          description: "Parent instance path for the scene (default: game.Workspace)"
        }
      },
      required: ["sceneData"]
    }
  },
  // === Asset Tools ===
  {
    name: "search_assets",
    category: "read",
    description: "Search the Creator Store (Roblox marketplace) for assets by type and keywords. Requires ROBLOX_OPEN_CLOUD_API_KEY env var (no cookie auth for this endpoint).",
    inputSchema: {
      type: "object",
      properties: {
        assetType: {
          type: "string",
          enum: ["Audio", "Model", "Decal", "Plugin", "MeshPart", "Video", "FontFamily"],
          description: "Type of asset to search for"
        },
        query: {
          type: "string",
          description: "Search keywords"
        },
        maxResults: {
          type: "number",
          description: "Max results to return (default: 25)"
        },
        sortBy: {
          type: "string",
          enum: ["Relevance", "Trending", "Top", "AudioDuration", "CreateTime", "UpdatedTime", "Ratings"],
          description: "Sort order (default: Relevance)"
        },
        verifiedCreatorsOnly: {
          type: "boolean",
          description: "Only show assets from verified creators (default: false)"
        }
      },
      required: ["assetType"]
    }
  },
  {
    name: "get_asset_details",
    category: "read",
    description: "Get detailed marketplace metadata for a specific asset. Uses ROBLOX_OPEN_CLOUD_API_KEY or falls back to ROBLOSECURITY cookie (own assets only).",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "number",
          description: "The Roblox asset ID"
        }
      },
      required: ["assetId"]
    }
  },
  {
    name: "get_asset_thumbnail",
    category: "read",
    description: "Get the thumbnail image for an asset as base64 PNG, suitable for vision LLMs. Thumbnails API is public but asset validation uses ROBLOX_OPEN_CLOUD_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "number",
          description: "The Roblox asset ID"
        },
        size: {
          type: "string",
          enum: ["150x150", "420x420", "768x432"],
          description: "Thumbnail size (default: 420x420)"
        }
      },
      required: ["assetId"]
    }
  },
  {
    name: "insert_asset",
    category: "write",
    description: "Insert a Roblox asset into Studio by loading it via AssetService and parenting it to a target location. Optionally set position.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "number",
          description: "The Roblox asset ID to insert"
        },
        parentPath: {
          type: "string",
          description: "Parent instance path (default: game.Workspace)"
        },
        position: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            z: { type: "number" }
          },
          description: "Optional world position to place the asset"
        }
      },
      required: ["assetId"]
    }
  },
  {
    name: "preview_asset",
    category: "read",
    description: "Preview a Roblox asset without permanently inserting it. Loads the asset, builds a hierarchy tree with properties and summary stats, then destroys it. Useful for inspecting asset contents before insertion.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "number",
          description: "The Roblox asset ID to preview"
        },
        includeProperties: {
          type: "boolean",
          description: "Include detailed properties for each instance (default: true)"
        },
        maxDepth: {
          type: "number",
          description: "Max hierarchy traversal depth (default: 10)"
        }
      },
      required: ["assetId"]
    }
  },
  {
    name: "upload_decal",
    category: "write",
    description: "Upload an image file as a Decal asset to Roblox. Supports ROBLOSECURITY cookie auth (recommended, simpler) or ROBLOX_OPEN_CLOUD_API_KEY (needs asset:write scope + creator ID). Cookie auth is used automatically when ROBLOSECURITY is set.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to the image file on disk (PNG, JPG, BMP, or TGA)"
        },
        displayName: {
          type: "string",
          description: "Display name for the decal asset (max 50 characters)"
        },
        description: {
          type: "string",
          description: "Description for the decal asset (default: empty string)"
        },
        userId: {
          type: "string",
          description: "Roblox user ID for the asset creator. Overrides ROBLOX_CREATOR_USER_ID env var."
        },
        groupId: {
          type: "string",
          description: "Roblox group ID for the asset creator. Overrides ROBLOX_CREATOR_GROUP_ID env var. Takes precedence over userId if both provided."
        }
      },
      required: ["filePath", "displayName"]
    }
  },
  {
    name: "capture_screenshot",
    category: "read",
    description: 'Capture a screenshot of the Roblox Studio viewport and return it as a PNG image. Requires EditableImage API to be enabled: Game Settings > Security > "Allow Mesh / Image APIs". Only works in Edit mode with the viewport visible.',
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  // === Input Simulation ===
  {
    name: "simulate_mouse_input",
    category: "write",
    description: "Simulate mouse input in the Roblox Studio viewport via VirtualInputManager. Use during playtest to click UI buttons, interact with objects, or navigate menus. Coordinates are viewport pixels (top-left is 0,0). Use capture_screenshot to identify UI element positions before clicking.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["click", "mouseDown", "mouseUp", "move", "scroll"],
          description: 'Mouse action to perform. "click" does mouseDown + short delay + mouseUp.'
        },
        x: {
          type: "number",
          description: "Viewport pixel X coordinate"
        },
        y: {
          type: "number",
          description: "Viewport pixel Y coordinate"
        },
        button: {
          type: "string",
          enum: ["Left", "Right", "Middle"],
          description: "Mouse button (default: Left)"
        },
        scrollDirection: {
          type: "string",
          enum: ["up", "down"],
          description: 'Scroll direction (only for "scroll" action)'
        },
        target: {
          type: "string",
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      },
      required: ["action", "x", "y"]
    }
  },
  {
    name: "simulate_keyboard_input",
    category: "write",
    description: 'Simulate keyboard input via VirtualInputManager. Use during playtest for character movement (W/A/S/D), jumping (Space), interactions (E), or any key-driven action. For sustained movement, use "press" to hold and "release" to let go.',
    inputSchema: {
      type: "object",
      properties: {
        keyCode: {
          type: "string",
          description: 'Enum.KeyCode name: "W", "A", "S", "D", "Space", "E", "F", "LeftShift", "LeftControl", "Return", "Tab", "Escape", "One", "Two", etc.'
        },
        action: {
          type: "string",
          enum: ["press", "release", "tap"],
          description: '"tap" (default) = press + wait + release. "press" = key down only. "release" = key up only.'
        },
        duration: {
          type: "number",
          description: 'Hold duration in seconds for "tap" action (default: 0.1). Use longer values for sustained input like walking.'
        },
        target: {
          type: "string",
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      },
      required: ["keyCode"]
    }
  },
  // === Character Navigation ===
  {
    name: "character_navigation",
    category: "write",
    description: 'Move the player character to a target position or instance during playtest. Uses PathfindingService for automatic navigation around obstacles, falling back to direct movement. Requires an active playtest in "play" mode. Does NOT simulate player input \u2014 moves the character directly.',
    inputSchema: {
      type: "object",
      properties: {
        position: {
          type: "array",
          items: { type: "number" },
          description: "Target world position [x, y, z]. Either this or instancePath is required."
        },
        instancePath: {
          type: "string",
          description: "Instance to navigate to (dot notation). The character walks to its Position. Either this or position is required."
        },
        waitForCompletion: {
          type: "boolean",
          description: "Wait for the character to arrive before returning (default: true)"
        },
        timeout: {
          type: "number",
          description: "Max seconds to wait for navigation to complete (default: 25)"
        },
        target: {
          type: "string",
          description: 'Instance target: "edit" (default), "server", "client-1", "client-2", etc.'
        }
      }
    }
  },
  // === Instance Operations ===
  {
    name: "clone_object",
    category: "write",
    description: "Clone an instance to a new parent location. Creates a deep copy of the instance and all its descendants.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Path of the instance to clone"
        },
        targetParentPath: {
          type: "string",
          description: "Path of the parent to place the clone under"
        }
      },
      required: ["instancePath", "targetParentPath"]
    }
  },
  {
    name: "move_object",
    category: "write",
    description: "Move (reparent) an instance to a new parent location. Preserves all children and properties.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Path of the instance to move"
        },
        targetParentPath: {
          type: "string",
          description: "Path of the new parent"
        }
      },
      required: ["instancePath", "targetParentPath"]
    }
  },
  {
    name: "rename_object",
    category: "write",
    description: "Rename an instance.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Path of the instance to rename"
        },
        newName: {
          type: "string",
          description: "New name for the instance"
        }
      },
      required: ["instancePath", "newName"]
    }
  },
  // === Descendants & Comparison ===
  {
    name: "get_descendants",
    category: "read",
    description: "Get all descendants of an instance recursively with depth info. More efficient than repeated get_instance_children calls.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Root instance path"
        },
        maxDepth: {
          type: "number",
          description: "Maximum recursion depth (default: 10)"
        },
        classFilter: {
          type: "string",
          description: 'Only include instances of this class (uses IsA, so "BasePart" matches Part, MeshPart, etc.)'
        }
      },
      required: ["instancePath"]
    }
  },
  {
    name: "compare_instances",
    category: "read",
    description: "Diff two instances by comparing their properties. Useful for debugging why a duplicate behaves differently.",
    inputSchema: {
      type: "object",
      properties: {
        instancePathA: {
          type: "string",
          description: "First instance path"
        },
        instancePathB: {
          type: "string",
          description: "Second instance path"
        }
      },
      required: ["instancePathA", "instancePathB"]
    }
  },
  // === Output & Diagnostics ===
  {
    name: "get_output_log",
    category: "read",
    description: "Get the Studio output log history. Works in both edit and play mode.",
    inputSchema: {
      type: "object",
      properties: {
        maxEntries: {
          type: "number",
          description: "Maximum number of log entries to return (default: 100)"
        },
        messageType: {
          type: "string",
          description: 'Filter by message type (e.g. "Enum.MessageType.MessageOutput", "Enum.MessageType.MessageWarning", "Enum.MessageType.MessageError")'
        }
      }
    }
  },
  {
    name: "get_script_analysis",
    category: "read",
    description: "Run syntax analysis on Luau scripts using loadstring. Detects compile errors with line numbers. Pass a script path to analyze one script, or a container path to analyze all scripts under it.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path - either a script or a container whose descendant scripts will be analyzed"
        }
      },
      required: ["instancePath"]
    }
  },
  // === Bulk Attributes ===
  {
    name: "bulk_set_attributes",
    category: "write",
    description: "Set multiple attributes on an instance in a single call. More efficient than repeated set_attribute calls.",
    inputSchema: {
      type: "object",
      properties: {
        instancePath: {
          type: "string",
          description: "Instance path"
        },
        attributes: {
          type: "object",
          description: "Map of attribute names to values. Supports Vector3, Color3, UDim2 via _type convention."
        }
      },
      required: ["instancePath", "attributes"]
    }
  },
  // === Find and Replace ===
  {
    name: "find_and_replace_in_scripts",
    category: "write",
    description: "Find and replace text across all scripts in the game. Supports literal and Lua pattern matching. Use dryRun to preview changes before applying. Pairs with grep_scripts for search-only operations.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Text or Lua pattern to find"
        },
        replacement: {
          type: "string",
          description: "Replacement text. When usePattern is true, supports Lua captures (%1, %2, etc.)."
        },
        caseSensitive: {
          type: "boolean",
          description: "Case-sensitive matching (default: false). Must be true when usePattern is true."
        },
        usePattern: {
          type: "boolean",
          description: "Use Lua pattern matching instead of literal (default: false). Requires caseSensitive: true."
        },
        path: {
          type: "string",
          description: 'Limit scope to a subtree (e.g. "game.ServerScriptService")'
        },
        classFilter: {
          type: "string",
          enum: ["Script", "LocalScript", "ModuleScript"],
          description: "Only search scripts of this class type"
        },
        dryRun: {
          type: "boolean",
          description: "Preview changes without applying them (default: false)"
        },
        maxReplacements: {
          type: "number",
          description: "Safety limit on total replacements (default: 1000)"
        }
      },
      required: ["pattern", "replacement"]
    }
  }
];
var getAllTools = () => [...TOOL_DEFINITIONS];

// src/index.ts
import { createRequire } from "module";
if (process.argv.includes("--install-plugin")) {
  const { installPlugin: installPlugin2 } = await Promise.resolve().then(() => (init_install_plugin(), install_plugin_exports));
  installPlugin2().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
} else {
  const flagValue = (flag) => {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : void 0;
  };
  const openCloudKey = flagValue("--open-cloud-key");
  const creatorId = flagValue("--creator-id");
  const creatorGroupId = flagValue("--creator-group-id");
  if (openCloudKey) process.env.ROBLOX_OPEN_CLOUD_API_KEY = openCloudKey;
  if (creatorId) process.env.ROBLOX_CREATOR_USER_ID = creatorId;
  if (creatorGroupId) process.env.ROBLOX_CREATOR_GROUP_ID = creatorGroupId;
  const require2 = createRequire(import.meta.url);
  const { version: VERSION } = require2("../package.json");
  const server = new RobloxStudioMCPServer({
    name: "robloxstudio-mcp",
    version: VERSION,
    tools: getAllTools()
  });
  server.run().catch((error) => {
    console.error("Server failed to start:", error);
    process.exit(1);
  });
}
