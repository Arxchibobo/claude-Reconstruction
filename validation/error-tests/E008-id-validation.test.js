/**
 * E008: 数据查询前未验证 ID 类型
 *
 * 错误模式：看到数字直接当作 ID，未验证来源和类型
 * 正确模式：先确认 ID 的含义和范围，再查询正确的表
 *
 * 严重程度：🔴 严重
 * 频率：高频
 */

describe('E008: 数据查询前未验证 ID 类型', () => {

  // Mock 数据库
  const mockDB = {
    users: [
      { id: 1, name: 'User1' },
      { id: 100, name: 'User100' },
      { id: 48607088, name: 'User48607088' }  // 最大 user_id
    ],

    bots: [
      { bot_id: 1747227835, name: 'Bot1', user_id: 1 },
      { bot_id: 1769012250, name: 'Bot2', user_id: 100 }  // 10位 bot_id
    ],

    art_tasks: [
      { id: 1, bot_id: 1769012250, created_date: new Date('2026-01-20') },
      { id: 2, bot_id: 1747227835, created_date: new Date('2026-01-21') }
    ],

    energy_logs: [
      { id: 1, bot_id: 1769012250, user_id: 1, amount: 100 },
      { id: 2, bot_id: 1747227835, user_id: 100, amount: 200 }
    ]
  };

  test('错误：误将 bot_id 当作 Unix 时间戳', () => {
    // 场景：用户给了 1769012250，错误地用 FROM_UNIXTIME 转换
    const id = 1769012250;

    // 错误：以为是时间戳
    const asTimestamp = new Date(id * 1000);

    // 验证：转换结果是 2026年，但这个ID其实是 bot_id
    expect(asTimestamp.getFullYear()).toBe(2026);

    // 正确做法：检查ID范围
    const isBotId = id >= 1747227835 && id <= 1769012250;
    const isUserId = id >= 1 && id <= 48607088 && id.toString().length <= 8;

    expect(isBotId).toBe(true);
    expect(isUserId).toBe(false);
  });

  test('正确：根据 ID 范围判断类型', () => {
    const testIds = [
      { id: 1769012250, expected: 'bot_id' },
      { id: 1747227835, expected: 'bot_id' },
      { id: 100, expected: 'user_id' },
      { id: 48607088, expected: 'user_id' }
    ];

    const identifyIdType = (id) => {
      // bot_id: 10位数字，范围 1747227835 - 1769012250
      if (id >= 1747227835 && id <= 1769012250) {
        return 'bot_id';
      }

      // user_id: 最多8位数字，范围 1 - 48607088
      if (id >= 1 && id <= 48607088 && id.toString().length <= 8) {
        return 'user_id';
      }

      return 'unknown';
    };

    testIds.forEach(({ id, expected }) => {
      expect(identifyIdType(id)).toBe(expected);
    });
  });

  test('错误：根据数字位数猜测，但没有验证', () => {
    // 错误：简单地认为10位数字就是 bot_id
    const guessType = (id) => {
      return id.toString().length === 10 ? 'bot_id' : 'user_id';
    };

    // 问题：2026年的 Unix 时间戳也是10位数字
    const unixTimestamp = 1769012250;
    expect(guessType(unixTimestamp)).toBe('bot_id');  // 误判

    // 问题：未来可能有更大的 user_id
    const futureUserId = 100000000;  // 9位数字
    expect(guessType(futureUserId)).toBe('user_id');  // 误判
  });

  test('正确：结合上下文判断 ID 类型', () => {
    // 场景：用户说 "这些都是 bot id, bytebase art_task 查看下"
    const userMessage = "这些都是 bot id, bytebase art_task 查看下: 1769012250, 1769002640";
    const ids = [1769012250, 1769002640];

    // 正确：从上下文提取关键信息
    const context = {
      mentionedTable: userMessage.includes('art_task') ? 'art_task' : null,
      explicitType: userMessage.includes('bot id') ? 'bot_id' : null
    };

    expect(context.mentionedTable).toBe('art_task');
    expect(context.explicitType).toBe('bot_id');

    // 查询正确的表
    const results = mockDB.art_tasks.filter(task => ids.includes(task.bot_id));
    expect(results.length).toBeGreaterThan(0);
  });

  test('真实案例：多个10位数字的混淆', () => {
    // 场景：用户提供了7个10位数字
    const numbers = [1769012250, 1769002640, 1750651225, 1764548840, 1751403670, 1764589775, 1753001050];

    // 错误做法1：全部当作 Unix 时间戳
    const asTimestamps = numbers.map(n => new Date(n * 1000));
    const allIn2026 = asTimestamps.every(d => d.getFullYear() === 2026);
    expect(allIn2026).toBe(false);  // 有些不在2026年

    // 错误做法2：全部当作 user_id
    const asUserIds = mockDB.users.filter(u => numbers.includes(u.id));
    expect(asUserIds.length).toBe(0);  // 查不到任何用户

    // 正确做法：识别为 bot_id
    const asBotIds = mockDB.bots.filter(b => numbers.includes(b.bot_id));
    expect(asBotIds.length).toBeGreaterThan(0);  // 能查到 bot
  });

  test('自检清单：查询前的验证步骤', () => {
    const validateBeforeQuery = (id, context = {}) => {
      const checks = {
        // 1. ID含义是否明确？
        typeKnown: context.explicitType !== undefined,

        // 2. 是否提到了表名？
        tableKnown: context.table !== undefined,

        // 3. ID范围是否合理？
        rangeValid: false,

        // 4. 如果不确定，是否询问用户？
        askedUser: context.askedUser === true
      };

      // 检查范围
      if (context.explicitType === 'bot_id') {
        checks.rangeValid = id >= 1747227835 && id <= 1769012250;
      } else if (context.explicitType === 'user_id') {
        checks.rangeValid = id >= 1 && id <= 48607088;
      }

      // 至少要满足：类型已知 或 表已知 或 已询问用户
      const isValid = checks.typeKnown || checks.tableKnown || checks.askedUser;

      return { checks, isValid };
    };

    // 场景1：没有任何上下文
    const case1 = validateBeforeQuery(1769012250, {});
    expect(case1.isValid).toBe(false);  // 不应该直接查询

    // 场景2：用户明确说了是 bot_id
    const case2 = validateBeforeQuery(1769012250, { explicitType: 'bot_id' });
    expect(case2.isValid).toBe(true);
    expect(case2.checks.rangeValid).toBe(true);

    // 场景3：用户提到了表名
    const case3 = validateBeforeQuery(1769012250, { table: 'art_task' });
    expect(case3.isValid).toBe(true);

    // 场景4：询问了用户
    const case4 = validateBeforeQuery(1769012250, { askedUser: true });
    expect(case4.isValid).toBe(true);
  });

  test('边界情况：ID在多个范围都可能', () => {
    // 小的数字可能是 user_id 也可能是 bot_id（如果未来bot_id重新编号）
    const ambiguousId = 100;

    const possibleTypes = [];
    if (ambiguousId >= 1 && ambiguousId <= 48607088) possibleTypes.push('user_id');
    // bot_id 范围不包含100，所以不会混淆

    expect(possibleTypes).toContain('user_id');
    expect(possibleTypes).not.toContain('bot_id');
  });

  test('最佳实践：提供清晰的查询接口', () => {
    // 好的API设计：明确ID类型
    const queryByUserId = (userId) => {
      if (userId < 1 || userId > 48607088) {
        throw new Error(`Invalid user_id: ${userId}`);
      }
      return mockDB.users.find(u => u.id === userId);
    };

    const queryByBotId = (botId) => {
      if (botId < 1747227835 || botId > 1769012250) {
        throw new Error(`Invalid bot_id: ${botId}`);
      }
      return mockDB.bots.find(b => b.bot_id === botId);
    };

    // 正确用法
    expect(queryByUserId(100)).toBeDefined();
    expect(queryByBotId(1769012250)).toBeDefined();

    // 错误用法会抛出异常
    expect(() => queryByUserId(1769012250)).toThrow('Invalid user_id');
    expect(() => queryByBotId(100)).toThrow('Invalid bot_id');
  });

  test('复杂场景：多种ID混合查询', () => {
    // 场景：查询 art_task，需要 bot_id，但可能提供了 user_id
    const queryArtTasks = (ids, idType) => {
      if (idType === 'bot_id') {
        return mockDB.art_tasks.filter(task => ids.includes(task.bot_id));
      } else if (idType === 'user_id') {
        // 先找到用户的 bot
        const userBots = mockDB.bots.filter(b => ids.includes(b.user_id));
        const botIds = userBots.map(b => b.bot_id);
        return mockDB.art_tasks.filter(task => botIds.includes(task.bot_id));
      }
      throw new Error('Unknown ID type');
    };

    // 用 bot_id 查询
    const tasksByBot = queryArtTasks([1769012250], 'bot_id');
    expect(tasksByBot.length).toBeGreaterThan(0);

    // 用 user_id 查询（需要先转换）
    const tasksByUser = queryArtTasks([100], 'user_id');
    expect(tasksByUser.length).toBeGreaterThan(0);
  });

  test('真实案例回顾：2026-01-23 混淆事件', () => {
    // 用户提供：1769012250, 1769002640, 1750651225...（7个10位数字）
    // 我错误地用 FROM_UNIXTIME() 转换
    // 用户纠正："这些都是 bot id, bytebase art_task 查看下"

    const providedIds = [1769012250, 1769002640];

    // 错误查询（我的第一次尝试）
    const wrongQuery = () => {
      // SELECT * FROM user WHERE id IN (1769012250, 1769002640)
      return mockDB.users.filter(u => providedIds.includes(u.id));
    };

    // 正确查询（用户纠正后）
    const correctQuery = () => {
      // SELECT * FROM art_task WHERE bot_id IN (1769012250, 1769002640)
      return mockDB.art_tasks.filter(t => providedIds.includes(t.bot_id));
    };

    expect(wrongQuery().length).toBe(0);  // 错误方法查不到数据
    expect(correctQuery().length).toBeGreaterThan(0);  // 正确方法能查到

    // 经验教训：
    // 1. 10位数字 ≠ 一定是时间戳
    // 2. 看到 bot_id 范围的数字，应该联想到 bot 相关的表
    // 3. 用户提到表名时，优先使用该表
  });

  test('防御性编程：ID验证中间件', () => {
    // 创建一个验证中间件
    const createIdValidator = (config) => {
      return (id, expectedType) => {
        const rules = config[expectedType];
        if (!rules) {
          throw new Error(`Unknown ID type: ${expectedType}`);
        }

        if (id < rules.min || id > rules.max) {
          throw new Error(`${expectedType} out of range: ${id} (expected ${rules.min}-${rules.max})`);
        }

        if (rules.pattern && !rules.pattern.test(id.toString())) {
          throw new Error(`${expectedType} invalid format: ${id}`);
        }

        return true;
      };
    };

    const validator = createIdValidator({
      user_id: { min: 1, max: 48607088 },
      bot_id: { min: 1747227835, max: 1769012250 }
    });

    // 测试验证
    expect(validator(100, 'user_id')).toBe(true);
    expect(validator(1769012250, 'bot_id')).toBe(true);

    expect(() => validator(1769012250, 'user_id')).toThrow('out of range');
    expect(() => validator(100, 'bot_id')).toThrow('out of range');
  });
});
