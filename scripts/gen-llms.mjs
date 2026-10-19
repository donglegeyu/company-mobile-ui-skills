#!/usr/bin/env node
/**
 * company-mobile-ui llms-full.txt 生成器
 *
 * 遍历 mobile-ui 的 docs/basic-components/*.md 与 docs/template-components/*.md，
 * 解析 frontmatter title + 正文，按 8 个组件分组合并输出 llms-full.txt。
 * 输出内容 = 头部（版本 + 九条强制规则 + 移动端专属规范）+ 全量组件文档。
 *
 * 用法：
 *   node gen-llms.mjs [mobile-ui-root] [output-file]
 *
 *   mobile-ui-root  组件库仓库根目录（含 docs/），默认 process.cwd()
 *   output-file     输出路径，默认 <脚本目录>/../llms-full.txt（即 skills 仓库根）
 *
 * 组件库仓库内已注册脚本：npm run gen:llms（传入 mobile-ui 根路径）。
 * 生成后需同步复制到 company-mobile-ui-skills 仓库并推送 GitHub。
 *
 * 零依赖（纯 Node.js）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VERSION = '1.0.0';
const LIB_NAME = '@donglegeyu/company-mobile-ui';
const LIB_VERSION = '0.1.1';

/** 组件文件名（mobile-xxx.md）→ 分组（8 组，与 .dumirc.ts sidebar 一致） */
const GROUP_MAP = {
  // 通用
  'mobile-icon': '通用', 'mobile-button': '通用', 'mobile-dot-loading': '通用', 'mobile-spin-loading': '通用',
  // 布局
  'mobile-auto-center': '布局', 'mobile-divider': '布局', 'mobile-grid': '布局', 'mobile-safe-area': '布局', 'mobile-space': '布局',
  // 导航
  'mobile-nav-bar': '导航', 'mobile-tab-bar': '导航', 'mobile-tabs': '导航', 'mobile-capsule-tabs': '导航',
  'mobile-jumbo-tabs': '导航', 'mobile-side-bar': '导航', 'mobile-index-bar': '导航',
  // 信息录入
  'mobile-input': '信息录入', 'mobile-text-area': '信息录入', 'mobile-switch': '信息录入',
  'mobile-checkbox': '信息录入', 'mobile-radio': '信息录入', 'mobile-form': '信息录入',
  'mobile-picker': '信息录入', 'mobile-date-picker': '信息录入', 'mobile-cascader': '信息录入',
  'mobile-cascade-picker': '信息录入', 'mobile-stepper': '信息录入', 'mobile-rate': '信息录入',
  'mobile-slider': '信息录入', 'mobile-selector': '信息录入', 'mobile-search-bar': '信息录入',
  'mobile-check-list': '信息录入', 'mobile-picker-view': '信息录入', 'mobile-date-picker-view': '信息录入',
  'mobile-cascader-view': '信息录入', 'mobile-cascade-picker-view': '信息录入',
  'mobile-number-keyboard': '信息录入', 'mobile-passcode-input': '信息录入',
  'mobile-image-uploader': '信息录入', 'mobile-virtual-input': '信息录入',
  // 信息展示
  'mobile-list': '信息展示', 'mobile-card': '信息展示', 'mobile-image': '信息展示',
  'mobile-avatar': '信息展示', 'mobile-collapse': '信息展示', 'mobile-ellipsis': '信息展示',
  'mobile-tag': '信息展示', 'mobile-steps': '信息展示', 'mobile-swiper': '信息展示',
  'mobile-segmented': '信息展示', 'mobile-page-indicator': '信息展示', 'mobile-floating-panel': '信息展示',
  'mobile-image-viewer': '信息展示', 'mobile-infinite-scroll': '信息展示', 'mobile-water-mark': '信息展示',
  'mobile-footer': '信息展示',
  // 反馈
  'mobile-dialog': '反馈', 'mobile-toast': '反馈', 'mobile-action-sheet': '反馈',
  'mobile-modal': '反馈', 'mobile-popup': '反馈', 'mobile-center-popup': '反馈',
  'mobile-mask': '反馈', 'mobile-popover': '反馈', 'mobile-empty': '反馈',
  'mobile-error-block': '反馈', 'mobile-progress-bar': '反馈', 'mobile-progress-circle': '反馈',
  'mobile-result': '反馈', 'mobile-skeleton': '反馈', 'mobile-swipe-action': '反馈',
  'mobile-pull-to-refresh': '反馈',
  // 引导提示
  'mobile-badge': '引导提示', 'mobile-notice-bar': '引导提示', 'mobile-floating-bubble': '引导提示',
  'mobile-scroll-mask': '引导提示',
  // 试验性
  'mobile-calendar': '试验性', 'mobile-calendar-picker': '试验性', 'mobile-calendar-picker-view': '试验性',
  'mobile-dropdown': '试验性', 'mobile-result-page': '试验性', 'mobile-tree-select': '试验性',
};

const GROUP_ORDER = ['通用', '布局', '导航', '信息录入', '信息展示', '反馈', '引导提示', '试验性'];

/** 解析 frontmatter：返回 { title, body } */
function parseMd(file) {
  const content = fs.readFileSync(file, 'utf8');
  let title = '';
  let body = content;
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const fm = content.slice(3, end);
      const tm = fm.match(/^title:\s*(.+)$/m);
      if (tm) title = tm[1].trim();
      body = content.slice(end + 4).replace(/^\n/, '');
    }
  }
  return { title, body };
}

