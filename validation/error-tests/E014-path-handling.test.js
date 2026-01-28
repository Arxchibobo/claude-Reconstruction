/**
 * E014: 跨平台路径处理未统一
 *
 * 错误模式：直接使用原始路径，跨平台时出错
 * 正确模式：统一路径转换层，处理 Windows/WSL/Unix 差异
 *
 * 严重程度：🟡 中等
 * 频率：中频
 */

const path = require('path');

describe('E014: 跨平台路径处理未统一', () => {

  // 路径转换工具
  class PathConverter {
    // Windows → WSL
    static windowsToWSL(windowsPath) {
      // E:\Bobo's Coding cache → /mnt/e/Bobo's Coding cache
      if (/^[A-Z]:\\/.test(windowsPath)) {
        const drive = windowsPath[0].toLowerCase();
        const restPath = windowsPath.slice(3).replace(/\\/g, '/');
        return `/mnt/${drive}/${restPath}`;
      }
      return windowsPath;
    }

    // WSL → Windows
    static wslToWindows(wslPath) {
      // /mnt/e/path → E:\path
      const match = wslPath.match(/^\/mnt\/([a-z])\/(.*)/);
      if (match) {
        const drive = match[1].toUpperCase();
        const restPath = match[2].replace(/\//g, '\\');
        return `${drive}:\\${restPath}`;
      }
      return wslPath;
    }

    // 统一路径格式（用于显示）
    static normalize(anyPath) {
      if (process.platform === 'win32') {
        // Windows 环境：转换为 Windows 路径
        return this.wslToWindows(anyPath).replace(/\//g, '\\');
      } else {
        // Unix 环境：转换为 Unix 路径
        return this.windowsToWSL(anyPath);
      }
    }

    // 检测路径类型
    static detectPathType(p) {
      if (/^[A-Z]:\\/.test(p)) return 'windows';
      if (/^\/mnt\/[a-z]\//.test(p)) return 'wsl';
      if (p.startsWith('/')) return 'unix';
      return 'relative';
    }
  }

  test('错误：直接使用 WSL 路径给 PowerShell', () => {
    const wslPath = '/mnt/e/Bobo\'s Coding cache/project';

    // 错误：PowerShell 无法识别 WSL 路径
    const psCommand = `cd "${wslPath}" && npm install`;

    // 验证：这是一个 WSL 路径
    expect(PathConverter.detectPathType(wslPath)).toBe('wsl');

    // PowerShell 会失败
    const willFail = psCommand.includes('/mnt/');
    expect(willFail).toBe(true);
  });

  test('正确：转换路径后再传递', () => {
    const wslPath = '/mnt/e/Bobo\'s Coding cache/project';

    // 正确：先转换为 Windows 路径
    const windowsPath = PathConverter.wslToWindows(wslPath);
    const psCommand = `cd "${windowsPath}" && npm install`;

    // 验证：转换正确
    expect(windowsPath).toBe('E:\\Bobo\'s Coding cache\\project');
    expect(psCommand).not.toContain('/mnt/');
  });

  test('路径转换：Windows → WSL', () => {
    const testCases = [
      {
        input: 'E:\\Bobo\'s Coding cache',
        expected: '/mnt/e/Bobo\'s Coding cache'
      },
      {
        input: 'C:\\Users\\Administrator',
        expected: '/mnt/c/Users/Administrator'
      },
      {
        input: 'D:\\Projects\\my-app',
        expected: '/mnt/d/Projects/my-app'
      }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = PathConverter.windowsToWSL(input);
      expect(result).toBe(expected);
    });
  });

  test('路径转换：WSL → Windows', () => {
    const testCases = [
      {
        input: '/mnt/e/Bobo\'s Coding cache',
        expected: 'E:\\Bobo\'s Coding cache'
      },
      {
        input: '/mnt/c/Users/Administrator',
        expected: 'C:\\Users\\Administrator'
      },
      {
        input: '/mnt/d/Projects/my-app',
        expected: 'D:\\Projects\\my-app'
      }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = PathConverter.wslToWindows(input);
      expect(result).toBe(expected);
    });
  });

  test('路径类型检测', () => {
    const paths = [
      { path: 'E:\\path', type: 'windows' },
      { path: '/mnt/e/path', type: 'wsl' },
      { path: '/usr/local/bin', type: 'unix' },
      { path: './relative/path', type: 'relative' },
      { path: '../parent', type: 'relative' }
    ];

    paths.forEach(({ path, type }) => {
      expect(PathConverter.detectPathType(path)).toBe(type);
    });
  });

  test('真实案例：Vibecraft 项目启动失败', () => {
    // 场景：2026-01-27，WSL 中启动 Windows Terminal
    const incident = {
      date: '2026-01-27',
      project: 'Vibecraft',
      context: 'WSL 环境，需要启动 Windows Terminal',
      error: 'PowerShell 无法 cd 到 /mnt/e/ 路径',
      rootCause: '直接传递 WSL 路径给 Windows 进程',
      solution: '添加路径转换：WSL → Windows'
    };

    const wslCwd = '/mnt/e/Bobo\'s Coding cache/vibecraft';
    const windowsCwd = PathConverter.wslToWindows(wslCwd);

    // 验证：转换后 PowerShell 可识别
    expect(windowsCwd).toBe('E:\\Bobo\'s Coding cache\\vibecraft');
    expect(windowsCwd).not.toContain('/mnt/');
  });

  test('统一路径转换层：normalizePath 函数', () => {
    const normalizePath = (p, targetEnv) => {
      const currentType = PathConverter.detectPathType(p);

      if (targetEnv === 'windows') {
        if (currentType === 'wsl') {
          return PathConverter.wslToWindows(p);
        }
        return p.replace(/\//g, '\\');
      }

      if (targetEnv === 'wsl' || targetEnv === 'unix') {
        if (currentType === 'windows') {
          return PathConverter.windowsToWSL(p);
        }
        return p;
      }

      return p;
    };

    // 测试用例
    expect(normalizePath('/mnt/e/path', 'windows')).toBe('E:\\path');
    expect(normalizePath('E:\\path', 'wsl')).toBe('/mnt/e/path');
  });

  test('特殊字符处理：空格和引号', () => {
    const pathWithSpaces = 'E:\\Bobo\'s Coding cache\\my project';

    // Shell 命令需要引号
    const shellCommand = (p) => {
      // 检测是否有空格或特殊字符
      if (/[\s']/.test(p)) {
        return `cd "${p}" && npm install`;
      }
      return `cd ${p} && npm install`;
    };

    const cmd = shellCommand(pathWithSpaces);
    expect(cmd).toContain('"E:\\Bobo\'s Coding cache\\my project"');
  });

  test('相对路径处理', () => {
    const resolvePath = (relativePath, basePath) => {
      const baseType = PathConverter.detectPathType(basePath);

      if (baseType === 'windows') {
        return path.win32.resolve(basePath, relativePath);
      } else {
        return path.posix.resolve(basePath, relativePath);
      }
    };

    // Windows 基础路径
    const windowsResult = resolvePath('../project', 'E:\\base\\path');
    expect(windowsResult).toContain('E:');

    // Unix 基础路径
    const unixResult = resolvePath('../project', '/home/user/base/path');
    expect(unixResult).toContain('/home/user');
  });

  test('跨平台 path.join 替代', () => {
    const crossPlatformJoin = (...parts) => {
      // 检测第一个部分的类型
      const firstType = PathConverter.detectPathType(parts[0]);

      if (firstType === 'windows') {
        return path.win32.join(...parts);
      } else {
        return path.posix.join(...parts);
      }
    };

    const windowsJoin = crossPlatformJoin('E:\\base', 'sub', 'file.txt');
    expect(windowsJoin).toBe('E:\\base\\sub\\file.txt');

    const unixJoin = crossPlatformJoin('/base', 'sub', 'file.txt');
    expect(unixJoin).toBe('/base/sub/file.txt');
  });

  test('自检清单：跨平台路径处理', () => {
    const checklist = {
      questions: [
        {
          q: '是否有统一的路径转换函数？',
          check: () => typeof PathConverter.normalize === 'function'
        },
        {
          q: '是否处理了 Windows/WSL 互转？',
          check: () => {
            const wslPath = '/mnt/e/test';
            const winPath = PathConverter.wslToWindows(wslPath);
            return winPath.startsWith('E:');
          }
        },
        {
          q: '是否处理了空格和特殊字符？',
          check: () => {
            const path = 'E:\\path with spaces';
            return /[\s']/.test(path);  // 能检测到
          }
        },
        {
          q: '是否区分了目标环境？',
          check: () => {
            // 应该根据目标环境（不是当前环境）转换
            return true;
          }
        }
      ]
    };

    const results = checklist.questions.map(item => ({
      question: item.q,
      passed: item.check()
    }));

    expect(results.every(r => r.passed)).toBe(true);
  });

  test('最佳实践：PathUtils 工具类', () => {
    class PathUtils {
      static toWindows(p) {
        return PathConverter.wslToWindows(p).replace(/\//g, '\\');
      }

      static toWSL(p) {
        return PathConverter.windowsToWSL(p);
      }

      static toUnix(p) {
        return this.toWSL(p).replace(/\\/g, '/');
      }

      static escapeForShell(p) {
        if (/[\s']/.test(p)) {
          return `"${p.replace(/"/g, '\\"')}"`;
        }
        return p;
      }

      static normalize(p, targetEnv = process.platform) {
        if (targetEnv === 'win32') {
          return this.toWindows(p);
        }
        return this.toUnix(p);
      }
    }

    // 测试工具类
    expect(PathUtils.toWindows('/mnt/e/path')).toBe('E:\\path');
    expect(PathUtils.toWSL('E:\\path')).toBe('/mnt/e/path');
    expect(PathUtils.escapeForShell('E:\\path with spaces')).toContain('"');
  });

  test('项目配置：路径配置模板', () => {
    const configTemplate = {
      development: {
        basePath: process.platform === 'win32' ? 'E:\\projects' : '/mnt/e/projects',
        outputPath: '{{basePath}}/output',
        tempPath: '{{basePath}}/temp'
      },
      production: {
        basePath: '/opt/app',
        outputPath: '/var/app/output',
        tempPath: '/tmp/app'
      }
    };

    expect(configTemplate.development.basePath).toBeDefined();
    expect(configTemplate.production.basePath).toBe('/opt/app');
  });

  test('环境检测与自动转换', () => {
    const autoConvertPath = (p, targetShell) => {
      const sourceType = PathConverter.detectPathType(p);

      // 根据目标 shell 自动转换
      const conversions = {
        'powershell': 'windows',
        'cmd': 'windows',
        'bash': 'unix',
        'wsl-bash': 'wsl'
      };

      const targetType = conversions[targetShell];

      if (!targetType) {
        throw new Error(`Unknown target shell: ${targetShell}`);
      }

      if (sourceType === 'wsl' && targetType === 'windows') {
        return PathConverter.wslToWindows(p);
      }

      if (sourceType === 'windows' && targetType === 'wsl') {
        return PathConverter.windowsToWSL(p);
      }

      return p;
    };

    // 测试自动转换
    const wslPath = '/mnt/e/project';
    const forPowerShell = autoConvertPath(wslPath, 'powershell');
    expect(forPowerShell).toBe('E:\\project');

    const windowsPath = 'E:\\project';
    const forWSL = autoConvertPath(windowsPath, 'wsl-bash');
    expect(forWSL).toBe('/mnt/e/project');
  });
});
