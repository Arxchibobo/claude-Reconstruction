/**
 * E002: 轮询无超时 - 测试用例
 *
 * 严重程度: 🔴 严重
 * 发生频率: 高频
 *
 * 问题: setInterval 轮询没有 maxAttempts，可能无限循环
 * 解决方案: 添加 maxAttempts 超时机制，确保所有退出路径清理资源
 */

describe('E002: 轮询无超时', () => {
  // 模拟状态查询
  let scanStatus = 'pending';
  const mockFetchStatus = (scanId) => {
    return Promise.resolve({ scanId, status: scanStatus });
  };

  beforeEach(() => {
    scanStatus = 'pending';
  });

  describe('❌ 错误代码：无限轮询', () => {
    test('应该在状态永不完成时无限轮询', (done) => {
      let attemptCount = 0;
      let scanPollInterval;

      // ❌ 错误：无限轮询
      scanPollInterval = setInterval(async () => {
        attemptCount++;
        const data = await mockFetchStatus('scan-123');

        // 如果 status 永不变为 'completed'，循环永不停止
        if (data.status === 'completed') {
          clearInterval(scanPollInterval);
          done();
        }

        // 手动停止测试（避免真的无限循环）
        if (attemptCount >= 50) {
          clearInterval(scanPollInterval);
          expect(attemptCount).toBeGreaterThanOrEqual(50);
          done();
        }
      }, 10);
    });

    test('失败时没有清理资源', () => {
      const intervals = [];

      // ❌ 错误：失败时没有 clearInterval
      const startPolling = () => {
        const interval = setInterval(async () => {
          const data = await mockFetchStatus('scan-123');
          // 没有错误处理，也没有超时
          if (data.status === 'completed') {
            clearInterval(interval);
          }
        }, 100);
        intervals.push(interval);
      };

      startPolling();

      // 模拟失败（interval 未被清理）
      expect(intervals.length).toBe(1);

      // 清理测试创建的 interval
      intervals.forEach(clearInterval);
    });
  });

  describe('✅ 正确代码：带超时', () => {
    test('应该在达到 maxAttempts 时停止', (done) => {
      let attemptCount = 0;
      let scanPollInterval;

      const maxAttempts = 10;

      // ✅ 正确：带超时
      scanPollInterval = setInterval(async () => {
        attemptCount++;

        if (attemptCount > maxAttempts) {
          clearInterval(scanPollInterval);
          expect(attemptCount).toBe(maxAttempts + 1);
          done();
          return;
        }

        try {
          const data = await mockFetchStatus('scan-123');
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(scanPollInterval);
            done();
          }
        } catch (error) {
          clearInterval(scanPollInterval);
          done();
        }
      }, 10);
    });

    test('成功时清理资源', (done) => {
      let scanPollInterval;
      let attemptCount = 0;

      // 模拟第3次尝试时成功
      const mockFetch = () => {
        attemptCount++;
        if (attemptCount >= 3) {
          return Promise.resolve({ status: 'completed' });
        }
        return Promise.resolve({ status: 'pending' });
      };

      // ✅ 正确：所有退出路径都清理
      scanPollInterval = setInterval(async () => {
        try {
          const data = await mockFetch();
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(scanPollInterval);
            expect(attemptCount).toBe(3);
            done();
          }
        } catch (error) {
          clearInterval(scanPollInterval);
          done();
        }
      }, 10);
    });

    test('失败时清理资源', (done) => {
      let scanPollInterval;
      let attemptCount = 0;

      // 模拟第2次尝试时失败
      const mockFetch = () => {
        attemptCount++;
        if (attemptCount >= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ status: 'pending' });
      };

      // ✅ 正确：错误时也清理
      scanPollInterval = setInterval(async () => {
        try {
          const data = await mockFetch();
          if (data.status === 'completed') {
            clearInterval(scanPollInterval);
            done();
          }
        } catch (error) {
          clearInterval(scanPollInterval); // 重要：错误时也清理
          expect(error.message).toBe('Network error');
          done();
        }
      }, 10);
    });

    test('超时时清理资源', (done) => {
      let scanPollInterval;
      let attemptCount = 0;
      const maxAttempts = 5;

      // ✅ 正确：超时时清理
      scanPollInterval = setInterval(async () => {
        attemptCount++;

        if (attemptCount > maxAttempts) {
          clearInterval(scanPollInterval); // 重要：超时时清理
          expect(attemptCount).toBe(maxAttempts + 1);
          done();
          return;
        }

        const data = await mockFetchStatus('scan-123');
        // 状态永不完成，但会超时
        if (data.status === 'completed') {
          clearInterval(scanPollInterval);
          done();
        }
      }, 10);
    });
  });

  describe('📋 自检清单', () => {
    test('检查点1: 轮询是否设置 maxAttempts?', () => {
      const codeSnippet = `
        function pollStatus(scanId, maxAttempts = 30) {
          let attempts = 0;
          scanPollInterval = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
              clearInterval(scanPollInterval);
              showError('轮询超时');
              return;
            }
          }, 2000);
        }
      `;

      expect(codeSnippet).toContain('maxAttempts');
      expect(codeSnippet).toContain('attempts > maxAttempts');
    });

    test('检查点2: 失败/超时是否 clearInterval?', () => {
      const codeSnippet = `
        scanPollInterval = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(scanPollInterval); // 超时清理
            return;
          }
          try {
            const data = await fetchStatus(scanId);
            if (data.status === 'completed') {
              clearInterval(scanPollInterval); // 成功清理
            }
          } catch (error) {
            clearInterval(scanPollInterval); // 失败清理
          }
        }, 2000);
      `;

      // 检查所有退出路径是否都有 clearInterval
      const clearIntervalCount = (codeSnippet.match(/clearInterval/g) || []).length;
      expect(clearIntervalCount).toBeGreaterThanOrEqual(3);
    });

    test('检查点3: 是否处理了所有可能的状态?', () => {
      const codeSnippet = `
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(scanPollInterval);
        }
      `;

      // 检查是否考虑了 completed 和 failed 两种结束状态
      expect(codeSnippet).toContain("'completed'");
      expect(codeSnippet).toContain("'failed'");
    });
  });

  describe('🎯 超时机制验证', () => {
    test('应该在指定尝试次数后超时', (done) => {
      let attemptCount = 0;
      const maxAttempts = 3;
      let scanPollInterval;

      const startTime = Date.now();

      scanPollInterval = setInterval(async () => {
        attemptCount++;

        if (attemptCount > maxAttempts) {
          clearInterval(scanPollInterval);
          const elapsed = Date.now() - startTime;

          // 验证：确实尝试了 maxAttempts + 1 次
          expect(attemptCount).toBe(maxAttempts + 1);
          // 验证：总时间约为 (maxAttempts + 1) * 间隔
          expect(elapsed).toBeGreaterThan(30); // 至少 3次 × 10ms
          done();
          return;
        }

        await mockFetchStatus('scan-123');
      }, 10);
    });
  });
});
