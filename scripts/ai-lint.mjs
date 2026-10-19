#!/usr/bin/env node
/**
 * company-mobile-ui AI 输出校验器 — 治理闭环环节③（自动校验）
 *
 * 把 Skill 的九条红线变成可执行检查。AI 生成代码后立即运行，
 * 违规打回重生成——防「客观违规」与「迭代漂移」，不依赖人工肉眼审核。
 *
 * 零依赖（纯 Node.js），可复制到任何消费 @donglegeyu/company-mobile-ui 的业务项目：
 *
 *   curl -O https://raw.githubusercontent.com/donglegeyu/company-mobile-ui-skills/main/scripts/ai-lint.mjs
 *   node ai-lint.mjs src/
 *
 * 用法：
 *   node ai-lint.mjs [目录或文件...]    # 默认扫描 ./src
 *   node ai-lint.mjs src --quiet        # 只输出 error 级（挂 CI 用）
 *
 * 豁免机制（用于登记例外，而非绕过规范）：
 *   行级：行尾加   // lint-ai-disable-line            （该行全部规则）
 *                 // lint-ai-disable-line no-antd-mobile-import   （该行单条规则）
 *   文件级：文件头（前 10 行内）加
 *                 /* lint-ai-disable *​/               （本文件全部规则）
 *                 /* lint-ai-disable no-hardcoded-color *​/  （本文件单条规则）
 *
 * 退出码：存在 error → 1（可直接挂 CI / lint-staged / AI 自动修复循环）
 */

import fs from 'node:fs';
import path from 'node:path';

const VERSION = '1.0.0';

/* ===== 基础配置 ===== */

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);
const STYLE_EXT = new Set(['.scss', '.css', '.less']);
const TS_EXT = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'es', 'lib', 'build', 'coverage',
  '.git', '.dumi', '.umi', '.umi-production', 'public', 'fixtures', '__snapshots__',
]);

/** antd-mobile 原生导入白名单（仅 ConfigProvider，且只用于 locale 传递） */
const ANTD_WHITELIST = new Set(['ConfigProvider']);

/** PC 专属事件（移动端不触发或行为异常） */
const PC_EVENT_RE = /onMouseEnter\b|onMouseLeave\b|onDoubleClick\b/g;

/**
 * 组件库封装层目录：内部导入 antd-mobile 是封装架构必需（CLAUDE.md 允许），
 * 该目录下的 no-antd-mobile-import 不做检查，但 pkgImports 仍收集（供 prefer-template）。
 */
const WRAPPER_DIRS = ['/basic-components/', '/shared-components/'];

/**
 * 设计 token 源头路径：颜色值在此定义是合法场景（CSS 变量定义处 / 主题元数据存档），
 * 路径包含匹配即豁免 no-hardcoded-color。
 */
const TOKEN_SOURCE_PATHS = ['/global.css', '/theme/'];

/* ===== 规则清单 ===== */

const RULE_META = {
  'no-antd-mobile-import': { level: 'error',   brief: '禁止从 antd-mobile 导入白名单外组件（用 MobileXxx）' },
  'no-hardcoded-color':    { level: 'error',   brief: '禁止硬编码颜色（用 var(--adm-color-*) / mobileDesignRules）' },
  'no-important':          { level: 'error',   brief: '禁止使用 !important' },
  'no-any':                { level: 'error',   brief: '禁止使用 any 类型' },
  'no-default-export':     { level: 'error',   brief: '禁止默认导出（用 export function / export const）' },
  'no-configprovider-theme': { level: 'error', brief: '禁止 ConfigProvider 传 theme prop（antd-mobile v5 静默忽略，只传 locale）' },
  'no-pc-event':           { level: 'warning', brief: '禁止 onMouseEnter / onMouseLeave / onDoubleClick 等 PC 事件' },
  'prefer-template':       { level: 'warning', brief: '业务模板优先于基础组件手动拼装（≥6 个 MobileXxx import 时提示）' },
  'unknown-props':         { level: 'warning', brief: '不确定 Props 时查类型定义，不凭记忆写（登记型 advisory，不实际触发）' },
};

