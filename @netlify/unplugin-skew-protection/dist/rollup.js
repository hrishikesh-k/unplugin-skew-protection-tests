// src/rollup.ts
import { createRollupPlugin } from "unplugin";

// src/lib/webpack.ts
import { createRequire } from "module";

// src/lib/patterns.ts
function appendQueryParam(url, paramName, token) {
  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : url.slice(hashIndex);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${paramName}=${encodeURIComponent(token)}${fragment}`;
}
function compilePatterns(patterns) {
  return patterns.map((pattern) => {
    try {
      return new RegExp(pattern);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid skew protection pattern ${JSON.stringify(pattern)}: ${reason}`, {
        cause: error
      });
    }
  });
}
function hasQueryParam(url, paramName, token) {
  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = base.indexOf("?");
  if (queryIndex === -1) {
    return false;
  }
  const target = `${paramName}=${encodeURIComponent(token)}`;
  return base.slice(queryIndex + 1).split("&").includes(target);
}
function matchesAnyPattern(value, regexps) {
  return regexps.some((regexp) => regexp.test(value));
}

// src/lib/webpack.ts
var PLUGIN_NAME = "netlify-skew-protection";
function applySkewProtectionWebpackPlugin(compiler, resolved) {
  const regexps = compilePatterns(resolved.patterns);
  wrapChunkFilenameFunctions(compiler, resolved, regexps);
  decorateHtmlWebpackPluginTags(compiler, resolved, regexps);
}
function decorateHtmlWebpackPluginTags(compiler, resolved, regexps) {
  let HtmlWebpackPlugin;
  try {
    const require2 = createRequire(import.meta.url);
    HtmlWebpackPlugin = require2("html-webpack-plugin");
  } catch {
    return;
  }
  compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
    HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapPromise(PLUGIN_NAME, (data) => {
      for (const tag of data.assetTags.scripts) {
        stampAttribute(tag, "src", resolved, regexps);
      }
      for (const tag of data.assetTags.styles) {
        stampAttribute(tag, "href", resolved, regexps);
      }
      return Promise.resolve(data);
    });
  });
}
function stampAttribute(tag, attributeName, resolved, regexps) {
  const url = tag.attributes[attributeName];
  if (typeof url !== "string" || !matchesAnyPattern(url, regexps)) {
    return;
  }
  tag.attributes[attributeName] = appendQueryParam(url, resolved.paramName, resolved.token);
}
function wrapChunkFilenameFunctions(compiler, resolved, regexps) {
  const suffix = `?${resolved.paramName}=${encodeURIComponent(resolved.token)}`;
  const patternsLiteral = `[${regexps.map(String).join(", ")}]`;
  class SkewProtectionRuntimeModule extends compiler.webpack.RuntimeModule {
    constructor() {
      super("netlify skew protection", compiler.webpack.RuntimeModule.STAGE_ATTACH);
    }
    generate() {
      return compiler.webpack.Template.asString([
        `var __netlifySkewPatterns__ = ${patternsLiteral};`,
        `var __netlifySkewSuffix__ = ${JSON.stringify(suffix)};`,
        "function __netlifySkewMatches__(filename) {",
        compiler.webpack.Template.indent([
          "for (var i = 0; i < __netlifySkewPatterns__.length; i++) {",
          compiler.webpack.Template.indent("if (__netlifySkewPatterns__[i].test(filename)) return true;"),
          "}",
          "return false;"
        ]),
        "}",
        `if (typeof ${compiler.webpack.RuntimeGlobals.getChunkScriptFilename} === "function") {`,
        compiler.webpack.Template.indent([
          `var __netlifyOrigChunkScriptFilename__ = ${compiler.webpack.RuntimeGlobals.getChunkScriptFilename};`,
          `${compiler.webpack.RuntimeGlobals.getChunkScriptFilename} = function (chunkId) {`,
          compiler.webpack.Template.indent([
            "var filename = __netlifyOrigChunkScriptFilename__(chunkId);",
            "return __netlifySkewMatches__(filename) ? filename + __netlifySkewSuffix__ : filename;"
          ]),
          "};"
        ]),
        "}",
        `if (typeof ${compiler.webpack.RuntimeGlobals.getChunkCssFilename} === "function") {`,
        compiler.webpack.Template.indent([
          `var __netlifyOrigChunkCssFilename__ = ${compiler.webpack.RuntimeGlobals.getChunkCssFilename};`,
          `${compiler.webpack.RuntimeGlobals.getChunkCssFilename} = function (chunkId) {`,
          compiler.webpack.Template.indent([
            "var filename = __netlifyOrigChunkCssFilename__(chunkId);",
            "return __netlifySkewMatches__(filename) ? filename + __netlifySkewSuffix__ : filename;"
          ]),
          "};"
        ]),
        "}"
      ]);
    }
  }
  compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
    const patchedChunks = /* @__PURE__ */ new WeakSet();
    function patchChunk(chunk) {
      if (patchedChunks.has(chunk)) {
        return;
      }
      patchedChunks.add(chunk);
      compilation.addRuntimeModule(chunk, new SkewProtectionRuntimeModule());
    }
    compilation.hooks.runtimeRequirementInTree.for(compiler.webpack.RuntimeGlobals.getChunkScriptFilename).tap(PLUGIN_NAME, patchChunk);
    compilation.hooks.runtimeRequirementInTree.for(compiler.webpack.RuntimeGlobals.getChunkCssFilename).tap(PLUGIN_NAME, patchChunk);
  });
}

