---
name: "company-mobile-ui"
description: "AI Agent 消费 @donglegeyu/company-mobile-ui 移动端组件库的总入口。强制 AI 使用 MobileXxx 组件（而非 antd-mobile 原生）、遵循品牌令牌 #F95914（CSS 变量 --adm-color-* 驱动，非 React Context）、遵守触摸目标/安全区/px 单位等移动端规范。在任何使用 company-mobile-ui 的项目中生成 React 代码时必须加载。"
---

# Company Mobile UI for Agents

> **版本基准**：`@donglegeyu/company-mobile-ui@0.1.1`，基于 Ant Design Mobile 5.x，品牌主色 `#F95914`。
>
> 本 Skill 是 AI Agent 消费移动端组件库的「驾照」——确保生成的代码合规、可运行、品牌一致、符合移动端交互规范。

## 何时调用

- 用户项目已安装 `@donglegeyu/company-mobile-ui`，需要生成 React/TypeScript 代码
- 用户提到 MobileButton / MobileInput / MobileList / MobileForm 等组件名
- 用户要求生成移动端页面（H5 / 移动端后台 / 移动表单 / 列表页）
- 用户要求使用公司移动端组件库、企业 UI 规范
- 任何涉及 antd-mobile 组件的代码生成场景（应自动替换为 MobileXxx）

***

## 一、九条强制规则（违反即不合格）

### 1. 禁止使用 antd-mobile 原生组件

```tsx
// ❌ 错误
import { Button, Input, List } from 'antd-mobile';

// ✅ 正确
import { MobileButton, MobileInput, MobileList } from '@donglegeyu/company-mobile-ui';
```

**例外**：`ConfigProvider` 仅用于 `locale`（语言包）传递；`import type { ButtonProps } from 'antd-mobile'` 类型导入允许。

### 2. 禁止硬编码颜色

```tsx
// ❌ 错误
<div style={{ color: '#F95914' }}>品牌色文字</div>

// ✅ 正确（运行时消费 CSS 变量）
<div style={{ color: 'var(--adm-color-primary)' }}>品牌色文字</div>

// ✅ 也可用 mobileDesignRules 常量
import { mobileDesignRules } from '@donglegeyu/company-mobile-ui';
<div style={{ color: mobileDesignRules.colors.brand }}>品牌色文字</div>
```

### 3. 禁止使用 `!important`

```tsx
// ❌ 错误
// CSS: .my-style { color: red !important; }

// ✅ 正确：用内联 style（React 内联样式权重天然高于组件类名 CSS）
<MobileButton style={{ marginRight: mobileDesignRules.fontSize.base }}>间距按钮</MobileButton>

// ✅ 正确：深层骨架侵入用 CSS Modules + 合规层级嵌套选择器（CSS Nesting）自然胜出
```

### 4. 禁止使用 `any` 类型

```tsx
// ❌ 错误
function handleData(data: any) { ... }

// ✅ 正确
interface UserData {
  id: number;
  name: string;
}
function handleData(data: UserData) { ... }
```

### 5. 禁止默认导出

```tsx
// ❌ 错误
export default function Foo() { ... }

// ✅ 正确
export function Foo() { ... }
```

### 6. `ConfigProvider` 只传 `locale`，禁止传 `theme` prop

antd-mobile v5 的主题由 CSS 变量驱动，`<ConfigProvider>` **不支持 `theme` prop**，传了会被静默忽略。

```tsx
// ❌ 错误（会被静默忽略）
<ConfigProvider theme={themeConfig}>
  <MobileButton />
</ConfigProvider>

// ✅ 正确：局部主题覆盖用 generateMobileThemeVars() 生成 CSS 变量对象透传容器 style
import { generateMobileThemeVars, MobileButton } from '@donglegeyu/company-mobile-ui';

export const NestedThemeExample = () => {
  return (
    <div style={generateMobileThemeVars()}>
      <MobileButton color="primary">局部主题色按钮</MobileButton>
    </div>
  );
};
```

### 7. 移动端硬规范