/* ===== 文件遍历 ===== */

function walk(target, out = []) {
  let stat;
  try {
    stat = fs.statSync(target);
  } catch {
    return out;
  }
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) {
      if (SKIP_DIRS.has(name)) continue;
      if (name.startsWith('.')) continue;
      walk(path.join(target, name), out);
    }
  } else if (stat.isFile()) {
    const ext = path.extname(target);
    if (CODE_EXT.has(ext) || STYLE_EXT.has(ext)) out.push(target);
  }
  return out;
}

/* ===== 豁免解析 ===== */

/** 文件级豁免：返回 null（未豁免）、'all' 或规则名 Set */
function parseFileDisable(lines) {
  const head = lines.slice(0, 10).join('\n');
  const rules = new Set();
  let disabledAll = false;
  const re = /lint-ai-disable(?!-line)(?:\s+([\w-]+))?/g;
  let m;
  while ((m = re.exec(head)) !== null) {
    if (m[1]) {
      if (RULE_META[m[1]]) rules.add(m[1]);
    } else {
      disabledAll = true;
    }
  }
  if (disabledAll) return 'all';
  return rules.size ? rules : null;
}

/** 行级豁免：返回 true（该行该规则豁免） */
function isLineDisabled(line, rule) {
  const idx = line.indexOf('lint-ai-disable-line');
  if (idx === -1) return false;
  const rest = line.slice(idx + 'lint-ai-disable-line'.length);
  const m = rest.match(/^\s+([\w-]+)/);
  // 不带规则名 → 豁免该行全部规则
  return !m || m[1] === rule;
}

/** 判断违规位置是否在 // 注释内（减少教学注释误报） */
function inLineComment(line, col) {
  const idx = line.indexOf('//');
  return idx !== -1 && col > idx;
}

/**
 * 剥离字符串字面量与注释（行注释 // 与块注释），返回剩余代码文本。
 * state 为跨行块注释状态（进入块注释后置 true，遇块注释结束标记置 false）。
 * 用于避免示例/注释文本误报（如 JSDoc 中的 ConfigProvider theme 示例）。
 */
