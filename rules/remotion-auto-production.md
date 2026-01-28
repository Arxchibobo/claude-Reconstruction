# Remotion 自动化视频生产规则

> **核心原则**: 用户只需描述需求，系统自动匹配风格、生成代码

---

## 🎯 工作流程（自动执行）

```
用户简单描述需求
    ↓
自动分析场景类型 → 自动匹配设计风格 → 自动填充技术参数 → 直接生成代码
    ↓
输出完整的 Remotion 项目（包含素材生成指令）
```

---

## 📋 自动决策矩阵

### 场景类型识别（关键词触发）

| 用户需求关键词 | 场景类型 | 自动选择的风格 |
|--------------|---------|---------------|
| "产品演示"、"SaaS"、"科技" | 产品演示 | Glassmorphism + Tech Innovation |
| "社交媒体"、"短视频"、"Reels" | 社交内容 | Synthwave / Cyberpunk |
| "教程"、"教学"、"如何" | 教育视频 | Clean Modern + Minimalist |
| "数据"、"报告"、"分析" | 数据可视化 | Business Pro + Charts |
| "品牌"、"故事"、"宣传" | 品牌视频 | Creative Vibrant / Claymorphism |
| "游戏"、"酷炫"、"电竞" | 游戏/电竞 | Cyberpunk + Neon |
| "复古"、"怀旧"、"80年代" | 复古风 | Synthwave + Memphis |
| "简洁"、"高端"、"极简" | 高端品牌 | Minimalist + Japanese Zen |

### 自动配色方案

| 风格 | 主色 | 辅助色 | 背景色 | 强调色 |
|------|------|--------|--------|--------|
| **Tech Innovation** | #0066ff | #00ffff | #1e1e1e | #FFFFFF |
| **Synthwave** | #ff006e | #8338ec | #3a86ff | #FFFF00 |
| **Business Pro** | #1C2833 | #F39C12 | #F4F6F6 | #E74C3C |
| **Creative Vibrant** | #E76F51 | #2A9D8F | #264653 | #F4A261 |
| **Cyberpunk** | #00FFFF | #FF00FF | #0A0E27 | #FFFF00 |
| **Clean Modern** | #2C3E50 | #3498DB | #ECF0F1 | #E74C3C |
| **Minimalist** | #000000 | #FFFFFF | #F5F5F5 | #FF0000 |
| **Claymorphism** | #A8DADC | #F1FAEE | #457B9D | #E63946 |

### 自动技术栈选择

| 场景特征 | 自动启用的技术 |
|---------|---------------|
| 包含"3D"、"立体"、"旋转" | Three.js + React Three Fiber |
| 包含"粒子"、"特效"、"背景" | Processing Creative Skill |
| 包含"图表"、"数据"、"增长" | Chart animations + interpolate |
| 包含"字幕"、"文字"、"说明" | DisplayCaptions (TikTok风格) |
| 包含"音乐"、"节奏"、"节拍" | Audio visualization + useAudioData |
| 包含"卡通"、"可爱"、"动画" | Lottie animations |
| 包含"照片"、"图片"、"素材" | Nano Banana Pro 生成 |

### 自动分辨率选择

| 用户提及 | 自动设置 |
|---------|---------|
| "Instagram"、"竖屏"、"手机" | 1080x1920 (9:16) |
| "YouTube"、"横屏"、"电脑" | 1920x1080 (16:9) |
| "正方形"、"微信"、"朋友圈" | 1080x1080 (1:1) |
| "4K"、"高清" | 3840x2160 (16:9) |
| 未提及 | 1920x1080 (16:9) 默认 |

### 自动帧率选择

| 场景类型 | 自动设置帧率 |
|---------|-------------|
| 游戏/电竞/酷炫特效 | 60fps |
| 社交媒体/快节奏 | 30fps |
| 教育/数据报告 | 30fps |
| 品牌故事/电影感 | 24fps |

---

## 🤖 自动生成流程