| # | 规范 | 要求 |
|---|---|---|
| 7.1 | 触摸目标 ≥ 44×44 | 可点击元素最小尺寸用 `--mobile-touch-target` / `mobileDesignRules.touchTarget` |
| 7.2 | 安全区域适配 | 顶部/底部贴边组件用 `.mobile-safe-area-top` / `.mobile-safe-area-bottom` 或 `env(safe-area-inset-*)` |
| 7.3 | 长度单位统一 `px` | 项目已配置 `postcss-px-to-viewport-8-plugin`，严禁混用 `rem` / `em` / `vw` |
| 7.4 | 禁用 PC 事件 | 禁止 `onMouseEnter` / `onMouseLeave` / `onDoubleClick`，改用 `onClick` / `onTouchStart` |
| 7.5 | 禁用点击高亮 | 可点击元素加 `-webkit-tap-highlight-color: transparent` |

### 8. 业务模板优先于基础组件

组件优先级（从高到低）：

| 优先级 | 组件层 | 示例 | 何时使用 |
|---|---|---|---|
| 1（最高） | 业务模板 | 建设中（`template-components` 目录已就位） | 列表页 / 表单页 / 详情页等整页场景（待补充） |
| 2 | 共享组件 | `MobileIconExplorer`（图标探索器） | 业务模板不覆盖的局部场景 |
| 3（最低） | 基础组件 | `MobileButton` / `MobileInput` / `MobileList` 等 82 个 | 基础组件无法满足时的手动拼装 |

> 业务模板目录建设中：当前生成整页以基础组件拼装为主，业务模板上线后自动升级为第一优先级。

### 9. 不确定 Props 先查类型定义，不凭记忆写

```text
node_modules/@donglegeyu/company-mobile-ui/dist/es/index.d.ts
```

安装包内类型定义是唯一事实来源，不要凭训练记忆写组件 Props。

***

## 二、组件全清单（82 个基础组件 + 1 个共享组件）

全部组件从 `@donglegeyu/company-mobile-ui` 具名导出。

### 通用类（4 个）

| 组件 | 用途 |
|---|---|
| `MobileButton` | 按钮（antd-mobile Button 透传，`color` 而非 `type`） |
| `MobileIcon` | 内置线性图标（`name` 键名） |
| `MobileDotLoading` | 点状加载 |
| `MobileSpinLoading` | 圆形转圈加载 |

### 布局类（5 个）

| 组件 | 用途 |
|---|---|
| `MobileAutoCenter` | 内容自动居中 |
| `MobileDivider` | 分割线 |
| `MobileGrid` | 栅格布局（含 `MobileGrid.Item`） |
| `MobileSafeArea` | 安全区域适配 |
| `MobileSpace` | 间距容器 |

### 导航类（7 个）

| 组件 | 用途 |
|---|---|
| `MobileNavBar` | 顶部导航栏（自带返回箭头） |
| `MobileTabBar` | 底部标签栏（含 `MobileTabBar.Item`） |
| `MobileTabs` | 选项卡（含 `MobileTabs.Tab`） |
| `MobileCapsuleTabs` | 胶囊选项卡 |
| `MobileJumboTabs` | 大字号选项卡 |
| `MobileSideBar` | 侧边导航 |
| `MobileIndexBar` | 索引栏 |

### 信息录入类（24 个）

`MobileInput` / `MobileTextArea` / `MobileSwitch` / `MobileCheckbox`（含 Group）/ `MobileRadio`（含 Group）/ `MobileForm`（含 Item，配置驱动校验）/ `MobilePicker` / `MobileDatePicker` / `MobileCascader` / `MobileCascadePicker` / `MobileStepper` / `MobileRate` / `MobileSlider` / `MobileSelector` / `MobileSearchBar` / `MobileCheckList` / `MobilePickerView` / `MobileDatePickerView` / `MobileCascaderView` / `MobileCascadePickerView` / `MobileNumberKeyboard` / `MobilePasscodeInput` / `MobileImageUploader` / `MobileVirtualInput`

### 信息展示类（16 个）

`MobileList`（含 Item）/ `MobileCard` / `MobileImage` / `MobileAvatar` / `MobileCollapse` / `MobileEllipsis` / `MobileTag` / `MobileSteps` / `MobileSwiper` / `MobileSegmented` / `MobilePageIndicator` / `MobileFloatingPanel` / `MobileImageViewer` / `MobileInfiniteScroll` / `MobileWaterMark` / `MobileFooter`

### 反馈类（16 个）