function stripComments(line, inBlock) {
  let out = '';
  let state = inBlock;
  let i = 0;
  const n = line.length;
  while (i < n) {
    const ch = line[i];
    if (state) {
      if (ch === '*' && line[i + 1] === '/') {
        state = false;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') break; // 行注释：其后全部忽略
    if (ch === '/' && line[i + 1] === '*') {
      state = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      out += ch;
      i += 1;
      while (i < n) {
        out += line[i];
        if (line[i] === '\\') {
          i += 1;
          if (i < n) out += line[i];
          i += 1;
          continue;
        }
        if (line[i] === q) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return { code: out, inBlock: state };
}

/* ===== 各规则实现（返回 [{ line, col, message, rule }]，line 从 1 起） ===== */

const RE_IMPORT_ANTD = /import\s+(?:(type)\s+)?(.+?)\s+from\s+['"]antd-mobile(\/[^'"]*)?['"]|require\(\s*['"]antd-mobile(\/[^'"]*)?['"]\s*\)/;
const RE_IMPORT_PKG = /from\s+['"]@donglegeyu\/company-mobile-ui['"]/;

function parseSpecifiers(clause) {
  const m = clause.match(/\{([^}]*)\}/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s.startsWith('type ')) return { imported: s.slice(5).trim(), typeOnly: true };
      const as = s.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
      return as ? { imported: as[1], typeOnly: false } : { imported: s, typeOnly: false };
    });
}

function checkAntdImport(lines, ext, add, relPath) {
  if (!CODE_EXT.has(ext)) return new Set();
  const isWrapper = WRAPPER_DIRS.some((d) => relPath.includes(d));
  const pkgImports = new Set();
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    // 收集 @donglegeyu/company-mobile-ui import（供 prefer-template 用）
    if (RE_IMPORT_PKG.test(line)) {
      for (const s of parseSpecifiers(line)) pkgImports.add(s.imported);
    }
    // 组件库封装层：内部导入 antd-mobile 为架构必需，不做违规检查
    if (isWrapper) return;
    if (isLineDisabled(line, 'no-antd-mobile-import')) return;
    const m = line.match(RE_IMPORT_ANTD);
    if (!m) return;
    // 类型导入豁免（import type { ButtonProps } from 'antd-mobile'）
    if (m[1] === 'type') return;
    // 子路径（antd-mobile/es/xxx）与副作用导入直接违规
    if (m[3]) {
      add(lineNo, 1, '禁止从 antd-mobile 子路径导入（应从 @donglegeyu/company-mobile-ui 导入 MobileXxx）', 'no-antd-mobile-import');
      return;
    }
    const clause = m[2];
    // import * as Antd / import Antd from 'antd-mobile'
    if (!clause.trim().startsWith('{')) {
      add(lineNo, 1, '禁止整包导入 antd-mobile（按需从 @donglegeyu/company-mobile-ui 导入 MobileXxx）', 'no-antd-mobile-import');
      return;
    }
    const bad = parseSpecifiers(clause).filter(
      (s) => !s.typeOnly && !ANTD_WHITELIST.has(s.imported),
    );
    if (bad.length) {
      const names = bad.map((s) => `Mobile${s.imported}`).join('、');
      add(
        lineNo,
        1,
        `禁止从 antd-mobile 导入 ${bad.map((s) => s.imported).join('、')}（用 ${names}，从 @donglegeyu/company-mobile-ui 导入；白名单：${[...ANTD_WHITELIST].join(' / ')}）`,
        'no-antd-mobile-import',
      );
    }
  });
  return pkgImports;
}

function checkHardcodedColor(lines, ext, add, relPath) {
  // 设计 token 源头（global.css / theme/）：颜色值在此定义是合法场景
  if (TOKEN_SOURCE_PATHS.some((p) => relPath.includes(p))) return;
  const isCode = CODE_EXT.has(ext);
  const hexRe = isCode
    ? /['"`](#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))['"`]/g
    : /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  const rgbRe = isCode
    ? /['"`](rgba?\([^'"`]*\))['"`]/g
    : /rgba?\([^)]*\)/g;
  lines.forEach((line, i) => {
    if (isLineDisabled(line, 'no-hardcoded-color')) return;
    // 样式文件中 CSS 自定义属性定义行（--xxx: #...）是 token 定义源头，跳过
    if (!isCode && /^\s*--[\w-]+\s*:/.test(line)) return;
    for (const re of [hexRe, rgbRe]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        if (isLineDisabled(line, 'no-hardcoded-color')) break;
        const found = m[1] || m[0].replace(/^['"`]|['"`]$/g, '');
        add(
          i + 1,
          m.index + 1,
          `禁止硬编码颜色 ${found}（用 var(--adm-color-*) / var(--mobile-color-*) 或 mobileDesignRules 常量）`,
          'no-hardcoded-color',
        );
      }
    }
  });
}

function checkImportant(lines, ext, add) {
  lines.forEach((line, i) => {
    if (isLineDisabled(line, 'no-important')) return;
    const m = line.indexOf('!important');
    if (m !== -1) {
      add(i + 1, m + 1, '禁止使用 !important（用内联 style 或 CSS Modules 合规层级选择器）', 'no-important');
    }
  });
}

function checkAny(lines, ext, add) {
  if (!TS_EXT.has(ext)) return;
  const re = /(:\s*any\b)|(as\s+any\b)|(<any>)|(\bany\[\])/g;
  lines.forEach((line, i) => {
    if (isLineDisabled(line, 'no-any')) return;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (inLineComment(line, m.index)) continue;
      add(i + 1, m.index + 1, '禁止使用 any 类型（定义明确的 TypeScript interface）', 'no-any');
    }
  });
}

