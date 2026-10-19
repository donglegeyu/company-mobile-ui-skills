# company-mobile-ui-skills

AI Agent Skill for `@donglegeyu/company-mobile-ui` — an enterprise mobile component library based on Ant Design Mobile 5 with brand color `#F95914`.

## Install

```bash
npx skills add donglegeyu/company-mobile-ui-skills
```

## What it does

This Skill ensures AI coding agents (Trae, Cursor, Claude Code, Copilot, etc.) correctly use the `@donglegeyu/company-mobile-ui` component library:

- **83 components**: 82 basic components (8 groups) + 1 shared component (MobileIconExplorer)

- **Brand tokens**: CSS variables — `--adm-color-primary: #F95914`, wathet `#FFF1E6`, hover `#E04E0E`, touch target `44px`

- **Theme mechanism (KEY DIFFERENCE from PC)**: antd-mobile v5 themes via **CSS variables** (`--adm-color-*`), NOT React Context. `ConfigProvider` only takes `locale` — **never pass `theme` prop** (silently ignored). Local theme override uses `generateMobileThemeVars()` passed to a container `style`, not a Provider.

- **9 red-line rules**: no antd-mobile native components / no hardcoded colors / no `!important` / no `any` / no default exports / no ConfigProvider theme prop / no PC events (onMouseEnter etc.) / business templates first / check types before writing props

- **Mobile-specific spec**: touch targets ≥ 44×44, safe-area insets (`.mobile-safe-area-top`/`.mobile-safe-area-bottom`), px units only (no rem/em/vw), `-webkit-tap-highlight-color: transparent`

## Quick Start for AI Agents

Paste this prompt into your AI agent (Trae, Cursor, Claude Code, Copilot, etc.):

```markdown
本组件库是 @donglegeyu/company-mobile-ui（版本 0.1.1），基于 Ant Design Mobile 5.x 深度定制，品牌主色 #F95914。

如果你可以安装 skills，请运行：
npx skills add donglegeyu/company-mobile-ui-skills

在编写任何代码之前，请先阅读：
- `https://raw.githubusercontent.com/donglegeyu/company-mobile-ui-skills/main/llms.txt`（规则与组件清单，必读）
- `https://raw.githubusercontent.com/donglegeyu/company-mobile-ui-skills/main/design.md`（设计语言，按需）
- `https://raw.githubusercontent.com/donglegeyu/company-mobile-ui-skills/main/llms-full.txt`（全部组件文档，用到哪个组件查哪个章节，不必通读）

关键规则：
1) 始终使用 MobileXxx 组件（如 MobileButton，而非 Button），从 @donglegeyu/company-mobile-ui 导入。白名单例外：仅 ConfigProvider（且只用于 locale）
2) 禁止硬编码颜色 — 使用 var(--adm-color-*) / var(--mobile-color-*) CSS 变量或 mobileDesignRules 常量
3) 禁止使用 !important — 用内联 style（权重天然更高）或 CSS Modules 合规层级选择器
4) 禁止使用 any 类型 — 定义明确的 TypeScript interface
5) 禁止默认导出 — 用 export function / export const
6) 主题机制（与 PC 端完全不同）：antd-mobile v5 由 CSS 变量驱动，ConfigProvider 禁止传 theme prop（会被静默忽略），只传 locale；局部主题覆盖用 generateMobileThemeVars() 生成的 CSS 变量对象透传容器 style，作用于整个子树
7) 移动端硬规范：可点击元素 ≥ 44×44；贴边组件用 .mobile-safe-area-top / .mobile-safe-area-bottom 适配安全区域；单位统一 px；禁止 onMouseEnter / onMouseLeave / onDoubleClick 等 PC 事件；可点击元素加 -webkit-tap-highlight-color: transparent
8) 业务模板优先：业务模板（建设中）→ 共享组件（MobileIconExplorer）→ 基础组件手动拼装
9) 不确定组件 props 时，先查已安装包的类型定义（node_modules/@donglegeyu/company-mobile-ui/dist/es/index.d.ts），不要凭记忆写；未安装或无法读文件时，查 llms-full.txt 中该组件的章节
10) 页面骨架组合速查：MobileNavBar + MobileTabBar（导航）、MobileForm 表单、MobileSearchBar + MobileList（列表）、MobileToast + MobileDialog（反馈）——详见 SKILL.md 常用组合速查
11) 防白屏：多层嵌套属性用可选链（data?.result?.list）；数组 map/filter 前先空数组兜底（(list || []).map(...)）；高危复合组件内部自带 Error Boundary，局部错误不得导致整页白屏
12) 生成代码后运行校验：npm run lint:ai（零依赖，9 条规则自动检查）；需要豁免时用 // lint-ai-disable-line [规则名] 或 /* lint-ai-disable [规则名] */
```

## Documentation

- **Online docs**: local dev `npm run dev`（端口 8003，AI 接入 /for-agents 栏目）

- **LLMs.txt**: <https://raw.githubusercontent.com/donglegeyu/company-mobile-ui-skills/main/llms.txt>

- **design.md**: <https://raw.githubusercontent.com/donglegeyu/company-mobile-ui-skills/main/design.md>

- **Governance**: 治理闭环五环（规范源 → AI 生成 → ai-lint.mjs 自动校验 → 人工评审 → 反馈回写），详见 docs/for-agents/governance.md

## Structure

```
company-mobile-ui-skills/
├── skills/
│   └── company-mobile-ui/
│       └── SKILL.md        # The Skill file loaded by AI agents
├── scripts/
│   ├── ai-lint.mjs         # 零依赖 AI 生成代码校验器（9 条规则）
│   └── gen-llms.mjs        # 从组件库 docs 生成 llms-full.txt
├── llms.txt                # 规则与组件清单（协议格式）
├── llms-full.txt           # 全量组件文档（由 gen-llms.mjs 生成）
├── design.md               # 设计语言（面向 AI 设计工具）
└── README.md
```

## License

MIT