/** 头部：九条强制规则 + 移动端专属规范 */
function header() {
  return `# ${LIB_NAME} — llms-full.txt

> ${LIB_NAME}@${LIB_VERSION}，基于 Ant Design Mobile 5.x，品牌主色 #F95914。
> 本文件由 scripts/gen-llms.mjs 自动生成，将全部组件文档合并为一个纯文本文件。
> 生成命令：npm run gen:llms

## 九条强制规则（AI Agent 生成代码必须遵守）

1. 禁止使用 antd-mobile 原生组件 — 用 MobileXxx（如 MobileButton，不用 Button）；import type 类型导入允许；ConfigProvider 仅用于 locale
2. 禁止硬编码颜色 — 用 var(--adm-color-*) / var(--mobile-color-*) 或 mobileDesignRules 常量
3. 禁止使用 !important — 用内联 style（权重天然更高）或 CSS Modules 合规层级选择器
4. 禁止使用 any 类型 — 定义明确的 TypeScript interface
5. 禁止默认导出 — 用 export function / export const
6. ConfigProvider 只传 locale，禁止传 theme prop（antd-mobile v5 静默忽略）；局部覆盖用 generateMobileThemeVars() 透传容器 style
7. 移动端硬规范：可点击元素 ≥ 44×44（--mobile-touch-target）；贴边组件用 .mobile-safe-area-top/.mobile-safe-area-bottom；单位统一 px（禁 rem/em/vw）；禁止 onMouseEnter/onMouseLeave/onDoubleClick 等 PC 事件；-webkit-tap-highlight-color: transparent
8. 业务模板优先于基础组件：业务模板（建设中）→ 共享组件（MobileIconExplorer）→ 基础组件手动拼装
9. 不确定 Props 先查类型定义（node_modules/@donglegeyu/company-mobile-ui/dist/es/index.d.ts），不要凭记忆写

## 移动端专属规范

- 触摸目标 ≥ 44×44（--mobile-touch-target / mobileDesignRules.touchTarget）
- 安全区域适配：.mobile-safe-area-top / .mobile-safe-area-bottom / env(safe-area-inset-*)
- 长度单位统一 px（项目配置 postcss-px-to-viewport-8-plugin，禁混用 rem/em/vw）
- 禁用 PC 事件（onMouseEnter / onMouseLeave / onDoubleClick），用 onClick / onTouchStart
- 可点击元素加 -webkit-tap-highlight-color: transparent

## 主题机制速查

| Token | 值 | 用途 |
|---|---|---|
| --adm-color-primary | #F95914 | 主色（覆盖 antd-mobile 默认蓝 #1677ff） |
| --adm-color-wathet | #FFF1E6 | 浅橙背景（选中态/背景） |
| --adm-color-success | #00B42A | 成功 |
| --adm-color-warning | #FF7D00 | 警告 |
| --adm-color-danger | #F53F3F | 危险 |
| --mobile-color-primary-hover | #E04E0E | 按压态 |
| --mobile-touch-target | 44px | 最小触摸目标 |
| --mobile-radius-base | 8px | 基础圆角（sm 6 / base 8 / lg 12 / full 9999） |

运行时读取：CSS 变量 var(--adm-color-primary) → mobileDesignRules 常量 → useMobileToken()。

---

`;
}

function main() {
  const args = process.argv.slice(2);
  const root = args[0] ? path.resolve(args[0]) : process.cwd();
  const outFile = args[1]
    ? path.resolve(args[1])
    : path.join(__dirname, '..', 'llms-full.txt');

  const basicDir = path.join(root, 'docs', 'basic-components');
  const templateDir = path.join(root, 'docs', 'template-components');

  if (!fs.existsSync(basicDir)) {
    console.error(`找不到组件文档目录：${basicDir}`);
    console.error('用法：node gen-llms.mjs [mobile-ui-root] [output-file]');
    process.exit(1);
  }

  // 按 8 组收集基础组件文档
  const groups = new Map(GROUP_ORDER.map((g) => [g, []]));
  for (const name of fs.readdirSync(basicDir)) {
    if (!name.endsWith('.md')) continue;
    const base = name.replace(/\.md$/, '');
    const group = GROUP_MAP[base] || '其他';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ name, base, group });
  }

  // 模板组件目录
  const templates = [];
  if (fs.existsSync(templateDir)) {
    for (const name of fs.readdirSync(templateDir)) {
      if (!name.endsWith('.md')) continue;
      templates.push(name);
    }
  }

  const out = [];
  out.push(header());

  // ===== 基础组件（按 8 组） =====
  out.push('# 基础组件\n');
  for (const group of GROUP_ORDER) {
    const list = groups.get(group) || [];
    if (!list.length) continue;
    out.push(`## ${group}（${list.length} 个）\n`);
    for (const item of list) {
      const { title, body } = parseMd(path.join(basicDir, item.name));
      out.push(`### ${title || item.base}\n`);
      out.push(body.trim());
      out.push('\n---\n');
    }
  }

  // ===== 共享组件 =====
  out.push('# 共享组件\n');
  out.push('## MobileIconExplorer — 图标探索器\n');
  out.push('图标键名精选集见 /icon-library；其他共享组件建设中。\n\n---\n');

  // ===== 业务模板 =====
  out.push('# 业务模板\n');
  if (templates.length) {
    for (const name of templates) {
      const { title, body } = parseMd(path.join(templateDir, name));
      out.push(`## ${title || name.replace(/\.md$/, '')}\n`);
      out.push(body.trim());
      out.push('\n---\n');
    }
  } else {
    out.push('template-components 目录已就位，内容建设中。当前生成整页以基础组件拼装为主。\n');
  }

  fs.writeFileSync(outFile, out.join('\n'), 'utf8');
  const count = [...groups.values()].reduce((a, l) => a + l.length, 0);
  console.log(`✔ 已生成 llms-full.txt（${count} 个基础组件 + ${templates.length} 个业务模板 + 共享组件）`);
  console.log(`  输出：${outFile}`);
}

main();