function checkDefaultExport(lines, ext, add) {
  if (!CODE_EXT.has(ext)) return;
  const re = /export\s+default\b/g;
  lines.forEach((line, i) => {
    if (isLineDisabled(line, 'no-default-export')) return;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (inLineComment(line, m.index)) continue;
      add(i + 1, m.index + 1, '禁止默认导出（用 export function / export const 具名导出）', 'no-default-export');
    }
  });
}

/** ConfigProvider 传 theme prop（antd-mobile v5 静默忽略，只传 locale） */
function checkConfigProviderTheme(lines, ext, add) {
  if (!CODE_EXT.has(ext)) return;
  let inBlock = false;
  lines.forEach((line, i) => {
    if (isLineDisabled(line, 'no-configprovider-theme')) return;
    const s = stripComments(line, inBlock);
    inBlock = s.inBlock;
    if (!/ConfigProvider\b/.test(s.code)) return;
    // 同行检测：<ConfigProvider theme={...} /> 或 theme=xxx（已剥离注释/字符串）
    if (/theme\s*[=:]/.test(s.code)) {
      add(i + 1, 1, '禁止 ConfigProvider 传 theme prop（antd-mobile v5 静默忽略；只传 locale，主题由 CSS 变量驱动；局部覆盖用 generateMobileThemeVars()）', 'no-configprovider-theme');
      return;
    }
    // 多行属性检测：<ConfigProvider\n  theme={...}  （直到遇到 > 结束）
    if (/<ConfigProvider[^>]*$/.test(s.code)) {
      let depth = 1;
      for (let j = i + 1; j < lines.length && j < i + 8; j++) {
        if (isLineDisabled(lines[j], 'no-configprovider-theme')) break;
        const sj = stripComments(lines[j], inBlock);
        inBlock = sj.inBlock;
        if (/theme\s*[=:]/.test(sj.code)) {
          add(j + 1, 1, '禁止 ConfigProvider 传 theme prop（antd-mobile v5 静默忽略；只传 locale，主题由 CSS 变量驱动；局部覆盖用 generateMobileThemeVars()）', 'no-configprovider-theme');
          break;
        }
        depth += (sj.code.match(/</g) || []).length - (sj.code.match(/>/g) || []).length;
        if (depth <= 0) break;
      }
    }
  });
}

/** PC 专属事件（移动端不触发） */
function checkPcEvent(lines, ext, add) {
  if (!CODE_EXT.has(ext)) return;
  lines.forEach((line, i) => {
    if (isLineDisabled(line, 'no-pc-event')) return;
    PC_EVENT_RE.lastIndex = 0;
    let m;
    while ((m = PC_EVENT_RE.exec(line)) !== null) {
      if (inLineComment(line, m.index)) continue;
      add(i + 1, m.index + 1, `禁止 PC 事件 ${m[0]}（移动端不触发；用 onClick / onTouchStart）`, 'no-pc-event');
    }
  });
}

/** prefer-template：文件级启发式（≥6 个不同 MobileXxx import 时提示），warning */
function checkPreferTemplate(lines, ext, add, pkgImports) {
  if (!CODE_EXT.has(ext) || !pkgImports.size) return;
  if (isLineDisabled(lines.join('\n'), 'prefer-template')) return;
  const mobiles = [...pkgImports].filter((n) => /^Mobile/.test(n));
  if (mobiles.length >= 6) {
    const findLine = (name) => {
      const idx = lines.findIndex((l) => new RegExp(`\\b${name}\\b`).test(l) && RE_IMPORT_PKG.test(l));
      return idx === -1 ? 1 : idx + 1;
    };
    add(
      findLine(mobiles[0]),
      1,
      `本文件 import 了 ${mobiles.length} 个 MobileXxx 组件（${mobiles.slice(0, 6).join('、')}…）— 整页场景优先考虑业务模板组件（template-components 建设中），避免基础组件手动重复拼装`,
      'prefer-template',
    );
  }
}

/* ===== 主流程 ===== */

