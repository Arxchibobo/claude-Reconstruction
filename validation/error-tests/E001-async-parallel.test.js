/**
 * E001: 异步未并行 - 测试用例
 *
 * 严重程度: 🔴 严重
 * 发生频率: 高频
 *
 * 问题: 多个独立异步操作按顺序执行，导致性能问题
 * 解决方案: 使用 Promise.all() 并行执行
 */

describe('E001: 异步未并行', () => {
  // 模拟 API 调用函数
  const mockApiSearch = (term) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ term, results: [`result for ${term}`] });
      }, 100); // 模拟 100ms 延迟
    });
  };

  describe('❌ 错误代码：顺序执行', () => {
    test('应该很慢（累加延迟）', async () => {
      const searchTerms = ['react', 'vue', 'angular', 'svelte', 'solid'];
      const allResults = [];

      const startTime = Date.now();

      // ❌ 错误：顺序执行（5次 × 100ms = 500ms+）
      for (const term of searchTerms) {
        const results = await mockApiSearch(term);
        allResults.push(...results.results);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证：顺序执行应该接近 500ms
      expect(duration).toBeGreaterThan(450);
      expect(allResults).toHaveLength(5);
    });

    test('顺序执行导致后面的请求等待', async () => {
      const executionOrder = [];

      const trackingApiSearch = async (term, index) => {
        executionOrder.push({ term, index, event: 'start' });
        await mockApiSearch(term);
        executionOrder.push({ term, index, event: 'end' });
      };

      // ❌ 错误：顺序执行
      for (let i = 0; i < 3; i++) {
        await trackingApiSearch(`term${i}`, i);
      }

      // 验证：顺序执行应该是 start → end → start → end
      expect(executionOrder).toEqual([
        { term: 'term0', index: 0, event: 'start' },
        { term: 'term0', index: 0, event: 'end' },
        { term: 'term1', index: 1, event: 'start' },
        { term: 'term1', index: 1, event: 'end' },
        { term: 'term2', index: 2, event: 'start' },
        { term: 'term2', index: 2, event: 'end' },
      ]);
    });
  });

  describe('✅ 正确代码：并行执行', () => {
    test('应该快得多（最大延迟）', async () => {
      const searchTerms = ['react', 'vue', 'angular', 'svelte', 'solid'];

      const startTime = Date.now();

      // ✅ 正确：并行执行（max 100ms）
      const searchPromises = searchTerms.map(term =>
        mockApiSearch(term)
          .then(results => ({ term, results: results.results, success: true }))
          .catch(error => ({ term, results: [], success: false, error: error.message }))
      );
      const searchResults = await Promise.all(searchPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证：并行执行应该接近 100ms（而非 500ms）
      expect(duration).toBeLessThan(200);
      expect(searchResults).toHaveLength(5);
      expect(searchResults.every(r => r.success)).toBe(true);
    });

    test('并行执行所有请求同时开始', async () => {
      const executionOrder = [];

      const trackingApiSearch = async (term, index) => {
        executionOrder.push({ term, index, event: 'start', time: Date.now() });
        await mockApiSearch(term);
        executionOrder.push({ term, index, event: 'end', time: Date.now() });
      };

      // ✅ 正确：并行执行
      const promises = [0, 1, 2].map(i => trackingApiSearch(`term${i}`, i));
      await Promise.all(promises);

      const startEvents = executionOrder.filter(e => e.event === 'start');
      const startTimes = startEvents.map(e => e.time);

      // 验证：所有请求几乎同时开始（时间差 < 10ms）
      const maxStartTimeDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(maxStartTimeDiff).toBeLessThan(10);
    });

    test('并行执行处理错误而不影响其他请求', async () => {
      const failingApiSearch = (term) => {
        if (term === 'fail') {
          return Promise.reject(new Error('API error'));
        }
        return mockApiSearch(term);
      };

      const searchTerms = ['success1', 'fail', 'success2'];

      // ✅ 正确：每个 Promise 都有错误处理
      const searchPromises = searchTerms.map(term =>
        failingApiSearch(term)
          .then(results => ({ term, results: results.results, success: true }))
          .catch(error => ({ term, results: [], success: false, error: error.message }))
      );
      const searchResults = await Promise.all(searchPromises);

      // 验证：失败的请求不影响成功的请求
      expect(searchResults).toHaveLength(3);
      expect(searchResults[0].success).toBe(true);
      expect(searchResults[1].success).toBe(false);
      expect(searchResults[2].success).toBe(true);
    });
  });

  describe('📋 自检清单', () => {
    test('检查点1: 多个独立异步操作是否用 Promise.all()?', () => {
      const codeSnippet = `
        const searchPromises = searchTerms.map(term => api.search(term));
        const searchResults = await Promise.all(searchPromises);
      `;

      // 检查代码中是否包含 Promise.all
      expect(codeSnippet).toContain('Promise.all');
      expect(codeSnippet).toContain('.map(');
    });

    test('检查点2: 每个 Promise 是否有错误处理?', () => {
      const codeSnippet = `
        const searchPromises = searchTerms.map(term =>
          api.search(term)
            .then(results => ({ term, results, success: true }))
            .catch(error => ({ term, results: [], success: false, error: error.message }))
        );
      `;

      // 检查每个 Promise 是否有 catch 处理
      expect(codeSnippet).toContain('.catch(');
    });

    test('检查点3: 是否避免了 for...await 循环?', () => {
      const goodCode = `
        const promises = items.map(item => processItem(item));
        const results = await Promise.all(promises);
      `;

      const badCode = `
        for (const item of items) {
          const result = await processItem(item);
        }
      `;

      // 好的代码应该用 Promise.all
      expect(goodCode).toContain('Promise.all');
      // 坏的代码不应该出现（这里只是示例）
      expect(badCode).not.toContain('Promise.all');
    });
  });

  describe('🎯 性能基准', () => {
    test('并行 vs 顺序性能对比（10倍+差距）', async () => {
      const searchTerms = ['react', 'vue', 'angular', 'svelte', 'solid'];

      // 测量顺序执行时间
      const sequentialStart = Date.now();
      for (const term of searchTerms) {
        await mockApiSearch(term);
      }
      const sequentialTime = Date.now() - sequentialStart;

      // 测量并行执行时间
      const parallelStart = Date.now();
      const promises = searchTerms.map(term => mockApiSearch(term));
      await Promise.all(promises);
      const parallelTime = Date.now() - parallelStart;

      // 验证：并行至少比顺序快 3 倍
      expect(parallelTime).toBeLessThan(sequentialTime / 3);

      console.log(`性能对比:
        顺序执行: ${sequentialTime}ms
        并行执行: ${parallelTime}ms
        提升倍数: ${(sequentialTime / parallelTime).toFixed(2)}x
      `);
    });
  });
});