### Step 1: 需求分析（自动）

```python
def analyze_user_request(request: str):
    """自动分析用户需求"""

    # 提取关键信息
    scene_type = extract_scene_type(request)  # 产品演示/教育/数据等
    duration = extract_duration(request) or 30  # 默认30秒
    resolution = extract_resolution(request) or "1920x1080"

    # 情感分析
    mood = analyze_mood(request)  # 科技感/温暖/专业/酷炫

    # 自动匹配风格
    design_style = match_design_style(scene_type, mood)
    color_scheme = get_color_scheme(design_style)

    # 自动选择技术栈
    tech_stack = select_tech_stack(request)

    return {
        "scene_type": scene_type,
        "duration": duration,
        "resolution": resolution,
        "design_style": design_style,
        "color_scheme": color_scheme,
        "tech_stack": tech_stack
    }
```

### Step 2: 结构化 Prompt 生成（自动）

```python
def generate_structured_prompt(analysis):
    """根据分析结果自动生成完整的结构化 prompt"""

    prompt = f"""
创建 Remotion 视频项目：

【基本信息】
- 标题：{analysis.title}
- 时长：{analysis.duration}秒
- 比例：{analysis.aspect_ratio}
- 用途：{analysis.purpose}

【设计风格】（自动匹配）
- 主风格：{analysis.design_style}
- 配色方案：
  * 主色：{analysis.colors.primary}
  * 辅助色：{analysis.colors.secondary}
  * 背景色：{analysis.colors.background}
  * 强调色：{analysis.colors.accent}
- 动画风格：{analysis.animation_style}

【场景分镜】（自动设计）
{auto_generate_scenes(analysis)}

【技术需求】（自动启用）
{auto_select_tech_features(analysis)}

【素材需求】（自动生成指令）
{auto_generate_asset_commands(analysis)}

【输出要求】
- 分辨率：{analysis.resolution}
- 帧率：{analysis.fps}fps
- 格式：MP4（高质量）
"""

    return prompt
```

### Step 3: 代码生成（自动）

直接生成完整的 Remotion 项目结构：

```
/my-video-project
  /src
    /components
      Scene1.tsx  # 自动生成
      Scene2.tsx  # 自动生成
      Scene3.tsx  # 自动生成
    /assets
      # Nano Banana Pro 生成指令
    /utils
      animations.ts  # 预设动画函数
    Root.tsx  # 主组件
    index.ts  # 注册组件
  /public
    # 静态资源
  package.json
  remotion.config.ts
```

---

## 🎨 设计决策规则

### 配色自动调整

```typescript
function auto_adjust_colors(scene_type: string, mood: string) {
  // 科技感 → 冷色调（蓝/青/紫）
  if (mood === "tech" || scene_type === "product") {
    return {
      primary: "#0066ff",
      secondary: "#00ffff",
      background: "#1e1e1e",
      accent: "#FFFFFF"
    };
  }

  // 温暖/友好 → 暖色调（橙/黄/粉）
  if (mood === "warm" || scene_type === "brand_story") {
    return {
      primary: "#E76F51",
      secondary: "#F4A261",
      background: "#FFFBF7",
      accent: "#2A9D8F"
    };
  }

  // 专业/商务 → 中性色（灰/蓝/红强调）
  if (mood === "professional" || scene_type === "data") {
    return {
      primary: "#2C3E50",
      secondary: "#34495E",
      background: "#ECF0F1",
      accent: "#E74C3C"
    };
  }

  // 酷炫/游戏 → 霓虹色（品红/青/黄）
  if (mood === "cool" || scene_type === "gaming") {
    return {
      primary: "#00FFFF",
      secondary: "#FF00FF",
      background: "#0A0E27",
      accent: "#FFFF00"
    };
  }
}
```

### 动画节奏自动匹配