function lintFile(file) {
  const problems = [];
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return problems;
  }
  const lines = content.split(/\r?\n/);
  const ext = path.extname(file);
  const relPath = file.split(path.sep).join('/');
  const fileDisable = parseFileDisable(lines);
  if (fileDisable === 'all') return problems;

  const add = (line, col, message, rule) => {
    if (fileDisable && fileDisable.has(rule)) return;
    if (line >= 1 && isLineDisabled(lines[line - 1] || '', rule)) return;
    problems.push({ file, line, col, message, rule, level: RULE_META[rule].level });
  };

  const pkgImports = checkAntdImport(lines, ext, add, relPath);
  checkHardcodedColor(lines, ext, add, relPath);
  checkImportant(lines, ext, add);
  checkAny(lines, ext, add);
  checkDefaultExport(lines, ext, add);
  checkConfigProviderTheme(lines, ext, add);
  checkPcEvent(lines, ext, add);
  checkPreferTemplate(lines, ext, add, pkgImports);
  // unknown-props 为登记型 advisory 规则（RULE_META 已登记，供文档/AI 认知，不实际触发）
  return problems;
}

/* ===== 输出 ===== */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  red: (s) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  green: (s) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  bold: (s) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
};

function printHelp() {
  console.log(`
company-mobile-ui AI 输出校验器 v${VERSION} — 治理闭环环节③

用法：
  node ai-lint.mjs [目录或文件...]     默认扫描 ./src
  node ai-lint.mjs src --quiet         只输出 error 级

规则清单：
${Object.entries(RULE_META)
  .map(([id, r]) => `  ${r.level === 'error' ? 'E' : 'W'}  ${id.padEnd(26)}${r.brief}`)
  .join('\n')}

豁免（登记例外，不是绕过规范）：
  行级   // lint-ai-disable-line [规则名]
  文件级 /* lint-ai-disable [规则名] *​/（文件头前 10 行内）

退出码：存在 error → 1
`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  const quiet = args.includes('--quiet');
  const targets = args.filter((a) => !a.startsWith('--'));
  if (!targets.length) targets.push('src');

  const files = targets.flatMap((t) => walk(path.resolve(t)));
  if (!files.length) {
    console.log(c.yellow(`未找到可扫描的源码文件（.ts/.tsx/.js/.jsx/.scss/.css/.less）：${targets.join(' ')}`));
    process.exit(0);
  }

  let all = [];
  for (const f of files) all = all.concat(lintFile(f));
  if (quiet) all = all.filter((p) => p.level === 'error');

  const errors = all.filter((p) => p.level === 'error');
  const warnings = all.filter((p) => p.level === 'warning');

  console.log(`\ncompany-mobile-ui AI 输出校验器 v${VERSION}（治理闭环 · 环节③ 自动校验）\n`);

  if (all.length) {
    // 按文件分组输出
    const byFile = new Map();
    for (const p of all) {
      if (!byFile.has(p.file)) byFile.set(p.file, []);
      byFile.get(p.file).push(p);
    }
    for (const [file, list] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(c.bold(file));
      for (const p of list.sort((a, b) => a.line - b.line || a.col - b.col)) {
        const sev = p.level === 'error' ? c.red('error') : c.yellow('warning');
        console.log(`  ${String(p.line).padStart(4)}:${String(p.col).padEnd(3)} ${sev}  ${p.message}  ${c.dim(p.rule)}`);
      }
      console.log('');
    }
  }

  const summary =
    errors.length || warnings.length
      ? c[errors.length ? 'red' : 'yellow'](
          `✖ ${errors.length} errors, ${warnings.length} warnings（${files.length} 个文件）`,
        )
      : c.green(`✔ 0 errors, 0 warnings（${files.length} 个文件，全部合规）`);
  console.log(summary);
  if (errors.length) {
    console.log(c.dim('存在 error：请按提示修复后重新校验（AI 应自动修复并复跑，直至 0 error）'));
    process.exit(1);
  }
}

main();