// src/lib/html.ts
import MagicString from "magic-string";
import { parse } from "parse5";
function decorateAttribute(html, element, attributeName, resolved, regexps, magicString) {
  const attr = element.attrs.find((candidate) => candidate.name === attributeName);
  const location = element.sourceCodeLocation?.attrs?.[attributeName];
  if (!attr || !location || !matchesAnyPattern(attr.value, regexps)) {
    return;
  }
  const raw = html.slice(location.startOffset, location.endOffset);
  const quote = /^[^=]+=(["'])/.exec(raw)?.[1] ?? '"';
  const stampedUrl = appendQueryParam(attr.value, resolved.paramName, resolved.token);
  const escapedUrl = escapeAttributeValue(stampedUrl, quote);
  magicString.overwrite(location.startOffset, location.endOffset, `${attributeName}=${quote}${escapedUrl}${quote}`);
}
function decorateHtml(html, resolved, regexps) {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const magicString = new MagicString(html);
  function visit(node) {
    if ("tagName" in node) {
      if (node.tagName === "script") {
        decorateAttribute(html, node, "src", resolved, regexps, magicString);
      } else if (node.tagName === "link") {
        decorateAttribute(html, node, "href", resolved, regexps, magicString);
      }
    }
    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
  }
  visit(document);
  return magicString.toString();
}
function escapeAttributeValue(value, quote) {
  const quoteEntity = quote === "'" ? "&#39;" : "&quot;";
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(new RegExp(quote, "g"), quoteEntity);
}

// src/lib/render-chunk.ts
import { init, parse as parse2 } from "es-module-lexer";
import MagicString2 from "magic-string";
function createRenderChunk(resolved) {
  const regexps = compilePatterns(resolved.patterns);
  return async (code) => {
    if (!code.includes("import")) {
      return null;
    }
    await init;
    const [imports] = parse2(code);
    let magicString;
    for (const imp of imports) {
      if (imp.d === -2 || imp.n === void 0) {
        continue;
      }
      const specifier = imp.n;
      if (hasQueryParam(specifier, resolved.paramName, resolved.token) || !matchesAnyPattern(specifier, regexps)) {
        continue;
      }
      const stamped = appendQueryParam(specifier, resolved.paramName, resolved.token);
      const isDynamic = imp.d > -1;
      const start = isDynamic ? imp.s : imp.s - 1;
      const end = isDynamic ? imp.e : imp.e + 1;
      magicString ??= new MagicString2(code);
      magicString.overwrite(start, end, JSON.stringify(stamped));
    }
    if (!magicString) {
      return null;
    }
    const map = magicString.generateMap({
      hires: "boundary"
    });
    return {
      code: magicString.toString(),
      map: {
        file: map.file,
        mappings: map.mappings,
        names: map.names,
        sources: map.sources,
        // magic-string types this as `(string | null)[]`; Rollup/Rolldown expect `string[]`.
        sourcesContent: map.sourcesContent?.map((content) => content ?? ""),
        version: map.version
      }
    };
  };
}

// src/lib/rollup.ts
function createGenerateBundleHook(resolved) {
  const regexps = compilePatterns(resolved.patterns);
  return {
    handler(_outputOptions, bundle) {
      for (const entry of Object.values(bundle)) {
        if (!isHtmlAsset(entry)) {
          continue;
        }
        entry.source = decorateHtml(entry.source, resolved, regexps);
      }
    },
    order: "post"
  };
}
function createRolldownRollupHooks(resolved) {
  return {
    generateBundle: createGenerateBundleHook(resolved),
    renderChunk: createRenderChunk(resolved)
  };
}
function isHtmlAsset(entry) {
  return entry.type === "asset" && "fileName" in entry && typeof entry.source === "string" && entry.fileName.toLowerCase().endsWith(".html");
}

// src/lib/vite.ts
function createViteHooks(resolved) {
  const regexps = compilePatterns(resolved.patterns);
  const stampChunk = createRenderChunk(resolved);
  let isClassicSsrBuild = false;
  return {
    apply: "build",
    configResolved(config) {
      isClassicSsrBuild = Boolean(config.build.ssr);
    },
    renderChunk(code) {
      const isServer = this.environment ? this.environment.config.consumer === "server" : isClassicSsrBuild;
      if (isServer) {
        return null;
      }
      return stampChunk.call(this, code);
    },
    transformIndexHtml(html) {
      return decorateHtml(html, resolved, regexps);
    }
  };
}

// src/lib/options.ts
import { cwd, env } from "process";
var DEFAULT_PARAM_NAME = "nfdpl";
var DEFAULT_PATTERNS = [".*\\.(js|mjs|cjs)$", ".*\\.css$"];
function resolveOptions(options = {}) {
  const token = options.token ?? env.NETLIFY_SKEW_PROTECTION_TOKEN;
  if (!token || token === "0") {
    return null;
  }
  const patterns = options.patterns ?? DEFAULT_PATTERNS;
  compilePatterns(patterns);
  return {
    baseDir: options.baseDir ?? cwd(),
    paramName: options.paramName ?? DEFAULT_PARAM_NAME,
    patterns,
    token
  };
}

// src/lib/manifest.ts
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
function buildManifest(resolved) {
  return {
    patterns: resolved.patterns,
    sources: [
      {
        name: resolved.paramName,
        type: "query"
      }
    ]
  };
}
async function writeManifest(resolved) {
  const manifestDir = join(resolved.baseDir, ".netlify", "v1");
  await mkdir(manifestDir, {
    recursive: true
  });
  await writeFile(join(manifestDir, "skew-protection.json"), `${JSON.stringify(buildManifest(resolved), null, 2)}
`);
}

// src/main.ts
function unpluginFactory(userOptions = {}) {
  const resolved = resolveOptions(userOptions);
  if (!resolved) {
    return {
      name: "netlify:skew-protection"
    };
  }
  return {
    name: "netlify:skew-protection",
    // Rolldown and Rollup share the hooks this plugin uses, but each target only
    // merges its own field, so both must be set explicitly.
    rolldown: createRolldownRollupHooks(resolved),
    rollup: createRolldownRollupHooks(resolved),
    webpack(compiler) {
      applySkewProtectionWebpackPlugin(compiler, resolved);
    },
    vite: createViteHooks(resolved),
    writeBundle() {
      return writeManifest(resolved);
    }
  };
}

// src/rollup.ts
var rollup_default = createRollupPlugin(unpluginFactory);
export {
  rollup_default as default
};