`MobileDialog`（命令式 show/alert/confirm）/ `MobileToast`（命令式 show）/ `MobileActionSheet` / `MobileModal` / `MobilePopup` / `MobileCenterPopup` / `MobileMask` / `MobilePopover` / `MobileEmpty` / `MobileErrorBlock`（含 createMobileErrorBlock）/ `MobileProgressBar` / `MobileProgressCircle` / `MobileResult` / `MobileSkeleton` / `MobileSwipeAction` / `MobilePullToRefresh`

### 引导提示类（4 个）

`MobileBadge` / `MobileNoticeBar` / `MobileFloatingBubble` / `MobileScrollMask`

### 试验性类（6 个）

`MobileCalendar` / `MobileCalendarPicker` / `MobileCalendarPickerView` / `MobileDropdown` / `MobileResultPage` / `MobileTreeSelect`

### 共享组件（1 个）

`MobileIconExplorer` — 图标探索器（图标键名精选集见 `/icon-library`）

***

## 三、品牌令牌速查

移动端主题由 **CSS 变量** 驱动，与 PC 端 `theme.useToken()` 完全不同。

| Token | 值 | 用途 |
|---|---|---|
| `--adm-color-primary` | `#F95914` | 主色（antd-mobile 全局生效，默认蓝 `#1677ff` 被覆盖为品牌橙） |
| `--adm-color-wathet` | `#FFF1E6` | 浅橙背景（选中态 / 背景） |
| `--adm-color-success` | `#00B42A` | 成功 |
| `--adm-color-warning` | `#FF7D00` | 警告 |
| `--adm-color-danger` | `#F53F3F` | 危险 |
| `--mobile-color-primary` | `#F95914` | 品牌主色 |
| `--mobile-color-primary-hover` | `#E04E0E` | 按压态 |
| `--mobile-color-primary-light` | `#FFF1E6` | 浅橙背景 |
| `--mobile-touch-target` | `44px` | 最小触摸目标（Apple HIG） |
| `--mobile-radius-base` | `8px` | 基础圆角（sm 6 / base 8 / lg 12 / full 9999） |

代码内读取方式（三选一，优先级从高到低）：

1. **CSS 变量**：`color: var(--adm-color-primary)`
2. **`mobileDesignRules` 常量**：`mobileDesignRules.colors.brand`（`#F95914`）、`mobileDesignRules.touchTarget`（`44`）、`mobileDesignRules.fontSize.base`（`14px`）
3. **`useMobileToken()`**：返回同一份 `mobileDesignRules` 常量，供业务组件引用

局部主题覆盖（嵌套子树换主题色）用 `generateMobileThemeVars()` 生成 CSS 变量对象透传容器 `style`，**禁止** `<ConfigProvider theme={...}>`。

***

## 四、移动端规范红线（与 PC 端的关键差异）

| # | 规范 | 说明 |
|---|---|---|
| 1 | 触摸目标 ≥ 44×44 | 可点击元素最小尺寸用 `--mobile-touch-target` / `mobileDesignRules.touchTarget` |
| 2 | 安全区域适配 | 顶部/底部贴边组件用 `.mobile-safe-area-top` / `.mobile-safe-area-bottom` 工具类或 `env(safe-area-inset-*)` |
| 3 | 长度单位统一 `px` | 项目已配置 `postcss-px-to-viewport-8-plugin`，严禁混用 `rem` / `em` / `vw` |
| 4 | 禁用 PC 事件 | 禁止 `onMouseEnter` / `onMouseLeave` / `onDoubleClick`，改用 `onClick` / `onTouchStart` |
| 5 | 禁用点击高亮 | 可点击元素加 `-webkit-tap-highlight-color: transparent`（`body` 已全局配置） |

***

## 五、15 个高频反模式

