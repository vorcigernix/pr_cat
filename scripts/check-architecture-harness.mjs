#!/usr/bin/env bun

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'docs', 'architecture', 'repository-manifest.json');
const RULES_PATH = path.join(ROOT_DIR, 'docs', 'architecture', 'dependency-rules.json');

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT_DIR, relPath));
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${toPosix(path.relative(ROOT_DIR, filePath))}: ${error.message}`);
  }
}

function walkFiles(dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getLineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function extractImports(sourceText) {
  const imports = [];
  const staticImportRegex = /(?:import|export)\s+[^'"]*from\s*['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;
  while ((match = staticImportRegex.exec(sourceText)) !== null) {
    imports.push({
      specifier: match[1],
      index: match.index,
    });
  }

  while ((match = dynamicImportRegex.exec(sourceText)) !== null) {
    imports.push({
      specifier: match[1],
      index: match.index,
    });
  }

  return imports;
}

function matchesPrefix(specifier, prefix) {
  if (specifier === prefix) {
    return true;
  }
  return specifier.startsWith(`${prefix}/`);
}

function normalizeIncludeTargets(include) {
  const targets = [];
  const missing = [];

  for (const entry of include) {
    const fullPath = path.join(ROOT_DIR, entry);
    if (!fs.existsSync(fullPath)) {
      missing.push(entry);
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      targets.push(...walkFiles(fullPath));
      continue;
    }

    targets.push(fullPath);
  }

  return {
    targets: [...new Set(targets)],
    missing,
  };
}

function validateManifest(manifest) {
  const errors = [];

  if (typeof manifest.version !== 'number') {
    errors.push('repository-manifest.json: "version" must be a number.');
  }

  if (typeof manifest.updatedAt !== 'string') {
    errors.push('repository-manifest.json: "updatedAt" must be a string.');
  }

  if (!Array.isArray(manifest.readingOrder) || manifest.readingOrder.length === 0) {
    errors.push('repository-manifest.json: "readingOrder" must be a non-empty array.');
  }

  if (!Array.isArray(manifest.entrypoints) || manifest.entrypoints.length === 0) {
    errors.push('repository-manifest.json: "entrypoints" must be a non-empty array.');
  }

  if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
    errors.push('repository-manifest.json: "modules" must be a non-empty array.');
  }

  for (const relPath of manifest.readingOrder || []) {
    if (!fileExists(relPath)) {
      errors.push(`repository-manifest.json: readingOrder path not found: ${relPath}`);
    }
  }

  for (const relPath of manifest.entrypoints || []) {
    if (!fileExists(relPath)) {
      errors.push(`repository-manifest.json: entrypoint path not found: ${relPath}`);
    }
  }

  const moduleIds = new Set();
  for (const moduleDef of manifest.modules || []) {
    const requiredFields = ['id', 'path', 'purpose', 'owners', 'status', 'dependsOn'];
    for (const field of requiredFields) {
      if (!(field in moduleDef)) {
        errors.push(`repository-manifest.json: module is missing required field "${field}".`);
      }
    }

    if (typeof moduleDef.id !== 'string' || moduleDef.id.trim() === '') {
      errors.push('repository-manifest.json: each module id must be a non-empty string.');
      continue;
    }

    if (moduleIds.has(moduleDef.id)) {
      errors.push(`repository-manifest.json: duplicate module id "${moduleDef.id}".`);
    } else {
      moduleIds.add(moduleDef.id);
    }

    if (typeof moduleDef.path !== 'string' || moduleDef.path.trim() === '') {
      errors.push(`repository-manifest.json: module "${moduleDef.id}" path must be a non-empty string.`);
    } else if (!fileExists(moduleDef.path)) {
      errors.push(`repository-manifest.json: module "${moduleDef.id}" path not found: ${moduleDef.path}`);
    }

    if (!Array.isArray(moduleDef.owners) || moduleDef.owners.length === 0) {
      errors.push(`repository-manifest.json: module "${moduleDef.id}" must include at least one owner.`);
    }

    if (!Array.isArray(moduleDef.dependsOn)) {
      errors.push(`repository-manifest.json: module "${moduleDef.id}" dependsOn must be an array.`);
    }
  }

  for (const moduleDef of manifest.modules || []) {
    for (const dependency of moduleDef.dependsOn || []) {
      if (!moduleIds.has(dependency)) {
        errors.push(
          `repository-manifest.json: module "${moduleDef.id}" depends on unknown module "${dependency}".`
        );
      }
    }
  }

  return errors;
}

function validateDependencyRules(rulesConfig) {
  const errors = [];

  if (typeof rulesConfig.version !== 'number') {
    errors.push('dependency-rules.json: "version" must be a number.');
    return errors;
  }

  if (!Array.isArray(rulesConfig.rules) || rulesConfig.rules.length === 0) {
    errors.push('dependency-rules.json: "rules" must be a non-empty array.');
    return errors;
  }

  for (const rule of rulesConfig.rules) {
    if (!rule.id || typeof rule.id !== 'string') {
      errors.push('dependency-rules.json: each rule needs a string "id".');
      continue;
    }

    if (!Array.isArray(rule.include) || rule.include.length === 0) {
      errors.push(`dependency-rules.json: rule "${rule.id}" must define a non-empty "include" array.`);
      continue;
    }

    if (!Array.isArray(rule.forbidPrefixes) || rule.forbidPrefixes.length === 0) {
      errors.push(`dependency-rules.json: rule "${rule.id}" must define a non-empty "forbidPrefixes" array.`);
      continue;
    }

    const { targets, missing } = normalizeIncludeTargets(rule.include);
    for (const missingPath of missing) {
      errors.push(`dependency-rules.json: rule "${rule.id}" references missing path "${missingPath}".`);
    }

    if (targets.length === 0) {
      errors.push(`dependency-rules.json: rule "${rule.id}" did not match any source files.`);
      continue;
    }

    for (const target of targets) {
      const relTarget = toPosix(path.relative(ROOT_DIR, target));
      const sourceText = fs.readFileSync(target, 'utf8');
      const imports = extractImports(sourceText);

      for (const importRef of imports) {
        const offendingPrefix = rule.forbidPrefixes.find((prefix) =>
          matchesPrefix(importRef.specifier, prefix)
        );

        if (!offendingPrefix) {
          continue;
        }

        const line = getLineNumber(sourceText, importRef.index);
        errors.push(
          `${relTarget}:${line} violates "${rule.id}" via import "${importRef.specifier}" (forbidden prefix "${offendingPrefix}")`
        );
      }
    }
  }

  return errors;
}

function main() {
  const manifest = readJson(MANIFEST_PATH);
  const rulesConfig = readJson(RULES_PATH);

  const errors = [
    ...validateManifest(manifest),
    ...validateDependencyRules(rulesConfig),
  ];

  if (errors.length > 0) {
    console.error('Architecture harness check failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Architecture harness check passed.');
}

main();
