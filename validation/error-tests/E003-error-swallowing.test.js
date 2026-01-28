/**
 * E003: 错误未重新抛出 - 测试用例
 *
 * 严重程度: 🔴 严重
 * 发生频率: 中频
 *
 * 问题: catch 块中捕获错误但不重新抛出，导致调用者无法感知错误
 * 解决方案: catch 后重新 throw，让错误向上传播
 */

describe('E003: 错误未重新抛出', () => {
  // 模拟 API 调用
  const mockFetchUser = (id) => {
    if (id === 'error') {
      return Promise.reject(new Error('User not found'));
    }
    return Promise.resolve({ id, name: 'Test User' });
  };

  describe('❌ 错误代码：错误被吞掉', () => {
    test('应该吞掉错误（调用者无法感知）', async () => {
      // ❌ 错误：错误被吞掉
      async function fetchUser(id) {
        try {
          return await mockFetchUser(id);
        } catch (error) {
          console.error('获取失败:', error);
          // 没有 throw，调用者无法感知错误
        }
      }

      // 调用错误的函数
      const result = await fetchUser('error');

      // 验证：结果是 undefined（而不是抛出错误）
      expect(result).toBeUndefined();
    });

    test('调用者无法区分成功和失败', async () => {
      // ❌ 错误版本
      async function fetchUserBad(id) {
        try {
          return await mockFetchUser(id);
        } catch (error) {
          console.error('获取失败:', error);
          // 不抛出，调用者无法知道失败
        }
      }

      const successResult = await fetchUserBad('user-123');
      const failureResult = await fetchUserBad('error');

      // 问题：成功返回对象，失败返回 undefined
      // 调用者需要检查 result 是否为 undefined
      expect(successResult).toBeDefined();
      expect(failureResult).toBeUndefined(); // 这不是好的 API 设计
    });

    test('后续代码继续执行（可能导致级联错误）', async () => {
      let executedAfterError = false;

      // ❌ 错误版本
      async function processUser(id) {
        try {
          const user = await mockFetchUser(id);
          // 如果 user 是 undefined，这里会出错
          return user.name.toUpperCase();
        } catch (error) {
          console.error('处理失败:', error);
          // 不抛出，但返回 undefined
        }
      }

      try {
        await processUser('error');
        executedAfterError = true; // 这里会执行
      } catch (error) {
        // 不会进入这里
      }

      // 验证：后续代码继续执行（问题！）
      expect(executedAfterError).toBe(true);
    });
  });

  describe('✅ 正确代码：重新抛出', () => {
    test('应该重新抛出错误', async () => {
      // ✅ 正确：重新抛出
      async function fetchUser(id) {
        try {
          return await mockFetchUser(id);
        } catch (error) {
          console.error('获取失败:', error);
          throw new Error(`无法获取用户 ${id}: ${error.message}`);
        }
      }

      // 验证：调用者可以捕获错误
      await expect(fetchUser('error')).rejects.toThrow('无法获取用户 error');
    });

    test('调用者可以明确区分成功和失败', async () => {
      // ✅ 正确版本
      async function fetchUserGood(id) {
        try {
          return await mockFetchUser(id);
        } catch (error) {
          console.error('获取失败:', error);
          throw new Error(`无法获取用户 ${id}: ${error.message}`);
        }
      }

      const successResult = await fetchUserGood('user-123');
      expect(successResult).toBeDefined();
      expect(successResult.name).toBe('Test User');

      // 失败时抛出错误
      await expect(fetchUserGood('error')).rejects.toThrow();
    });

    test('后续代码不会执行（错误被正确传播）', async () => {
      let executedAfterError = false;

      // ✅ 正确版本
      async function processUser(id) {
        try {
          const user = await mockFetchUser(id);
          return user.name.toUpperCase();
        } catch (error) {
          console.error('处理失败:', error);
          throw new Error(`无法处理用户 ${id}: ${error.message}`);
        }
      }

      try {
        await processUser('error');
        executedAfterError = true; // 这里不会执行
      } catch (error) {
        // 会进入这里
        expect(error.message).toContain('无法处理用户');
      }

      // 验证：后续代码不执行（正确！）
      expect(executedAfterError).toBe(false);
    });

    test('错误信息应该包含上下文', async () => {
      // ✅ 正确：增强错误信息
      async function fetchUser(id) {
        try {
          return await mockFetchUser(id);
        } catch (error) {
          // 添加上下文信息
          throw new Error(`无法获取用户 ${id}: ${error.message}`);
        }
      }

      try {
        await fetchUser('error');
      } catch (error) {
        // 验证：错误信息包含上下文
        expect(error.message).toContain('无法获取用户');
        expect(error.message).toContain('error');
        expect(error.message).toContain('User not found');
      }
    });
  });

  describe('📋 自检清单', () => {
    test('检查点1: catch 块是否 throw error?', () => {
      const goodCode = `
        try {
          return await fetch('/api/users/' + id);
        } catch (error) {
          console.error('获取失败:', error);
          throw new Error(\`无法获取用户 \${id}: \${error.message}\`);
        }
      `;

      const badCode = `
        try {
          return await fetch('/api/users/' + id);
        } catch (error) {
          console.error('获取失败:', error);
          // 没有 throw
        }
      `;

      expect(goodCode).toContain('throw');
      expect(badCode).not.toContain('throw');
    });

    test('检查点2: 错误信息是否包含上下文?', () => {
      const goodCode = `
        throw new Error(\`无法获取用户 \${id}: \${error.message}\`);
      `;

      // 检查是否包含上下文变量（id）和原错误信息
      expect(goodCode).toContain('${id}');
      expect(goodCode).toContain('${error.message}');
    });

    test('检查点3: 是否避免了空的 catch 块?', () => {
      const badCode1 = `
        try {
          await doSomething();
        } catch (error) {
          // 空的 catch 块
        }
      `;

      const badCode2 = `
        try {
          await doSomething();
        } catch (error) {
          console.error(error); // 只记录，不抛出
        }
      `;

      const goodCode = `
        try {
          await doSomething();
        } catch (error) {
          console.error(error);
          throw error; // 或 throw new Error(...)
        }
      `;

      // 坏的代码不应该出现（这里只是示例）
      expect(badCode1).not.toContain('throw');
      expect(badCode2).not.toContain('throw');
      expect(goodCode).toContain('throw');
    });
  });

  describe('🎯 错误传播验证', () => {
    test('嵌套调用中的错误传播', async () => {
      // 模拟三层调用栈
      async function level1(id) {
        try {
          return await level2(id);
        } catch (error) {
          throw new Error(`Level 1 错误: ${error.message}`);
        }
      }

      async function level2(id) {
        try {
          return await level3(id);
        } catch (error) {
          throw new Error(`Level 2 错误: ${error.message}`);
        }
      }

      async function level3(id) {
        try {
          return await mockFetchUser(id);
        } catch (error) {
          throw new Error(`Level 3 错误: ${error.message}`);
        }
      }

      try {
        await level1('error');
      } catch (error) {
        // 验证：错误信息包含所有层级的上下文
        expect(error.message).toContain('Level 1');
        expect(error.message).toContain('Level 2');
        expect(error.message).toContain('Level 3');
      }
    });

    test('Promise.all 中的错误传播', async () => {
      async function fetchUserWithThrow(id) {
        try {
          return await mockFetchUser(id);
        } catch (error) {
          throw new Error(`无法获取用户 ${id}: ${error.message}`);
        }
      }

      const userIds = ['user-1', 'error', 'user-3'];

      // Promise.all 会在第一个错误时拒绝
      await expect(
        Promise.all(userIds.map(id => fetchUserWithThrow(id)))
      ).rejects.toThrow('无法获取用户 error');
    });
  });
});