| # | 反模式 | 正确做法 |
|---|---|---|
| 1 | `import { Button } from 'antd-mobile'` | `import { MobileButton } from '@donglegeyu/company-mobile-ui'` |
| 2 | `style={{ color: '#F95914' }}` | `var(--adm-color-primary)` 或 `mobileDesignRules.colors.brand` |
| 3 | `<ConfigProvider theme={themeConfig}>` | ConfigProvider 只传 `locale`；局部主题覆盖用 `generateMobileThemeVars()` 透传容器 style |
| 4 | `<Button type="primary">` | `<MobileButton color="primary">`（antd-mobile 用 `color`，不是 `type`） |
| 5 | `export default function Foo()` | `export function Foo()` |
| 6 | `function handle(data: any)` | 定义 interface |
| 7 | CSS `!important` | 内联 `style`（权重天然更高）或 CSS Modules 合规层级选择器 |
| 8 | `onMouseEnter` / `onMouseLeave` / `onDoubleClick` | `onClick` / `onTouchStart`（移动端不触发 PC 事件） |
| 9 | 长度单位混用 `rem` / `em` / `vw` | 统一 `px`（postcss-px-to-viewport 已配置） |
| 10 | 忘记 `MobileThemeProvider` 包裹 | 入口 `<MobileThemeProvider><App /></MobileThemeProvider>`（只传 locale） |
| 11 | 凭记忆写 props 名称 | 先查 `node_modules/@donglegeyu/company-mobile-ui/dist/es/index.d.ts` |
| 12 | 可点击元素小于 44×44 | 用 `--mobile-touch-target` / `mobileDesignRules.touchTarget` |
| 13 | 底部按钮被 iPhone 下巴遮挡 | 用 `.mobile-safe-area-bottom` / `env(safe-area-inset-bottom)` |
| 14 | 点击出现灰色高亮闪烁 | 加 `-webkit-tap-highlight-color: transparent` |
| 15 | 用 `theme.useToken()`（PC 心智） | 移动端主题非 React Context，用 CSS 变量 / `mobileDesignRules` |

**核心心智：移动端主题是 CSS 变量，不是 React Context**——这是与 PC 端最大的区别，也是 AI 最容易踩的坑。

***

## 六、常用组合速查

业务模板建设中，当前以基础组件拼装。以下是最常用的四个组合。

### 页面骨架（MobileNavBar + 内容 + MobileTabBar）

```tsx
import React, { useState } from 'react';
import {
  MobileNavBar,
  MobileTabBar,
  MobileList,
} from '@donglegeyu/company-mobile-ui';

export function HomePage() {
  const [activeKey, setActiveKey] = useState('home');
  return (
    <div className="mobile-safe-area-top" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MobileNavBar onBack={() => {}}>首页</MobileNavBar>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <MobileList>
          <MobileList.Item description="列表项描述">列表标题</MobileList.Item>
        </MobileList>
      </div>
      <MobileTabBar activeKey={activeKey} onChange={setActiveKey}>
        <MobileTabBar.Item key="home" title="首页" />
        <MobileTabBar.Item key="mine" title="我的" />
      </MobileTabBar>
    </div>
  );
}
```

要点：
- 顶部/底部贴边容器加 `.mobile-safe-area-top` / `.mobile-safe-area-bottom`
- 中部内容区 `flex: 1; overflow: auto` 承担滚动
- `MobileTabBar.Item` 的 `icon` 用 `MobileIcon`，图标键名查 `/icon-library` 精选集

### 表单页（MobileForm）

```tsx
import React from 'react';
import { MobileForm, MobileInput, MobileButton } from '@donglegeyu/company-mobile-ui';
import type { MobileFormProps } from '@donglegeyu/company-mobile-ui';

interface FormValues {
  name: string;
  phone: string;
}

export function LoginForm() {
  const handleFinish: MobileFormProps<FormValues>['onFinish'] = (values) => {
    console.log(values);
  };
  return (
    <MobileForm
      layout="horizontal"
      footer={
        <MobileButton block color="primary" size="large" type="submit">
          提交
        </MobileButton>
      }
      onFinish={handleFinish}
    >
      <MobileForm.Item name="name" label="姓名" rules={[{ required: true }]}>
        <MobileInput placeholder="请输入姓名" />
      </MobileForm.Item>
      <MobileForm.Item name="phone" label="手机号" rules={[{ required: true }]}>
        <MobileInput type="tel" placeholder="请输入手机号" />
      </MobileForm.Item>
    </MobileForm>
  );
}
```

要点：
- 表单校验用 `Form.Item rules`（配置驱动），**不要**手写校验逻辑
- 提交按钮用 `type="submit"` 挂在 `footer`，`onFinish` 接收校验通过的值

### 列表页（MobileSearchBar + MobileList）

