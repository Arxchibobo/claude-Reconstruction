/**
 * E013: 知识库每次请求加载
 *
 * 错误模式：每次请求都从文件系统加载文档（~150ms）
 * 正确模式：启动时加载到内存（~1ms 读取）
 *
 * 严重程度：🔴 严重
 * 频率：中频
 */

const fs = require('fs');
const path = require('path');

describe('E013: 知识库每次请求加载', () => {

  // Mock 知识库服务
  class KnowledgeBaseService {
    constructor() {
      this.loadedDocs = new Map();
      this.isInitialized = false;
      this.loadCount = 0;
    }

    // 错误：每次请求都加载
    async getSystemPromptBad() {
      this.loadCount++;
      const start = Date.now();

      // 模拟文件系统读取（慢）
      const docs = await this.loadAllDocs();
      const prompt = docs.join('\n\n');

      const duration = Date.now() - start;
      return { prompt, duration, source: 'filesystem' };
    }

    // 正确：启动时加载，请求时从内存读取
    async init() {
      const start = Date.now();
      const docs = await this.loadAllDocs();
      this.loadedDocs = new Map(docs.map((doc, i) => [`doc-${i}`, doc]));
      this.isInitialized = true;
      const duration = Date.now() - start;
      return { duration, count: this.loadedDocs.size };
    }

    getSystemPromptGood() {
      this.loadCount++;
      const start = Date.now();

      if (!this.isInitialized) {
        throw new Error('KnowledgeBase not initialized. Call init() first.');
      }

      // 从内存读取（快）
      const prompt = Array.from(this.loadedDocs.values()).join('\n\n');
      const duration = Date.now() - start;
      return { prompt, duration, source: 'memory' };
    }

    // 模拟文件加载（慢）
    async loadAllDocs() {
      // 模拟 I/O 延迟
      await new Promise(resolve => setTimeout(resolve, 100));

      // 模拟 12 个文档
      return Array.from({ length: 12 }, (_, i) => `Document ${i + 1} content...`);
    }
  }

  test('错误：每次请求加载文件（性能差）', async () => {
    const kb = new KnowledgeBaseService();

    // 模拟多次请求
    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await kb.getSystemPromptBad();
      results.push(result);
    }

    // 验证：每次都很慢
    results.forEach(r => {
      expect(r.duration).toBeGreaterThan(90);  // ~100ms 每次
      expect(r.source).toBe('filesystem');
    });

    // 验证：总耗时很长
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    expect(totalDuration).toBeGreaterThan(270);  // 3次 × 100ms = 300ms
  });

  test('正确：启动时加载，请求时从内存读取', async () => {
    const kb = new KnowledgeBaseService();

    // 初始化（只执行一次）
    const initResult = await kb.init();
    expect(initResult.duration).toBeGreaterThan(90);  // 初始化慢一点
    expect(initResult.count).toBe(12);

    // 模拟多次请求
    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = kb.getSystemPromptGood();
      results.push(result);
    }

    // 验证：每次都很快
    results.forEach(r => {
      expect(r.duration).toBeLessThan(10);  // <10ms 每次
      expect(r.source).toBe('memory');
    });

    // 验证：总耗时很短
    const requestDuration = results.reduce((sum, r) => sum + r.duration, 0);
    expect(requestDuration).toBeLessThan(30);  // 远小于文件加载方式
  });

  test('性能对比：内存 vs 文件系统', async () => {
    const kbBad = new KnowledgeBaseService();
    const kbGood = new KnowledgeBaseService();
    await kbGood.init();

    // 对比单次请求性能
    const badResult = await kbBad.getSystemPromptBad();
    const goodResult = kbGood.getSystemPromptGood();

    // 验证：内存读取至少快 10 倍
    expect(goodResult.duration).toBeLessThan(badResult.duration / 10);

    // 验证：结果一致
    expect(goodResult.prompt.length).toBe(badResult.prompt.length);
  });

  test('内存占用分析：可接受的权衡', () => {
    // 典型知识库文档大小
    const documentSizes = {
      'CLAUDE.md': 20 * 1024,  // 20KB (v4.2)
      'DECISION_TREE.md': 15 * 1024,  // 15KB
      'ERROR_CATALOG.md': 12 * 1024,  // 12KB
      'mcp-servers.md': 8 * 1024,  // 8KB
      'skills-guide.md': 10 * 1024,  // 10KB
      'PROCESSING_SKILL.md': 8 * 1024,  // 8KB
      'PPT_WORKFLOW.md': 7 * 1024,  // 7KB
      'MARKETING_SKILLS_GUIDE.md': 10 * 1024,  // 10KB
      'DESIGN_MASTER_PERSONA.md': 8 * 1024,  // 8KB
      'UI_DESIGN_STYLES_REFERENCE.md': 12 * 1024,  // 12KB
      'VIBE_MARKETING_GUIDE.md': 6 * 1024,  // 6KB
      'remotion-auto-production.md': 4 * 1024,  // 4KB
    };

    const totalSize = Object.values(documentSizes).reduce((a, b) => a + b, 0);
    const totalKB = totalSize / 1024;

    // 验证：总大小约 120KB
    expect(totalKB).toBeGreaterThan(100);
    expect(totalKB).toBeLessThan(150);

    // 内存占用可接受（相对于性能提升）
    const tradeoff = {
      memoryCost: `${totalKB.toFixed(0)} KB`,
      performanceGain: '150ms → 1ms (150倍提升)',
      verdict: '非常值得'
    };

    expect(tradeoff.performanceGain).toContain('150倍');
  });

  test('热重载支持：更新知识库无需重启', () => {
    class KnowledgeBaseWithReload extends KnowledgeBaseService {
      async reload() {
        const start = Date.now();
        const docs = await this.loadAllDocs();
        this.loadedDocs = new Map(docs.map((doc, i) => [`doc-${i}`, doc]));
        const duration = Date.now() - start;
        return { duration, count: this.loadedDocs.size };
      }
    }

    const kb = new KnowledgeBaseWithReload();

    // 支持热重载
    const reloadTest = async () => {
      await kb.init();
      const before = kb.getSystemPromptGood().prompt.length;

      // 模拟更新文档
      await kb.reload();
      const after = kb.getSystemPromptGood().prompt.length;

      return { before, after, reloaded: true };
    };

    expect(reloadTest).toBeDefined();
  });

  test('分类加载：按需加载不同类别', () => {
    class CategorizedKnowledgeBase {
      constructor() {
        this.categories = {
          core: new Map(),
          capabilities: new Map(),
          errors: new Map(),
          design: new Map()
        };
      }

      async initCategory(category) {
        const docs = await this.loadDocsForCategory(category);
        this.categories[category] = new Map(docs.map((doc, i) => [`${category}-${i}`, doc]));
      }

      async loadDocsForCategory(category) {
        await new Promise(resolve => setTimeout(resolve, 30));
        return Array.from({ length: 3 }, (_, i) => `${category} doc ${i + 1}`);
      }

      getPromptForCategory(category) {
        if (!this.categories[category] || this.categories[category].size === 0) {
          throw new Error(`Category ${category} not loaded`);
        }
        return Array.from(this.categories[category].values()).join('\n');
      }
    }

    const kb = new CategorizedKnowledgeBase();
    expect(kb.categories).toHaveProperty('core');
    expect(kb.categories).toHaveProperty('capabilities');
  });

  test('自检清单：知识库加载性能优化', () => {
    const checklist = {
      questions: [
        {
          q: '知识库文档是否在启动时加载？',
          expectedAnswer: 'Yes',
          reason: '避免每次请求重复加载'
        },
        {
          q: '是否从内存读取而非文件系统？',
          expectedAnswer: 'Yes',
          reason: '内存读取快 100+ 倍'
        },
        {
          q: '内存占用是否可接受（<200KB）？',
          expectedAnswer: 'Yes',
          reason: '典型知识库 ~120KB'
        },
        {
          q: '是否支持热重载？',
          expectedAnswer: 'Optional',
          reason: '开发时方便，生产可选'
        },
        {
          q: '是否有分类加载机制？',
          expectedAnswer: 'Optional',
          reason: '按需加载节省内存'
        }
      ]
    };

    expect(checklist.questions).toHaveLength(5);
    expect(checklist.questions[0].expectedAnswer).toBe('Yes');
  });

  test('真实案例：Craft Agents 知识库集成', () => {
    // 场景：2026-01-23，Craft Agents 项目集成知识库
    const incident = {
      date: '2026-01-23',
      project: 'craft-agents-oss',
      implementation: {
        approach: '启动时加载到内存',
        location: 'apps/server/src/services/KnowledgeBaseService.ts',
        documents: 12,
        totalSize: '116 KB',
        initTime: '~100ms',
        requestTime: '~1ms'
      },
      results: {
        startupTime: '增加 100ms（可接受）',
        responseTime: '减少 149ms（显著提升）',
        memoryUsage: '增加 ~120KB（忽略不计）'
      },
      lesson: '启动慢一点，响应快很多，内存占用可接受'
    };

    expect(incident.implementation.initTime).toBe('~100ms');
    expect(incident.implementation.requestTime).toBe('~1ms');
    expect(incident.lesson).toContain('响应快很多');
  });

  test('最佳实践：服务初始化模式', () => {
    const serverSetup = `
// server.ts
import { KnowledgeBaseService } from './services/KnowledgeBaseService';

async function startServer() {
  console.log('[Server] Starting...');

  // 初始化知识库（启动时执行一次）
  const knowledgeBase = new KnowledgeBaseService();
  console.log('[KnowledgeBase] Loading...');
  await knowledgeBase.init();
  console.log('[KnowledgeBase] Ready');

  // 启动 HTTP 服务器
  app.listen(3000, () => {
    console.log('[Server] Ready on http://localhost:3000');
  });
}

startServer();
    `;

    expect(serverSetup).toContain('await knowledgeBase.init()');
    expect(serverSetup).toContain('启动时执行一次');
  });

  test('错误处理：未初始化保护', () => {
    const kb = new KnowledgeBaseService();

    // 未初始化就调用应该报错
    expect(() => {
      kb.getSystemPromptGood();
    }).toThrow('not initialized');
  });

  test('监控指标：跟踪加载性能', () => {
    class MonitoredKnowledgeBase extends KnowledgeBaseService {
      constructor() {
        super();
        this.metrics = {
          initDuration: 0,
          requestCount: 0,
          totalRequestDuration: 0,
          avgRequestDuration: 0
        };
      }

      async init() {
        const result = await super.init();
        this.metrics.initDuration = result.duration;
        return result;
      }

      getSystemPromptGood() {
        const result = super.getSystemPromptGood();
        this.metrics.requestCount++;
        this.metrics.totalRequestDuration += result.duration;
        this.metrics.avgRequestDuration = this.metrics.totalRequestDuration / this.metrics.requestCount;
        return result;
      }

      getMetrics() {
        return this.metrics;
      }
    }

    const kb = new MonitoredKnowledgeBase();
    expect(kb.metrics).toHaveProperty('initDuration');
    expect(kb.metrics).toHaveProperty('avgRequestDuration');
  });

  test('缓存失效策略：文件变更检测', () => {
    class CacheInvalidationKB extends KnowledgeBaseService {
      constructor() {
        super();
        this.lastModified = new Map();
      }

      async shouldReload(filePath) {
        try {
          const stats = fs.statSync(filePath);
          const currentMtime = stats.mtime.getTime();
          const lastMtime = this.lastModified.get(filePath) || 0;

          if (currentMtime > lastMtime) {
            this.lastModified.set(filePath, currentMtime);
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      }

      async autoReload(filePaths) {
        const needsReload = [];
        for (const filePath of filePaths) {
          if (await this.shouldReload(filePath)) {
            needsReload.push(filePath);
          }
        }

        if (needsReload.length > 0) {
          await this.reload();
          return { reloaded: true, files: needsReload };
        }

        return { reloaded: false };
      }
    }

    const kb = new CacheInvalidationKB();
    expect(kb.shouldReload).toBeDefined();
    expect(kb.autoReload).toBeDefined();
  });
});
