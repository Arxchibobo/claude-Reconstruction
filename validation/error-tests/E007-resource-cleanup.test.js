/**
 * E007: 忘记资源清理
 *
 * 错误模式：只在成功时清理资源，失败/超时时泄漏
 * 正确模式：所有退出路径都清理资源
 *
 * 严重程度：🔴 严重
 * 频率：低频
 */

describe('E007: 忘记资源清理', () => {

  // Mock 资源追踪器
  class ResourceTracker {
    constructor() {
      this.activeIntervals = new Set();
      this.activeTimeouts = new Set();
      this.activeConnections = new Set();
    }

    createInterval(callback, ms) {
      const id = setInterval(callback, ms);
      this.activeIntervals.add(id);
      return id;
    }

    createTimeout(callback, ms) {
      const id = setTimeout(callback, ms);
      this.activeTimeouts.add(id);
      return id;
    }

    createConnection() {
      const conn = { id: Math.random(), closed: false };
      this.activeConnections.add(conn);
      return conn;
    }

    clearInterval(id) {
      clearInterval(id);
      this.activeIntervals.delete(id);
    }

    clearTimeout(id) {
      clearTimeout(id);
      this.activeTimeouts.delete(id);
    }

    closeConnection(conn) {
      conn.closed = true;
      this.activeConnections.delete(conn);
    }

    hasLeaks() {
      return this.activeIntervals.size > 0 ||
             this.activeTimeouts.size > 0 ||
             this.activeConnections.size > 0;
    }

    getLeakCount() {
      return this.activeIntervals.size +
             this.activeTimeouts.size +
             this.activeConnections.size;
    }

    reset() {
      this.activeIntervals.forEach(id => clearInterval(id));
      this.activeTimeouts.forEach(id => clearTimeout(id));
      this.activeIntervals.clear();
      this.activeTimeouts.clear();
      this.activeConnections.clear();
    }
  }

  let tracker;

  beforeEach(() => {
    tracker = new ResourceTracker();
  });

  afterEach(() => {
    tracker.reset();
  });

  test('错误：只在成功时清理 interval', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'completed' });

    let intervalId;
    const pollStatus = () => {
      intervalId = tracker.createInterval(async () => {
        const data = await mockFetch();
        if (data.status === 'completed') {
          tracker.clearInterval(intervalId);  // 只在成功时清理
          // 没有处理错误情况！
        }
      }, 100);
    };

    pollStatus();

    await new Promise(resolve => setTimeout(resolve, 250));

    // 验证：interval 已被清理
    expect(tracker.hasLeaks()).toBe(false);

    // 现在测试失败情况
    tracker.reset();
    const mockFetchFail = jest.fn().mockRejectedValue(new Error('Network error'));

    const pollStatusBad = () => {
      intervalId = tracker.createInterval(async () => {
        try {
          await mockFetchFail();
        } catch (error) {
          // 错误：没有清理 interval！
          console.error(error);
        }
      }, 100);
    };

    pollStatusBad();

    await new Promise(resolve => setTimeout(resolve, 250));

    // 验证：interval 泄漏了
    expect(tracker.hasLeaks()).toBe(true);
    expect(tracker.getLeakCount()).toBe(1);
  });

  test('正确：所有退出路径都清理', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockRejectedValueOnce(new Error('Network error'));

    let intervalId;
    const pollStatus = () => {
      intervalId = tracker.createInterval(async () => {
        try {
          const data = await mockFetch();
          if (data.status === 'completed' || data.status === 'failed') {
            tracker.clearInterval(intervalId);  // 成功时清理
          }
        } catch (error) {
          tracker.clearInterval(intervalId);  // 错误时也清理
          console.error(error);
        }
      }, 100);
    };

    pollStatus();

    await new Promise(resolve => setTimeout(resolve, 250));

    // 验证：无论成功还是失败，都没有泄漏
    expect(tracker.hasLeaks()).toBe(false);
  });

  test('错误：超时未清理', async () => {
    let timeoutId;

    const makeRequest = () => {
      timeoutId = tracker.createTimeout(() => {
        console.log('Request timeout');
        // 错误：没有清理自己
      }, 1000);

      // 模拟请求成功，取消超时
      setTimeout(() => {
        tracker.clearTimeout(timeoutId);
      }, 100);
    };

    makeRequest();

    await new Promise(resolve => setTimeout(resolve, 150));

    // 验证：成功情况下无泄漏
    expect(tracker.hasLeaks()).toBe(false);

    // 测试失败情况（请求永不返回）
    tracker.reset();

    const makeRequestFail = () => {
      timeoutId = tracker.createTimeout(() => {
        console.log('Request timeout');
        // 错误：超时触发后没有清理自己
      }, 100);

      // 模拟请求永不返回
    };

    makeRequestFail();

    await new Promise(resolve => setTimeout(resolve, 150));

    // 验证：timeout 泄漏了（虽然已触发，但没有从追踪器删除）
    // 注意：实际的 setTimeout 会自动清理，但如果有其他资源就会泄漏
  });

  test('正确：finally 块确保清理', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ data: 'success' })
      .mockRejectedValueOnce(new Error('Network error'));

    const fetchWithCleanup = async (shouldFail = false) => {
      const conn = tracker.createConnection();
      try {
        const fetch = shouldFail ? mockFetch.mockRejectedValueOnce(new Error()) : mockFetch;
        const data = await fetch();
        return data;
      } catch (error) {
        throw error;
      } finally {
        // 正确：finally 确保无论如何都清理
        tracker.closeConnection(conn);
      }
    };

    // 成功情况
    await fetchWithCleanup(false);
    expect(tracker.hasLeaks()).toBe(false);

    // 失败情况
    try {
      await fetchWithCleanup(true);
    } catch (error) {
      // 预期的错误
    }
    expect(tracker.hasLeaks()).toBe(false);
  });

  test('复杂场景：多个资源都需要清理', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ status: 'pending' });

    let intervalId, timeoutId, conn;

    // 错误：只清理了部分资源
    const pollStatusBad = () => {
      intervalId = tracker.createInterval(async () => {
        const data = await mockFetch();
        if (data.status === 'completed') {
          tracker.clearInterval(intervalId);  // 只清理了 interval
          // 忘记清理 timeout 和 connection！
        }
      }, 100);

      timeoutId = tracker.createTimeout(() => {
        console.log('Timeout');
        tracker.clearInterval(intervalId);
        // 忘记清理 timeout 自己和 connection！
      }, 500);

      conn = tracker.createConnection();
    };

    pollStatusBad();

    await new Promise(resolve => setTimeout(resolve, 600));

    // 验证：有资源泄漏
    expect(tracker.hasLeaks()).toBe(true);
    expect(tracker.getLeakCount()).toBeGreaterThan(0);
  });

  test('正确：集中清理所有资源', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ status: 'pending' });

    let intervalId, timeoutId, conn;

    const cleanup = () => {
      if (intervalId) tracker.clearInterval(intervalId);
      if (timeoutId) tracker.clearTimeout(timeoutId);
      if (conn) tracker.closeConnection(conn);
    };

    const pollStatusGood = () => {
      intervalId = tracker.createInterval(async () => {
        try {
          const data = await mockFetch();
          if (data.status === 'completed' || data.status === 'failed') {
            cleanup();  // 集中清理
          }
        } catch (error) {
          cleanup();  // 错误时也清理
        }
      }, 100);

      timeoutId = tracker.createTimeout(() => {
        console.log('Timeout');
        cleanup();  // 超时时清理
      }, 500);

      conn = tracker.createConnection();
    };

    pollStatusGood();

    await new Promise(resolve => setTimeout(resolve, 600));

    // 验证：所有资源都被清理
    expect(tracker.hasLeaks()).toBe(false);
  });

  test('边界情况：嵌套资源清理', async () => {
    // 场景：资源 A 创建了资源 B，清理时要按顺序清理
    const cleanup = [];

    const createNestedResources = () => {
      const conn1 = tracker.createConnection();
      cleanup.push(() => tracker.closeConnection(conn1));

      const intervalId = tracker.createInterval(() => {
        const conn2 = tracker.createConnection();
        cleanup.push(() => tracker.closeConnection(conn2));
      }, 100);
      cleanup.push(() => tracker.clearInterval(intervalId));
    };

    createNestedResources();

    await new Promise(resolve => setTimeout(resolve, 250));

    // 手动清理（逆序）
    while (cleanup.length > 0) {
      const cleanupFn = cleanup.pop();
      cleanupFn();
    }

    // 验证：所有资源都被清理
    expect(tracker.hasLeaks()).toBe(false);
  });

  test('真实案例：轮询状态泄漏', async () => {
    // 模拟真实的扫描状态轮询
    const mockFetchStatus = jest.fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockRejectedValueOnce(new Error('Network error'));  // 第三次失败

    let scanPollInterval;

    // 错误版本
    const pollStatusBad = (scanId) => {
      scanPollInterval = tracker.createInterval(async () => {
        const data = await mockFetchStatus(scanId);
        if (data.status === 'completed') {
          tracker.clearInterval(scanPollInterval);
          // 只在成功时清理
        }
      }, 100);
    };

    pollStatusBad('scan123');

    await new Promise(resolve => setTimeout(resolve, 350));

    // 验证：interval 泄漏了（因为遇到错误）
    expect(tracker.hasLeaks()).toBe(true);

    // 清理后重试正确版本
    tracker.reset();

    const mockFetchStatus2 = jest.fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockRejectedValueOnce(new Error('Network error'));

    const pollStatusGood = (scanId, maxAttempts = 30) => {
      let attempts = 0;
      scanPollInterval = tracker.createInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          tracker.clearInterval(scanPollInterval);  // 超时清理
          return;
        }
        try {
          const data = await mockFetchStatus2(scanId);
          if (data.status === 'completed' || data.status === 'failed') {
            tracker.clearInterval(scanPollInterval);  // 完成清理
          }
        } catch (error) {
          tracker.clearInterval(scanPollInterval);  // 错误清理
          console.error(error);
        }
      }, 100);
    };

    pollStatusGood('scan123');

    await new Promise(resolve => setTimeout(resolve, 250));

    // 验证：无泄漏
    expect(tracker.hasLeaks()).toBe(false);
  });

  test('自检清单：退出路径检查', () => {
    // 函数有多少个退出路径？
    const countExitPaths = (code) => {
      const returns = (code.match(/return/g) || []).length;
      const throws = (code.match(/throw/g) || []).length;
      const implicitExit = 1;  // 函数结束
      return returns + throws + implicitExit;
    };

    // 是否所有退出路径都清理了资源？
    const hasCleanupInAllPaths = (code) => {
      const cleanupCalls = (code.match(/clearInterval|clearTimeout|close|cleanup/g) || []).length;
      const exitPaths = countExitPaths(code);

      // 简化检查：至少有 finally 块，或者清理调用数 >= 退出路径数
      const hasFinally = code.includes('finally');
      return hasFinally || cleanupCalls >= exitPaths;
    };

    const badCode = `
      function poll() {
        const id = setInterval(() => {
          if (done) {
            clearInterval(id);
            return;  // 退出路径1
          }
          // 错误：没有其他清理
        }, 100);
      }
    `;

    const goodCode = `
      function poll() {
        const id = setInterval(() => {
          try {
            if (done) {
              clearInterval(id);
              return;  // 退出路径1
            }
          } catch (error) {
            clearInterval(id);  // 退出路径2
            throw error;
          }
        }, 100);
      }
    `;

    const bestCode = `
      function poll() {
        const id = setInterval(() => {
          try {
            if (done) return;
          } finally {
            clearInterval(id);  // 所有路径都清理
          }
        }, 100);
      }
    `;

    expect(hasCleanupInAllPaths(badCode)).toBe(false);
    expect(hasCleanupInAllPaths(goodCode)).toBe(true);
    expect(hasCleanupInAllPaths(bestCode)).toBe(true);
  });
});