```typescript
function auto_animation_timing(scene_type: string, duration: number) {
  const scenes = Math.ceil(duration / 10);  // 每10秒一个场景

  // 产品演示：慢入场 + 中速展示 + 快速结尾
  if (scene_type === "product") {
    return {
      intro: duration * 0.15,      // 15% 用于入场
      main: duration * 0.70,       // 70% 用于展示
      outro: duration * 0.15,      // 15% 用于结尾
      transition: 15               // 15帧过渡
    };
  }

  // 社交媒体：快节奏
  if (scene_type === "social") {
    return {
      intro: duration * 0.10,      // 10% 快速入场
      main: duration * 0.70,       // 70% 核心内容
      outro: duration * 0.20,      // 20% 强化 CTA
      transition: 10               // 10帧快速切换
    };
  }

  // 教育：均匀节奏
  if (scene_type === "education") {
    const step_duration = duration / scenes;
    return {
      intro: step_duration,
      main: step_duration * (scenes - 2),
      outro: step_duration,
      transition: 20               // 20帧舒适切换
    };
  }
}
```

---

## 📝 用户输入示例 → 自动处理

### 示例 1：极简输入

**用户说**：
```
做一个30秒的产品介绍视频，我们的产品是 AI 写作工具
```

**自动处理**：
```typescript
// 自动分析
scene_type = "product_demo"
mood = "tech"
duration = 30
product_name = "AI 写作工具"

// 自动匹配
design_style = "Glassmorphism + Tech Innovation"
colors = { primary: "#0066ff", secondary: "#00ffff", bg: "#1e1e1e" }
tech_stack = ["Tailwind", "Spring animations", "Particle background"]

// 自动生成场景
scenes = [
  { name: "Scene1: Logo入场", duration: 5, animation: "spring_scale" },
  { name: "Scene2: 核心功能", duration: 15, animation: "slide_in" },
  { name: "Scene3: 数据展示", duration: 7, animation: "number_count" },
  { name: "Scene4: CTA", duration: 3, animation: "pulse" }
]

// 自动生成素材指令
nano_banana_prompts = [
  "AI writing tool dashboard UI, glassmorphism style, tech blue theme, 4K",
  "Text generation animation visual, futuristic interface, neon accents, 4K",
  "Writing assistant features showcase, clean modern design, 4K"
]

processing_background = "Particle connections, tech style, blue cyan palette"
```

### 示例 2：带细节的输入

**用户说**：
```
创建一个60秒的季度数据报告视频，展示收入增长45%，用户从3万增长到5万，
要专业商务风格，重点突出增长趋势
```

**自动处理**：
```typescript
// 自动分析
scene_type = "data_visualization"
mood = "professional"
duration = 60
key_metrics = {
  revenue_growth: "45%",
  user_growth: "30k → 50k"
}

// 自动匹配
design_style = "Business Pro + Data Driven"
colors = { primary: "#2C3E50", secondary: "#E74C3C", bg: "#ECF0F1" }
tech_stack = ["Charts", "Number animations", "Tailwind"]

// 自动生成场景
scenes = [
  {
    name: "Scene1: 开场",
    duration: 10,
    content: "标题 + 3个关键指标数字递增动画",
    animations: ["number_count_up", "spring_bounce"]
  },
  {
    name: "Scene2: 收入图表",
    duration: 15,
    content: "柱状图展示12个月收入",
    animations: ["bar_chart_rise", "delay_sequence"]
  },
  {
    name: "Scene3: 用户增长",
    duration: 15,
    content: "折线图展示用户增长趋势",
    animations: ["line_chart_draw", "smooth_ease"]
  },
  {
    name: "Scene4: 增长率",
    duration: 12,
    content: "饼图展示增长来源",
    animations: ["pie_chart_reveal", "rotate"]
  },
  {
    name: "Scene5: 结论",
    duration: 8,
    content: "总结文字 + Logo",
    animations: ["fade_in", "text_slide"]
  }
]

// 自动选择字体
fonts = ["Roboto Medium", "Inter Regular"]
```

### 示例 3：风格导向的输入

