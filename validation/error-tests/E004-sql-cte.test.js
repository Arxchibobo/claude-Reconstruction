/**
 * E004: SQL 未用 CTE 预过滤
 *
 * 错误模式：JOIN 后再过滤，导致全表扫描
 * 正确模式：用 CTE 预过滤大表，减少 JOIN 数据量
 *
 * 严重程度：🟡 中等
 * 频率：中频
 */

describe('E004: SQL 未用 CTE 预过滤', () => {

  // Mock 数据库查询函数
  const mockDB = {
    // 模拟数据量
    users: Array.from({ length: 10000 }, (_, i) => ({ id: i + 1, name: `User${i + 1}` })),
    orders: Array.from({ length: 50000 }, (_, i) => ({
      id: i + 1,
      user_id: (i % 10000) + 1,
      created_at: new Date(2026, 0, Math.floor(i / 1000) + 1),
      total: Math.random() * 1000
    })),

    // 模拟 JOIN 后过滤（慢）
    queryWithoutCTE: function(startDate) {
      const start = Date.now();

      // 模拟：先 JOIN 所有数据
      const joined = this.users.flatMap(user =>
        this.orders
          .filter(order => order.user_id === user.id)
          .map(order => ({ ...user, ...order }))
      );

      // 然后再过滤日期
      const filtered = joined.filter(row => row.created_at >= startDate);

      return {
        results: filtered,
        duration: Date.now() - start,
        scanned: this.users.length * this.orders.length  // 全表扫描
      };
    },

    // 模拟用 CTE 预过滤（快）
    queryWithCTE: function(startDate) {
      const start = Date.now();

      // CTE: 先过滤 orders
      const recentOrders = this.orders.filter(order => order.created_at >= startDate);

      // 然后 JOIN 预过滤后的数据
      const joined = this.users.flatMap(user =>
        recentOrders
          .filter(order => order.user_id === user.id)
          .map(order => ({ ...user, ...order }))
      );

      return {
        results: joined,
        duration: Date.now() - start,
        scanned: recentOrders.length  // 只扫描过滤后的数据
      };
    }
  };

  test('错误：JOIN 后过滤（全表扫描）', () => {
    const startDate = new Date(2026, 0, 15);
    const result = mockDB.queryWithoutCTE(startDate);

    // 验证：扫描了大量数据
    expect(result.scanned).toBeGreaterThan(10000000);  // 10M+ 行扫描

    // 验证：性能差
    expect(result.duration).toBeGreaterThan(50);  // 应该很慢
  });

  test('正确：用 CTE 预过滤', () => {
    const startDate = new Date(2026, 0, 15);
    const result = mockDB.queryWithCTE(startDate);

    // 验证：只扫描必要的数据
    expect(result.scanned).toBeLessThan(50000);  // 只扫描过滤后的数据

    // 验证：性能好
    expect(result.duration).toBeLessThan(30);  // 应该快很多
  });

  test('性能对比：CTE 至少快 2 倍', () => {
    const startDate = new Date(2026, 0, 15);

    const withoutCTE = mockDB.queryWithoutCTE(startDate);
    const withCTE = mockDB.queryWithCTE(startDate);

    // 验证：CTE 版本显著更快
    expect(withCTE.duration).toBeLessThan(withoutCTE.duration / 2);

    // 验证：结果一致
    expect(withCTE.results.length).toBe(withoutCTE.results.length);
  });

  test('数据量差异：CTE 扫描量显著减少', () => {
    const startDate = new Date(2026, 0, 15);

    const withoutCTE = mockDB.queryWithoutCTE(startDate);
    const withCTE = mockDB.queryWithCTE(startDate);

    // 验证：CTE 扫描的数据量大幅减少
    const reduction = (withoutCTE.scanned - withCTE.scanned) / withoutCTE.scanned;
    expect(reduction).toBeGreaterThan(0.9);  // 减少 90%+ 的扫描量
  });

  test('复杂场景：多个大表 JOIN', () => {
    // 模拟：用户 JOIN 订单 JOIN 产品
    const products = Array.from({ length: 5000 }, (_, i) => ({
      id: i + 1,
      name: `Product${i + 1}`
    }));

    // 错误：先 JOIN 再过滤
    const withoutCTE = () => {
      const start = Date.now();
      let scanned = 0;

      const results = mockDB.users.flatMap(user =>
        mockDB.orders
          .filter(order => order.user_id === user.id)
          .flatMap(order => {
            scanned += products.length;
            return products.map(product => ({
              user: user.name,
              order: order.id,
              product: product.name,
              created_at: order.created_at
            }));
          })
      ).filter(row => row.created_at >= new Date(2026, 0, 15));

      return { results, duration: Date.now() - start, scanned };
    };

    // 正确：用 CTE 预过滤
    const withCTE = () => {
      const start = Date.now();

      // CTE 1: 过滤 orders
      const recentOrders = mockDB.orders.filter(o => o.created_at >= new Date(2026, 0, 15));

      // CTE 2: JOIN 预过滤的数据
      const results = mockDB.users.flatMap(user =>
        recentOrders
          .filter(order => order.user_id === user.id)
          .flatMap(order =>
            products.map(product => ({
              user: user.name,
              order: order.id,
              product: product.name,
              created_at: order.created_at
            }))
          )
      );

      return { results, duration: Date.now() - start, scanned: recentOrders.length * products.length };
    };

    const slow = withoutCTE();
    const fast = withCTE();

    // 验证：CTE 版本显著更快
    expect(fast.duration).toBeLessThan(slow.duration / 2);

    // 验证：扫描量显著减少
    expect(fast.scanned).toBeLessThan(slow.scanned / 10);
  });

  test('边界情况：过滤条件很宽松', () => {
    // 如果过滤条件很宽松（大部分数据都满足），CTE 优势不明显
    const startDate = new Date(2026, 0, 1);  // 包含所有数据

    const withoutCTE = mockDB.queryWithoutCTE(startDate);
    const withCTE = mockDB.queryWithCTE(startDate);

    // 验证：结果一致
    expect(withCTE.results.length).toBe(withoutCTE.results.length);

    // 验证：即使过滤宽松，CTE 也不会变慢
    expect(withCTE.duration).toBeLessThanOrEqual(withoutCTE.duration * 1.2);
  });

  test('边界情况：过滤条件很严格', () => {
    // 如果过滤条件很严格（只有少量数据满足），CTE 优势巨大
    const startDate = new Date(2026, 1, 1);  // 未来日期，没有数据

    const withoutCTE = mockDB.queryWithoutCTE(startDate);
    const withCTE = mockDB.queryWithCTE(startDate);

    // 验证：结果一致（都是空）
    expect(withCTE.results.length).toBe(0);
    expect(withoutCTE.results.length).toBe(0);

    // 验证：CTE 版本显著更快（因为预过滤后没数据，不需要 JOIN）
    expect(withCTE.duration).toBeLessThan(withoutCTE.duration / 5);
  });

  test('自检：识别需要 CTE 的场景', () => {
    // 场景识别规则
    const needsCTE = (query) => {
      // 1. 是否有 JOIN
      const hasJoin = query.includes('JOIN');

      // 2. 是否在 JOIN 后有 WHERE
      const whereAfterJoin = query.match(/JOIN.*WHERE/i);

      // 3. WHERE 条件是否只针对某一个表
      const whereOnOneTable = query.match(/WHERE\s+(\w+)\./i);

      return hasJoin && whereAfterJoin && whereOnOneTable;
    };

    // 测试用例
    const badQuery = `
      SELECT u.name, o.total
      FROM users u
      JOIN orders o ON u.id = o.user_id
      WHERE o.created_at > '2026-01-01'
    `;

    const goodQuery = `
      WITH recent_orders AS (
        SELECT user_id, total
        FROM orders
        WHERE created_at > '2026-01-01'
      )
      SELECT u.name, ro.total
      FROM users u
      JOIN recent_orders ro ON u.id = ro.user_id
    `;

    expect(needsCTE(badQuery)).toBe(true);
    expect(needsCTE(goodQuery)).toBe(false);  // 已经用了 CTE
  });

  test('真实案例：Bot 收入分析查询', () => {
    // 模拟真实的 Bot 收入分析查询
    const mockBotOrders = Array.from({ length: 100000 }, (_, i) => ({
      id: i + 1,
      bot_id: (i % 100) + 1,
      user_id: (i % 5000) + 1,
      created_at: new Date(2026, 0, (i % 30) + 1),
      amount: Math.random() * 100
    }));

    const mockBots = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Bot${i + 1}`
    }));

    // 错误：JOIN 后过滤
    const withoutCTE = () => {
      const start = Date.now();
      const results = mockBots.flatMap(bot =>
        mockBotOrders
          .filter(order => order.bot_id === bot.id)
          .map(order => ({ bot: bot.name, amount: order.amount, created_at: order.created_at }))
      ).filter(row => row.created_at >= new Date(2026, 0, 20));

      return { results, duration: Date.now() - start };
    };

    // 正确：用 CTE 预过滤
    const withCTE = () => {
      const start = Date.now();

      // CTE: 先过滤日期
      const recentOrders = mockBotOrders.filter(o => o.created_at >= new Date(2026, 0, 20));

      const results = mockBots.flatMap(bot =>
        recentOrders
          .filter(order => order.bot_id === bot.id)
          .map(order => ({ bot: bot.name, amount: order.amount, created_at: order.created_at }))
      );

      return { results, duration: Date.now() - start };
    };

    const slow = withoutCTE();
    const fast = withCTE();

    // 验证：结果一致
    expect(fast.results.length).toBe(slow.results.length);

    // 验证：性能提升
    expect(fast.duration).toBeLessThan(slow.duration);
  });
});
