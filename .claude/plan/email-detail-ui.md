# EmailDetail UI 优化方案

## 状态：✅ 已实施

## 优化项

### 1. 三段式布局视觉层次
- **标题区**：`bg-background`（无特殊背景），突出邮件主题
- **信息区**：`bg-muted/30 dark:bg-card`，微妙的层级差异
- **正文区**：ScrollArea，内缩分隔线 `mx-6` 暗示内容连续性

### 2. 发件人信息排版
- 第一行：发件人名 + 翻译按钮（justify-between）
- 第二行：邮箱地址（独立行，mt-0.5）
- 第三行：收件人 + 时间（圆点分隔，mt-2）

### 3. 翻译按钮三态
| 状态 | variant | 样式 | 图标 |
|---|---|---|---|
| 未翻译 | ghost | text-muted-foreground | Languages |
| 翻译中 | outline | border-primary/30 disabled | Loader2 spin |
| 已翻译 | secondary | bg-primary/10 text-primary border-primary/20 | ArrowLeftRight |

### 4. 正文阅读体验
- 纯文本：`text-[15px] leading-7 max-w-[65ch]`
- 内容容器：`px-6 py-5`
- 翻译提示条：`border-l-2 border-primary/40 rounded-lg` + AnimatePresence

### 5. 空状态
- 三层叠放信封效果（rotate-6, -rotate-3）
- 渐进入场动画

### 6. 响应式
- 使用 `useDevice()` 的 `isMobile` 适配移动端
- 移动端减小 padding、字号

## 修改文件
- `src/components/email/EmailDetail.tsx`
- `src/components/email/EmailContent.tsx`
