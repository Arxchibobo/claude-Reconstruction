/**
 * E011: Git Bash npm install 失败
 *
 * 错误模式：在 Git Bash 中运行 npm 命令卡住
 * 正确模式：在 PowerShell/CMD 中运行 npm 命令
 *
 * 严重程度：🟡 中等
 * 频率：高频（Windows 环境）
 */

describe('E011: Git Bash npm install 失败', () => {

  // 检测当前环境
  const detectEnvironment = () => {
    const isWindows = process.platform === 'win32';
    const shell = process.env.SHELL || process.env.ComSpec || '';
    const isGitBash = shell.includes('bash') && isWindows;
    const isPowerShell = shell.includes('powershell') || process.env.PSModulePath !== undefined;
    const isCmd = shell.includes('cmd');

    return {
      isWindows,
      shell,
      isGitBash,
      isPowerShell,
      isCmd,
      recommended: isWindows ? (isPowerShell || isCmd ? shell : 'powershell') : shell
    };
  };

  test('环境检测：识别当前 shell', () => {
    const env = detectEnvironment();

    // 验证：能够检测到环境
    expect(env).toHaveProperty('isWindows');
    expect(env).toHaveProperty('shell');
    expect(env).toHaveProperty('recommended');

    // 如果是 Windows
    if (env.isWindows) {
      // Git Bash 不推荐用于 npm
      if (env.isGitBash) {
        expect(env.recommended).not.toContain('bash');
        expect(env.recommended).toMatch(/powershell|cmd/i);
      }
    }
  });

  test('问题诊断：Git Bash 输出重定向问题', () => {
    // Git Bash 的问题：npm 的输出无法正确显示
    const issueDescription = {
      symptom: 'npm install 命令卡住，没有任何输出',
      rootCause: 'Git Bash 的输出重定向机制与 Windows 原生程序不兼容',
      affectedCommands: ['npm install', 'npm update', 'npm audit fix'],
      notAffectedCommands: ['npm --version', 'npm list'],  // 快速命令不受影响
    };

    expect(issueDescription.rootCause).toContain('输出重定向');
    expect(issueDescription.affectedCommands).toContain('npm install');
  });

  test('解决方案1：切换到 PowerShell', () => {
    const solution1 = {
      name: 'Use PowerShell',
      steps: [
        '打开 PowerShell（不是 PowerShell ISE）',
        'cd "项目路径"',
        'npm install'
      ],
      advantages: [
        'Windows 原生支持',
        '输出正常显示',
        '进度条正常工作'
      ]
    };

    expect(solution1.steps).toHaveLength(3);
    expect(solution1.advantages).toContain('Windows 原生支持');
  });

  test('解决方案2：使用 winpty 包装', () => {
    const solution2 = {
      name: 'Use winpty wrapper',
      command: 'winpty npm install',
      note: '需要先安装 winpty（通常 Git for Windows 已包含）',
      limitations: [
        '需要额外输入 winpty',
        '某些交互式命令可能仍有问题'
      ]
    };

    expect(solution2.command).toContain('winpty');
    expect(solution2.limitations.length).toBeGreaterThan(0);
  });

  test('解决方案3：使用 npm 的静默模式', () => {
    const solution3 = {
      name: 'Silent mode',
      command: 'npm install --silent',
      advantages: [
        '减少输出，降低卡住几率',
        '仍然会显示错误信息'
      ],
      disadvantages: [
        '看不到进度',
        '不能根治问题'
      ]
    };

    expect(solution3.command).toContain('--silent');
  });

  test('最佳实践：环境选择指南', () => {
    const guidelines = {
      'Git Bash': {
        goodFor: ['git 操作', 'Unix 命令', '脚本编写'],
        badFor: ['npm 操作', 'Windows 原生工具', '交互式程序'],
        recommendation: '用于 git 和 shell 脚本，避免用于 npm'
      },
      'PowerShell': {
        goodFor: ['npm 操作', 'Windows 管理', '.NET 工具'],
        badFor: ['Unix 脚本（需要 WSL）'],
        recommendation: 'Windows 下 npm 操作的首选'
      },
      'CMD': {
        goodFor: ['npm 操作', '批处理脚本', '传统 Windows 命令'],
        badFor: ['现代脚本编写', 'Unix 命令'],
        recommendation: '兼容性最好，但功能较弱'
      },
      'WSL': {
        goodFor: ['完整 Linux 环境', 'Unix 原生工具', '跨平台开发'],
        badFor: ['Windows 原生工具', 'GUI 应用'],
        recommendation: '需要真正的 Linux 环境时使用'
      }
    };

    // 验证指南完整性
    expect(guidelines).toHaveProperty('Git Bash');
    expect(guidelines['Git Bash'].badFor).toContain('npm 操作');
    expect(guidelines['PowerShell'].goodFor).toContain('npm 操作');
  });

  test('自检清单：运行 npm 前的检查', () => {
    const preRunChecklist = (command) => {
      const env = detectEnvironment();
      const warnings = [];

      // 1. 是否在 Windows 的 Git Bash 中？
      if (env.isGitBash && command.startsWith('npm')) {
        warnings.push({
          severity: 'warning',
          message: '在 Git Bash 中运行 npm 可能会卡住',
          suggestion: `建议在 ${env.recommended} 中运行`
        });
      }

      // 2. 是否是长时间运行的命令？
      const longRunningCommands = ['install', 'update', 'audit fix', 'ci'];
      const isLongRunning = longRunningCommands.some(cmd => command.includes(cmd));
      if (isLongRunning && env.isGitBash) {
        warnings.push({
          severity: 'error',
          message: '长时间运行的 npm 命令在 Git Bash 中高概率失败',
          suggestion: '必须切换到 PowerShell 或 CMD'
        });
      }

      return {
        canProceed: warnings.filter(w => w.severity === 'error').length === 0,
        warnings
      };
    };

    // 测试用例
    const case1 = preRunChecklist('npm install');
    if (detectEnvironment().isGitBash) {
      expect(case1.warnings.length).toBeGreaterThan(0);
      expect(case1.canProceed).toBe(false);  // 应该阻止
    }

    const case2 = preRunChecklist('npm --version');
    // 快速命令没问题
    expect(case2.canProceed).toBe(true);
  });

  test('真实案例：无障碍性项目安装失败', () => {
    // 场景：2026-01-23，在 Git Bash 中运行 npm install
    const incident = {
      date: '2026-01-23',
      project: 'big_dashboard accessibility testing',
      command: 'npm install',
      environment: 'Git Bash (MSYS_NT-10.0-26200)',
      symptom: '命令卡住，没有任何输出，等待数分钟无响应',
      solution: '切换到 PowerShell，npm install 成功完成',
      timeWasted: '10 minutes',
      lesson: 'Windows 下的 npm 操作必须在 PowerShell/CMD 中进行'
    };

    expect(incident.solution).toContain('PowerShell');
    expect(incident.lesson).toContain('PowerShell/CMD');
  });

  test('预防措施：项目文档中的环境说明', () => {
    const projectREADME = {
      environmentSection: `
## 开发环境

### Windows 用户注意 ⚠️

**不要在 Git Bash 中运行 npm 命令！**

Git Bash 的输出重定向问题会导致 npm install 等命令卡住。

**正确做法**：
1. 打开 PowerShell（推荐）或 CMD
2. cd 到项目目录
3. 运行 npm 命令

\`\`\`powershell
cd "E:\\Bobo's Coding cache\\project"
npm install
\`\`\`

**Git Bash 适用场景**：
- ✅ Git 操作（git add, git commit, git push）
- ✅ Shell 脚本运行
- ✅ Unix 命令（grep, find, sed）

**PowerShell 适用场景**：
- ✅ npm/yarn 操作
- ✅ Windows 原生工具
- ✅ Node.js 调试
      `
    };

    expect(projectREADME.environmentSection).toContain('不要在 Git Bash');
    expect(projectREADME.environmentSection).toContain('PowerShell');
  });

  test('工具检测：自动提示环境问题', () => {
    // 模拟一个 pre-install 钩子
    const preInstallHook = () => {
      const env = detectEnvironment();

      if (env.isGitBash && env.isWindows) {
        console.error('\n⚠️  警告：检测到 Git Bash 环境\n');
        console.error('npm 命令在 Git Bash 中可能无法正常工作。\n');
        console.error('建议切换到 PowerShell 或 CMD：\n');
        console.error('  1. 打开 PowerShell');
        console.error(`  2. cd "${process.cwd()}"`);
        console.error('  3. npm install\n');

        // 可选：直接阻止安装
        // process.exit(1);

        return false;  // 表示不推荐继续
      }

      return true;  // 安全继续
    };

    const result = preInstallHook();

    // 如果在 Git Bash 中，应该返回 false
    const env = detectEnvironment();
    if (env.isGitBash && env.isWindows) {
      expect(result).toBe(false);
    }
  });

  test('跨平台兼容性：其他系统不受影响', () => {
    const crossPlatformTest = () => {
      const env = detectEnvironment();

      // macOS 和 Linux 的 bash 没有这个问题
      if (!env.isWindows) {
        return {
          safe: true,
          reason: 'Unix-like 系统的 bash 没有输出重定向问题'
        };
      }

      // Windows 的其他 shell
      if (env.isPowerShell || env.isCmd) {
        return {
          safe: true,
          reason: 'Windows 原生 shell 完全兼容'
        };
      }

      // Windows 的 Git Bash
      if (env.isGitBash) {
        return {
          safe: false,
          reason: 'Git Bash 输出重定向问题'
        };
      }

      return { safe: true, reason: 'Unknown environment' };
    };

    const result = crossPlatformTest();
    expect(result).toHaveProperty('safe');
    expect(result).toHaveProperty('reason');
  });

  test('自动修复：npm 脚本中包装命令', () => {
    // 在 package.json 中添加跨平台兼容的脚本
    const packageJSON = {
      scripts: {
        // 错误：直接运行
        'preinstall-bad': 'echo "Installing..."',

        // 正确：使用 cross-env 等工具
        'preinstall-good': 'cross-env NODE_ENV=production echo "Installing..."',

        // 或者：提供不同平台的脚本
        'install:win': 'powershell -Command "npm install"',
        'install:unix': 'npm install'
      }
    };

    expect(packageJSON.scripts['preinstall-good']).toContain('cross-env');
  });
});
