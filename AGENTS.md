# AGENTS.md - Chrome 密码管理器扩展

## 项目概述
这是一个 Chrome 扩展程序（Manifest V3），用于管理和查看账户凭证。扩展程序将平台凭证（名称、URL、包含用户名/密码的账户）存储在 Chrome 本地存储中。

## 构建、测试和开发命令

### 运行扩展程序
由于这是一个纯 JavaScript Chrome 扩展程序，没有构建系统：
- 在 Chrome 中访问 `chrome://extensions/` 加载扩展程序
- 启用"开发者模式"
- 点击"加载已解压的扩展程序"并选择扩展程序目录
- 无需构建命令 - 文件直接由 Chrome 提供

### 测试
- 仅支持手动测试 - 在 Chrome 中加载已解压的扩展程序
- 测试平台和账户的所有 CRUD 操作
- 验证剪贴板复制功能
- 测试密码可见性切换

### 代码检查
- 目前没有 ESLint 或 Prettier 配置
- 对于较大更改，考虑添加 `.eslintrc.json`

## 代码风格指南

### 一般约定
- **语言**：纯 JavaScript（ES6+）
- **不使用 TypeScript**：仅使用原生 JavaScript
- **不使用构建工具**：文件由 Chrome 直接提供服务

### 命名约定
- **变量/函数**：camelCase（`platforms`、`loadPlatforms`、`isAllVisible`）
- **常量**：UPPER_SNAKE_CASE（`PLATFORM_CONFIG`）
- **类**：不使用（函数式风格）
- **DOM 元素**：描述性命名，避免缩写

### 文件组织
- `popup.js` - 主要 UI 逻辑、DOM 操作、事件处理程序
- `background.js` - 扩展程序图标点击的服务工作线程
- `config.js` - 默认平台配置
- `manifest.json` - 扩展程序清单（MV3）
- `*.html` - 弹出窗口和索引页面
- `style.css` - 样式文件

### 函数
- 使用函数声明或函数表达式
- 保持函数专注和单一职责
- 将相关函数分组在一起
- 使用描述性名称：`renderPlatformList()`、`bindEvents()`、`copyToClipboard()`

### 变量
- 使用 `let` 声明可变变量，使用 `const` 声明不可变变量
- 避免全局命名空间污染 - 如需要使用 IIFE
- 尽可能在首次使用附近初始化变量

### Chrome API
- 使用 `chrome.storage.local` 存储持久数据
- 使用 `chrome.tabs.create()` 打开页面
- 使用 `chrome.action.onClicked` 处理扩展程序图标点击
- 始终正确处理异步回调

### 错误处理
- 对用户面向的错误使用 `alert()`（现有模式）
- 在处理前验证输入
- 检查 null/undefined 值
- 访问嵌套属性时使用可选链（`?.`）

### DOM 操作
- 使用 `document.getElementById()` 和 `document.querySelectorAll()`
- 对重复元素使用事件委托
- 使用模板字面量生成 HTML
- 重新渲染后始终重新绑定事件

### 安全注意事项
- **切勿提交真实密码** - config.js 包含占位符值
- 使用 `navigator.clipboard.writeText()` 实现复制功能
- 密码默认显示为 `••••••••`
- 考虑为生产环境添加主密码

### 导入/导出
- 不使用模块系统（无 ES6 导入）
- 通过 HTML 中的 `<script>` 标签加载脚本
- 通过全局作用域共享代码（config.js）

### 格式化
- 2 空格缩进
- 字符串使用单引号
- 对象/数组末尾使用逗号
- 语句末尾使用分号
- 最大行长度约 100 个字符

### 注释
- 除非解释复杂逻辑，否则避免使用
- 生产代码中不使用 TODO 注释
- 现有代码中使用中文注释作为 UI 标签

### 测试新功能
1. 修改相关文件
2. 在 Chrome 中重新加载扩展程序（`chrome://extensions/` -> 重新加载图标）
3. 在弹出窗口 UI 中测试
4. 如有修改，检查后台服务工作线程

### 常见模式
```javascript
// 使用委托的事件绑定
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => { ... });
});

// 异步 Chrome 存储
chrome.storage.local.get(['key'], (result) => { ... });

// 条件渲染
platforms.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

// 模态框处理
document.getElementById('modalId').style.display = 'block';
```

## 文件结构
```
chorme-plugin-pwd/
├── manifest.json      # 扩展程序清单（MV3）
├── background.js      # 服务工作线程
├── popup.js           # 主要弹出窗口逻辑
├── popup.html         # 弹出窗口 UI
├── config.js          # 默认平台配置
├── index.html         # 独立页面
├── style.css         # 样式文件
└── AGENTS.md          # 本文件
```

## 关键实现细节

### 数据模型
```javascript
// 平台结构
{
  name: string,           // 平台名称
  sort: number,          // 排序序号
  envs: [                 // 环境列表
    {
      name: string,       // 环境名称（如：生产环境、测试环境）
      url: string,        // 网站URL
      icon: string,       // 图标URL
      accounts: [         // 账号列表
        {
          name: string,   // 账号名称（可选标签）
          username: string,
          password: string
        }
      ]
    }
  ]
}
```

### 状态管理
- `platforms`: 平台数据数组
- `currentEnvIndex`: 各平台当前选中的环境索引 `{ platformIndex: envIndex }`
- `collapsedStates`: 各平台的折叠状态 `{ platformIndex: boolean }`
- `passwordStates`: 密码可见性状态 `{ platformIndex-accIndex: boolean }`

### 存储
- 使用 `chrome.storage.local`，键为 `platforms`
- 首次加载时从 `config.js` PLATFORM_CONFIG 初始化
- 所有修改通过 `savePlatforms()` 立即保存

## 给 Agent 的说明
- 这是一个简单的扩展程序 - 避免过度工程化
- 不存在测试框架 - 需要手动测试
- 无代码检查 - 保持与现有代码风格一致
- 中文 UI 标签是有意为之的（现有用户群）

# OpenCode 默认编辑器：VS Code
$env:EDITOR = "code --wait"
