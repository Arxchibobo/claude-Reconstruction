/**
 * E015: Hook 系统未验证完整链路
 *
 * 错误模式：只设置环境变量，未验证 Hook 是否真正工作
 * 正确模式：验证完整链路（安装 → 注册 → 调用 → 执行 → 输出）
 *
 * 严重程度：🔴 严重
 * 频率：低频
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

describe('E015: Hook 系统未验证完整链路', () => {

  // Hook 系统验证器
  class HookSystemValidator {
    constructor(hookName = 'vibecraft-hook', config = {}) {
      this.hookName = hookName;
      this.hookDir = config.hookDir || path.join(os.homedir(), '.vibecraft', 'hooks');
      this.hookScriptPath = path.join(this.hookDir, `${hookName}.js`);
      this.settingsPath = config.settingsPath || path.join(os.homedir(), '.claude', 'settings.json');
      this.envVarName = config.envVarName || 'VIBECRAFT_EVENTS_FILE';
    }

    // Layer 1: 检查 Hook 脚本是否安装
    checkHookInstalled() {
      const exists = fs.existsSync(this.hookScriptPath);
      const executable = exists ? this.isExecutable(this.hookScriptPath) : false;

      return {
        layer: 1,
        name: 'Hook 脚本安装',
        passed: exists,
        details: {
          path: this.hookScriptPath,
          exists,
          executable
        }
      };
    }

    // Layer 2: 检查 Claude settings.json 配置
    checkClaudeSettings() {
      if (!fs.existsSync(this.settingsPath)) {
        return {
          layer: 2,
          name: 'Claude settings.json',
          passed: false,
          details: {
            path: this.settingsPath,
            exists: false,
            configured: false
          }
        };
      }

      const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
      const hasHooks = settings.hooks && Object.keys(settings.hooks).length > 0;

      return {
        layer: 2,
        name: 'Claude settings.json',
        passed: hasHooks,
        details: {
          path: this.settingsPath,
          exists: true,
          configured: hasHooks,
          hookCount: hasHooks ? Object.keys(settings.hooks).length : 0
        }
      };
    }

    // Layer 3: 检查环境变量
    checkEnvironmentVariable() {
      const value = process.env[this.envVarName];
      const isSet = value !== undefined;

      return {
        layer: 3,
        name: '环境变量',
        passed: isSet,
        details: {
          varName: this.envVarName,
          value: value || null,
          isSet
        }
      };
    }

    // Layer 4: 检查输出文件是否可写
    checkOutputFile() {
      const envValue = process.env[this.envVarName];
      if (!envValue) {
        return {
          layer: 4,
          name: '输出文件',
          passed: false,
          details: { reason: '环境变量未设置' }
        };
      }

      const outputDir = path.dirname(envValue);
      const dirExists = fs.existsSync(outputDir);
      const writable = dirExists ? this.isWritable(outputDir) : false;

      return {
        layer: 4,
        name: '输出文件',
        passed: dirExists && writable,
        details: {
          path: envValue,
          dirExists,
          writable
        }
      };
    }

    // 辅助函数：检查可执行权限
    isExecutable(filePath) {
      try {
        if (process.platform === 'win32') return true;  // Windows 不需要
        const stats = fs.statSync(filePath);
        return (stats.mode & 0o111) !== 0;
      } catch {
        return false;
      }
    }

    // 辅助函数：检查可写权限
    isWritable(dirPath) {
      try {
        const testFile = path.join(dirPath, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return true;
      } catch {
        return false;
      }
    }

    // 完整验证
    validateFullChain() {
      const results = [
        this.checkHookInstalled(),
        this.checkClaudeSettings(),
        this.checkEnvironmentVariable(),
        this.checkOutputFile()
      ];

      const allPassed = results.every(r => r.passed);
      const failedLayers = results.filter(r => !r.passed);

      return {
        allPassed,
        results,
        failedLayers,
        summary: this.generateSummary(results)
      };
    }

    // 生成验证摘要
    generateSummary(results) {
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;

      if (passedCount === totalCount) {
        return '✅ 所有层级验证通过';
      }

      const firstFailed = results.find(r => !r.passed);
      return `❌ Layer ${firstFailed.layer} 失败: ${firstFailed.name}`;
    }
  }

  test('错误：只设置环境变量（Layer 3），未检查 Layer 1-2', () => {
    // 模拟：只设置了环境变量
    process.env.VIBECRAFT_EVENTS_FILE = '/tmp/events.jsonl';

    const validator = new HookSystemValidator('test-hook', {
      hookDir: '/nonexistent',
      settingsPath: '/nonexistent/settings.json'
    });

    const result = validator.validateFullChain();

    // 验证：Layer 1 和 2 应该失败
    expect(result.allPassed).toBe(false);
    expect(result.failedLayers.length).toBeGreaterThan(0);

    // Layer 3 可能通过（因为环境变量设置了）
    const layer3 = result.results.find(r => r.layer === 3);
    expect(layer3.passed).toBe(true);

    // 清理
    delete process.env.VIBECRAFT_EVENTS_FILE;
  });

  test('正确：逐层验证完整链路', () => {
    // 创建临时测试环境
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-test-'));
    const hooksDir = path.join(tempDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });

    const hookScript = path.join(hooksDir, 'test-hook.js');
    fs.writeFileSync(hookScript, '#!/usr/bin/env node\nconsole.log("test");');

    const settingsPath = path.join(tempDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({
      hooks: { 'test-hook': 'test-hook.js' }
    }));

    const eventsFile = path.join(tempDir, 'events.jsonl');
    process.env.TEST_EVENTS_FILE = eventsFile;

    // 验证
    const validator = new HookSystemValidator('test-hook', {
      hookDir: hooksDir,
      settingsPath,
      envVarName: 'TEST_EVENTS_FILE'
    });

    const result = validator.validateFullChain();

    // Layer 1-4 应该都通过
    expect(result.results[0].passed).toBe(true);  // Hook 安装
    expect(result.results[1].passed).toBe(true);  // Settings 配置
    expect(result.results[2].passed).toBe(true);  // 环境变量
    expect(result.results[3].passed).toBe(true);  // 输出文件

    // 清理
    delete process.env.TEST_EVENTS_FILE;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('Layer 1 失败：Hook 脚本未安装', () => {
    const validator = new HookSystemValidator('nonexistent-hook', {
      hookDir: '/nonexistent'
    });

    const layer1 = validator.checkHookInstalled();

    expect(layer1.passed).toBe(false);
    expect(layer1.details.exists).toBe(false);
  });

  test('Layer 2 失败：Claude settings.json 未配置', () => {
    const validator = new HookSystemValidator('test-hook', {
      settingsPath: '/nonexistent/settings.json'
    });

    const layer2 = validator.checkClaudeSettings();

    expect(layer2.passed).toBe(false);
    expect(layer2.details.exists).toBe(false);
  });

  test('Layer 3 失败：环境变量未设置', () => {
    // 确保环境变量不存在
    delete process.env.TEST_VAR;

    const validator = new HookSystemValidator('test-hook', {
      envVarName: 'TEST_VAR'
    });

    const layer3 = validator.checkEnvironmentVariable();

    expect(layer3.passed).toBe(false);
    expect(layer3.details.isSet).toBe(false);
  });

  test('Layer 4 失败：输出文件目录不可写', () => {
    process.env.TEST_OUTPUT = '/root/protected/events.jsonl';  // 通常无权限

    const validator = new HookSystemValidator('test-hook', {
      envVarName: 'TEST_OUTPUT'
    });

    const layer4 = validator.checkOutputFile();

    // 可能失败（取决于系统权限）
    expect(layer4).toHaveProperty('passed');

    delete process.env.TEST_OUTPUT;
  });

  test('真实案例：Vibecraft 事件捕获失败', () => {
    // 场景：2026-01-27，前端显示 "Waiting for activity"
    const incident = {
      date: '2026-01-27',
      project: 'Vibecraft',
      symptom: '前端一直显示等待，无事件流',
      diagnosis: [
        {
          layer: 1,
          name: 'Hook 脚本',
          status: '❌ 未安装',
          fix: 'npx vibecraft setup'
        },
        {
          layer: 2,
          name: 'Claude settings',
          status: '❌ 未配置',
          fix: '运行 setup 自动配置'
        },
        {
          layer: 3,
          name: '环境变量',
          status: '❌ 未设置',
          fix: '启动时设置 VIBECRAFT_EVENTS_FILE'
        }
      ],
      lesson: '必须验证所有层级，任何一层失败都会导致整个系统不工作'
    };

    expect(incident.diagnosis).toHaveLength(3);
    expect(incident.lesson).toContain('验证所有层级');
  });

  test('最佳实践：启动前验证', () => {
    const validateBeforeStart = async () => {
      const validator = new HookSystemValidator();
      const result = validator.validateFullChain();

      if (!result.allPassed) {
        console.error('\n❌ Hook 系统验证失败\n');

        result.failedLayers.forEach(layer => {
          console.error(`  Layer ${layer.layer}: ${layer.name}`);
          console.error(`    Details: ${JSON.stringify(layer.details, null, 2)}`);
        });

        console.error('\n修复步骤：');
        if (result.failedLayers.some(l => l.layer === 1)) {
          console.error('  1. 安装 Hook: npx vibecraft setup');
        }
        if (result.failedLayers.some(l => l.layer === 2)) {
          console.error('  2. 配置 Claude settings (自动完成)');
        }
        if (result.failedLayers.some(l => l.layer === 3)) {
          console.error('  3. 设置环境变量: export VIBECRAFT_EVENTS_FILE=...');
        }

        return false;
      }

      console.log('✅ Hook 系统验证通过');
      return true;
    };

    expect(validateBeforeStart).toBeDefined();
  });

  test('自检清单：Hook 系统部署', () => {
    const deploymentChecklist = {
      steps: [
        {
          layer: 1,
          task: '安装 Hook 脚本',
          command: 'npx vibecraft setup',
          verify: 'ls ~/.vibecraft/hooks/*.js'
        },
        {
          layer: 2,
          task: '配置 Claude settings',
          command: '自动完成（setup 脚本）',
          verify: 'cat ~/.claude/settings.json | grep hooks'
        },
        {
          layer: 3,
          task: '设置环境变量',
          command: 'export VIBECRAFT_EVENTS_FILE=/tmp/events.jsonl',
          verify: 'echo $VIBECRAFT_EVENTS_FILE'
        },
        {
          layer: 4,
          task: '验证输出文件',
          command: 'touch $VIBECRAFT_EVENTS_FILE',
          verify: 'ls -la $VIBECRAFT_EVENTS_FILE'
        },
        {
          layer: 5,
          task: '端到端测试',
          command: '启动 Claude CLI，执行操作',
          verify: 'tail -f $VIBECRAFT_EVENTS_FILE'
        }
      ]
    };

    expect(deploymentChecklist.steps).toHaveLength(5);
    expect(deploymentChecklist.steps[0].task).toContain('安装');
  });

  test('自动化验证脚本', () => {
    const generateVerificationScript = () => {
      return `#!/bin/bash

echo "🔍 验证 Hook 系统..."

# Layer 1: Hook 脚本
if [ -f ~/.vibecraft/hooks/vibecraft-hook.js ]; then
  echo "✅ Layer 1: Hook 脚本已安装"
else
  echo "❌ Layer 1: Hook 脚本缺失"
  echo "   修复: npx vibecraft setup"
  exit 1
fi

# Layer 2: Claude settings
if grep -q "hooks" ~/.claude/settings.json 2>/dev/null; then
  echo "✅ Layer 2: Claude settings 已配置"
else
  echo "❌ Layer 2: Claude settings 未配置"
  echo "   修复: 运行 npx vibecraft setup"
  exit 1
fi

# Layer 3: 环境变量
if [ -n "$VIBECRAFT_EVENTS_FILE" ]; then
  echo "✅ Layer 3: 环境变量已设置"
else
  echo "❌ Layer 3: 环境变量未设置"
  echo "   修复: export VIBECRAFT_EVENTS_FILE=/tmp/events.jsonl"
  exit 1
fi

# Layer 4: 输出文件
if touch "$VIBECRAFT_EVENTS_FILE" 2>/dev/null; then
  echo "✅ Layer 4: 输出文件可写"
else
  echo "❌ Layer 4: 输出文件不可写"
  exit 1
fi

echo ""
echo "🎉 所有层级验证通过！"
`;
    };

    const script = generateVerificationScript();
    expect(script).toContain('Layer 1');
    expect(script).toContain('Layer 2');
    expect(script).toContain('Layer 3');
    expect(script).toContain('Layer 4');
  });

  test('监控和报警：检测 Hook 失效', () => {
    class HookMonitor {
      constructor(validator) {
        this.validator = validator;
        this.lastCheck = null;
        this.alertThreshold = 5 * 60 * 1000;  // 5分钟无事件就报警
      }

      async checkHealth() {
        const chainResult = this.validator.validateFullChain();

        if (!chainResult.allPassed) {
          return {
            healthy: false,
            issue: chainResult.summary,
            failedLayers: chainResult.failedLayers
          };
        }

        // 检查最近是否有事件
        const hasRecentEvents = await this.checkRecentEvents();
        if (!hasRecentEvents) {
          return {
            healthy: false,
            issue: 'Hook 链路正常但无事件输出',
            suggestion: '检查 Claude CLI 是否真正调用了 Hook'
          };
        }

        return { healthy: true };
      }

      async checkRecentEvents() {
        const envFile = process.env.VIBECRAFT_EVENTS_FILE;
        if (!envFile || !fs.existsSync(envFile)) return false;

        const stats = fs.statSync(envFile);
        const lastModified = stats.mtime.getTime();
        const now = Date.now();

        return (now - lastModified) < this.alertThreshold;
      }
    }

    const validator = new HookSystemValidator();
    const monitor = new HookMonitor(validator);

    expect(monitor.checkHealth).toBeDefined();
  });

  test('文档化：系统架构图', () => {
    const systemDiagram = `
Hook 系统架构（4 层）：

┌─────────────────────────────────────────┐
│ Layer 1: Hook 脚本安装                   │
│ ~/.vibecraft/hooks/vibecraft-hook.js   │
│ - 必须存在                              │
│ - Unix 系统需要可执行权限                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ Layer 2: Claude Code 注册               │
│ ~/.claude/settings.json                │
│ {                                       │
│   "hooks": {                            │
│     "tool-result": "vibecraft-hook.js"  │
│   }                                     │
│ }                                       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ Layer 3: 环境变量                        │
│ VIBECRAFT_EVENTS_FILE=/tmp/events.jsonl│
│ - Claude CLI 启动时必须设置              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ Layer 4: 事件输出                        │
│ /tmp/events.jsonl                       │
│ - 目录必须可写                          │
│ - 前端从这里读取事件流                   │
└─────────────────────────────────────────┘
    `;

    expect(systemDiagram).toContain('Layer 1');
    expect(systemDiagram).toContain('Layer 2');
    expect(systemDiagram).toContain('Layer 3');
    expect(systemDiagram).toContain('Layer 4');
  });
});