```tsx
import React, { useState } from 'react';
import { MobileSearchBar, MobileList, MobileEmpty } from '@donglegeyu/company-mobile-ui';

interface UserItem {
  id: number;
  name: string;
}

export function UserList() {
  const [keyword, setKeyword] = useState('');
  const list: UserItem[] = []; // 实际从接口获取：(list || []).map(...)

  return (
    <div>
      <MobileSearchBar
        placeholder="搜索用户"
        value={keyword}
        onChange={setKeyword}
        onSearch={(val) => console.log('搜索：', val)}
      />
      {list.length === 0 ? (
        <MobileEmpty description="暂无数据" />
      ) : (
        <MobileList>
          {list.map((item) => (
            <MobileList.Item key={item.id} description={`ID: ${item.id}`}>
              {item.name}
            </MobileList.Item>
          ))}
        </MobileList>
      )}
    </div>
  );
}
```

要点：
- 数组 `.map()` 前空数组兜底（`(list || []).map(...)`），防止空指针白屏
- 空态用 `MobileEmpty`，不要手写"暂无数据"文案

### 反馈提示（MobileToast / MobileDialog）

```tsx
import { MobileToast, MobileDialog, MobileButton } from '@donglegeyu/company-mobile-ui';

export function FeedbackDemo() {
  const handleDelete = async () => {
    const confirmed = await MobileDialog.confirm({
      content: '确定删除该记录？',
    });
    if (confirmed) {
      MobileToast.show({ content: '删除成功' });
    }
  };
  return <MobileButton color="danger" onClick={handleDelete}>删除</MobileButton>;
}
```

要点：
- 命令式反馈用 `MobileToast.show` / `MobileDialog.confirm`（返回 Promise）
- 删除等危险操作先 `confirm` 再执行，**不要**直接删

***

## 七、防白屏清单

- 读取多层嵌套对象属性用可选链：`data?.result?.list`
- `.map()` / `.filter()` 前空数组兜底：`(list || []).map(...)`
- 异步请求 / `JSON.parse` 用 `try...catch` 包裹
- 业务复合组件内部应有 Error Boundary，局部脏数据崩溃降级为占位提示，严禁白屏

***

## 八、生成后自动校验（治理闭环环节③）

生成代码不是终点，**校验通过才是**。生成后必须运行校验器，0 error 才算完成：

```bash
curl -O https://raw.githubusercontent.com/donglegeyu/company-mobile-ui-skills/main/scripts/ai-lint.mjs
node ai-lint.mjs src/
```

规则清单：

| 规则 | 级别 | 说明 |
|---|---|---|
| `no-antd-mobile-import` | error | 禁止从 antd-mobile 导入白名单外组件（用 `MobileXxx`；`import type` 豁免；`ConfigProvider` 仅用于 locale） |
| `no-hardcoded-color` | error | 禁止硬编码 `#hex` / `rgb()`（用 `var(--adm-color-*)` / `var(--mobile-color-*)` / `mobileDesignRules`） |
| `no-important` | error | 禁止 `!important`（用内联 `style` 或 CSS Modules 合规层级选择器） |
| `no-any` | error | 禁止 `any`（定义明确的 TypeScript interface） |
| `no-default-export` | error | 禁止默认导出（用 `export function` / `export const`） |
| `no-configprovider-theme` | error | 禁止 `ConfigProvider` 传 `theme` prop（antd-mobile v5 静默忽略） |
| `no-pc-event` | warning | 禁止 `onMouseEnter` / `onMouseLeave` / `onDoubleClick`（移动端不触发） |
| `prefer-template` | warning | 业务模板优先（建设中占位），不手动重复拼装 |
| `unknown-props` | warning | 不确定 Props 时查类型定义，不凭记忆写 |

豁免机制（登记例外，不是绕过规范）：

```text
行级：  <MobileButton>ok</MobileButton>  // lint-ai-disable-line no-antd-mobile-import
行级：  <MobileButton>ok</MobileButton>  // lint-ai-disable-line        （豁免该行全部规则）
文件级：/* lint-ai-disable no-hardcoded-color */            （文件头前 10 行内，豁免单条规则）
文件级：/* lint-ai-disable */                               （豁免本文件全部规则）
```

***

## 九、与已有 Skill 的关系

| Skill | 定位 |
|---|---|
| `company-mobile-ui`（本 Skill） | 移动端组件库消费总入口，规则基座 |
| `company-ui-for-agents`（PC 端） | PC 组件库规则基座，与本 Skill 主题机制不同（`theme.useToken()` vs CSS 变量） |

两个 Skill 的组件命名（`MobileXxx` vs `CompanyXxx`）和主题机制（CSS 变量 vs React Context）**完全不同**，生成代码前必须确认目标端，严禁混用。