**用户说**：
```
做一个15秒的 Instagram 视频，要那种酷炫的赛博朋克风格，
介绍我们的游戏工作室
```

**自动处理**：
```typescript
// 自动分析
scene_type = "social_media"
mood = "cool_cyberpunk"
duration = 15
platform = "Instagram"
aspect_ratio = "9:16"

// 自动匹配
design_style = "Cyberpunk + Neon"
colors = {
  primary: "#00FFFF",
  secondary: "#FF00FF",
  bg: "#0A0E27",
  accent: "#FFFF00"
}
tech_stack = ["Three.js", "Glitch effects", "Neon borders", "Processing"]

// 自动生成场景
scenes = [
  {
    name: "Scene1: Logo爆炸入场",
    duration: 3,
    effects: ["neon_glow", "glitch_distortion", "particle_explosion"],
    animations: ["scale_spring", "rotation_3d"]
  },
  {
    name: "Scene2: 游戏画面快速切换",
    duration: 8,
    effects: ["scanline_overlay", "chromatic_aberration"],
    animations: ["rapid_crossfade", "zoom_pulse"]
  },
  {
    name: "Scene3: CTA + 社交媒体信息",
    duration: 4,
    effects: ["neon_text", "hologram_flicker"],
    animations: ["text_glitch_in", "button_pulse"]
  }
]

// Processing 背景
processing_effect = "Neon grid + Matrix rain effect"

// 音频自动选择
audio_style = "Synthwave electronic (high energy, 140 BPM)"
```

---

## ✅ 执行清单（自动检查）

每次生成代码前，自动检查：

```typescript
const auto_checklist = {
  design: {
    ✓ colors_matched_to_mood: true,
    ✓ style_consistent: true,
    ✓ accessibility_contrast: true
  },
  technical: {
    ✓ resolution_appropriate: true,
    ✓ fps_optimized: true,
    ✓ tech_stack_complete: true
  },
  performance: {
    ✓ assets_preloaded: true,
    ✓ animations_optimized: true,
    ✓ render_time_estimated: true
  },
  output: {
    ✓ complete_project_structure: true,
    ✓ asset_generation_commands: true,
    ✓ render_instructions: true
  }
};
```

---

## 🚫 用户不需要做的事

❌ 手动填写复杂的模板
❌ 选择设计风格（除非有特殊要求）
❌ 决定技术栈
❌ 计算场景时长分配
❌ 写配色代码
❌ 选择字体
❌ 决定动画类型
❌ 写素材生成 prompt

---

## ✅ 用户只需要做的事

✅ 描述视频的**目的**（产品演示/教育/社交媒体）
✅ 描述视频的**内容**（展示什么功能/讲什么故事）
✅ 可选：指定**时长**（不说默认30秒）
✅ 可选：指定**平台**（YouTube/Instagram/TikTok）
✅ 可选：特殊**风格偏好**（如果有强烈偏好）

---

## 🎯 最终输出（自动生成）

每次处理完用户需求后，自动输出：

1. **📋 分析总结**
   ```
   场景类型：产品演示
   设计风格：Glassmorphism + Tech Innovation
   配色方案：科技蓝 (#0066ff) + 霓虹青 (#00ffff)
   时长：30秒 | 分辨率：1920x1080 | 帧率：60fps
   ```

2. **🎨 完整的 Remotion 项目代码**
   - Root.tsx
   - Scene 组件（所有场景）
   - 动画工具函数
   - 配置文件

3. **🖼️ 素材生成指令**
   ```bash
   # Nano Banana Pro 生成图片
   uv run generate_image.py --prompt "..." --resolution 4K

   # Processing 生成背景
   "Create particle connections background, tech style..."
   ```

4. **🎬 渲染命令**
   ```bash
   npm start  # 预览
   npx remotion render src/index.ts MyVideo out/video.mp4 --quality 100
   ```

---

## 🔄 更新到 CLAUDE.md

这个自动化规则已集成到你的工作流程中，当检测到视频创作需求时自动激活。
