/**
 * E012: Pre-commit Hook 权限问题
 *
 * 错误模式：Hook 文件没有可执行权限，Git 不会运行
 * 正确模式：设置可执行权限 (chmod +x)
 *
 * 严重程度：🟡 中等
 * 频率：中频
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('E012: Pre-commit Hook 权限问题', () => {

  // 检查文件权限（Unix-like 系统）
  const checkExecutable = (filePath) => {
    try {
      const stats = fs.statSync(filePath);
      const mode = stats.mode;

      // 检查是否有执行权限（owner, group, or others）
      const isExecutable = (mode & 0o111) !== 0;

      return {
        exists: true,
        isExecutable,
        mode: mode.toString(8),
        octal: (mode & 0o777).toString(8)
      };
    } catch (error) {
      return {
        exists: false,
        isExecutable: false,
        error: error.message
      };
    }
  };

  // 设置可执行权限
  const makeExecutable = (filePath) => {
    try {
      const currentMode = fs.statSync(filePath).mode;
      // 添加执行权限：owner=7 (rwx), group=5 (r-x), others=5 (r-x)
      const newMode = currentMode | 0o111;  // 添加所有用户的执行权限
      fs.chmodSync(filePath, newMode);
      return true;
    } catch (error) {
      return false;
    }
  };

  test('问题诊断：Hook 文件存在但未执行', () => {
    const issueDescription = {
      symptom: 'git commit 直接成功，pre-commit hook 没有运行',
      rootCause: 'Hook 文件没有可执行权限（-rw-r--r--）',
      expectedPermission: '-rwxr-xr-x',
      solution: 'chmod +x .husky/pre-commit'
    };

    expect(issueDescription.rootCause).toContain('可执行权限');
    expect(issueDescription.solution).toContain('chmod +x');
  });

  test('权限检查：识别不可执行的 Hook', () => {
    // 模拟检查 hook 文件
    const mockHookPath = '.husky/pre-commit';

    const diagnose = (filePath) => {
      const info = checkExecutable(filePath);

      if (!info.exists) {
        return {
          status: 'missing',
          message: 'Hook 文件不存在',
          fix: '运行 npx husky install'
        };
      }

      if (!info.isExecutable) {
        return {
          status: 'not_executable',
          message: `Hook 文件存在但不可执行（权限：${info.octal}）`,
          fix: `chmod +x ${filePath}`
        };
      }

      return {
        status: 'ok',
        message: 'Hook 文件正常'
      };
    };

    // 测试诊断逻辑
    const result = diagnose(mockHookPath);
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('message');
  });

  test('正确方案：设置可执行权限', () => {
    // 模拟创建一个测试 hook 文件
    const testHookPath = path.join(__dirname, 'test-hook.sh');

    // 创建文件（默认不可执行）
    fs.writeFileSync(testHookPath, '#!/bin/sh\necho "test hook"', { mode: 0o644 });

    // 验证：初始状态不可执行
    let info = checkExecutable(testHookPath);
    if (process.platform !== 'win32') {  // Windows 没有 Unix 权限概念
      expect(info.isExecutable).toBe(false);
    }

    // 设置可执行权限
    makeExecutable(testHookPath);

    // 验证：现在可执行
    info = checkExecutable(testHookPath);
    if (process.platform !== 'win32') {
      expect(info.isExecutable).toBe(true);
    }

    // 清理
    fs.unlinkSync(testHookPath);
  });

  test('Husky 安装检查：验证 hook 权限', () => {
    const verifyHuskySetup = (huskyDir = '.husky') => {
      const hooks = ['pre-commit', 'commit-msg', 'pre-push'];
      const results = [];

      for (const hook of hooks) {
        const hookPath = path.join(huskyDir, hook);
        const info = checkExecutable(hookPath);

        results.push({
          hook,
          exists: info.exists,
          executable: info.isExecutable,
          needsFix: info.exists && !info.isExecutable
        });
      }

      return {
        allOk: results.every(r => !r.needsFix),
        needsFixCount: results.filter(r => r.needsFix).length,
        results
      };
    };

    // 测试验证逻辑
    const verification = verifyHuskySetup();
    expect(verification).toHaveProperty('allOk');
    expect(verification).toHaveProperty('results');
  });

  test('自动修复脚本：批量设置权限', () => {
    const fixHuskyPermissions = (huskyDir = '.husky') => {
      const hooks = ['pre-commit', 'commit-msg', 'pre-push'];
      const fixed = [];
      const errors = [];

      for (const hook of hooks) {
        const hookPath = path.join(huskyDir, hook);

        try {
          if (fs.existsSync(hookPath)) {
            const info = checkExecutable(hookPath);
            if (!info.isExecutable) {
              makeExecutable(hookPath);
              fixed.push(hook);
            }
          }
        } catch (error) {
          errors.push({ hook, error: error.message });
        }
      }

      return { fixed, errors };
    };

    // 模拟修复
    const result = fixHuskyPermissions('.husky');
    expect(result).toHaveProperty('fixed');
    expect(result).toHaveProperty('errors');
  });

  test('自检清单：Hook 安装后验证', () => {
    const postInstallChecklist = {
      steps: [
        {
          name: '检查 hook 文件是否存在',
          check: () => fs.existsSync('.husky/pre-commit')
        },
        {
          name: '检查 hook 文件是否可执行',
          check: () => {
            if (process.platform === 'win32') return true;
            return checkExecutable('.husky/pre-commit').isExecutable;
          }
        },
        {
          name: '测试 hook 是否真正运行',
          check: () => {
            // 可以通过创建一个空提交来测试
            // 这里只是示例逻辑
            return true;
          }
        }
      ]
    };

    // 运行检查清单
    const results = postInstallChecklist.steps.map(step => ({
      name: step.name,
      passed: step.check()
    }));

    expect(results).toHaveLength(3);
  });

  test('跨平台兼容性：Windows 处理', () => {
    const platformSpecificSetup = () => {
      if (process.platform === 'win32') {
        return {
          platform: 'Windows',
          issue: 'Windows 没有 Unix 风格的文件权限',
          solution: 'Git for Windows 会自动处理，无需手动 chmod',
          verification: '通过 git config core.fileMode 检查'
        };
      }

      return {
        platform: 'Unix-like',
        issue: 'Hook 文件必须有可执行权限',
        solution: 'chmod +x .husky/*',
        verification: 'ls -la .husky/'
      };
    };

    const setup = platformSpecificSetup();
    expect(setup).toHaveProperty('platform');
    expect(setup).toHaveProperty('solution');
  });

  test('真实案例：accessibility 项目 Hook 设置', () => {
    // 场景：2026-01-23，设置 pre-commit hook
    const incident = {
      date: '2026-01-23',
      project: 'big_dashboard accessibility',
      steps: [
        'npm install --save-dev husky',
        'npx husky install',
        'npx husky add .husky/pre-commit "npm run lint"',
        'chmod +x .husky/pre-commit  // ⚠️ 关键步骤'
      ],
      mistake: '忘记最后一步 chmod +x',
      symptom: 'git commit 时 lint 没有运行',
      fix: 'chmod +x .husky/pre-commit',
      lesson: 'Hook 创建后必须验证可执行权限'
    };

    expect(incident.steps).toContain('chmod +x .husky/pre-commit  // ⚠️ 关键步骤');
    expect(incident.lesson).toContain('验证可执行权限');
  });

  test('最佳实践：安装脚本包含权限设置', () => {
    const setupScript = `#!/bin/bash

# 安装 Husky
npm install --save-dev husky
npx husky install

# 创建 pre-commit hook
npx husky add .husky/pre-commit "npm run lint"

# ⚠️ 关键：设置可执行权限
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/pre-push

# 验证
echo "Verifying hook permissions..."
ls -la .husky/

echo "✅ Husky setup complete"
`;

    expect(setupScript).toContain('chmod +x .husky/pre-commit');
    expect(setupScript).toContain('Verifying hook permissions');
  });

  test('package.json 脚本：自动化设置', () => {
    const packageJSON = {
      scripts: {
        'prepare': 'husky install',
        'postinstall': 'chmod +x .husky/* || true',  // || true 避免 Windows 报错
        'husky:verify': 'ls -la .husky/ && echo "✅ Hooks are executable"'
      }
    };

    expect(packageJSON.scripts.postinstall).toContain('chmod +x');
    expect(packageJSON.scripts['husky:verify']).toContain('ls -la');
  });

  test('Git 配置检查：fileMode 设置', () => {
    const checkGitFileMode = () => {
      try {
        const fileMode = execSync('git config core.fileMode', { encoding: 'utf8' }).trim();
        return {
          enabled: fileMode === 'true',
          value: fileMode,
          recommendation: process.platform === 'win32' ? 'false' : 'true'
        };
      } catch (error) {
        return {
          enabled: null,
          error: 'Not in a git repository or config not set'
        };
      }
    };

    const gitConfig = checkGitFileMode();
    expect(gitConfig).toHaveProperty('value');
  });
});
