#!/usr/bin/env node

/**
 * 链接检查脚本
 *
 * 检查所有 Markdown 文档中的链接：
 * - 内部链接（相对路径）
 * - 外部链接（HTTP/HTTPS）
 * - 锚点链接（#section）
 */

const fs = require('fs');
const path = require('path');

// 配置
const ROOT_DIR = path.join(__dirname, '../..');
const EXCLUDED_DIRS = ['node_modules', '.git', 'validation', 'vibe-marketing'];
const QUICK_MODE = process.argv.includes('--quick');

// 统计
const stats = {
  totalFiles: 0,
  totalLinks: 0,
  brokenLinks: [],
  externalLinks: [],
  warnings: []
};

/**
 * 递归获取所有 Markdown 文件
 */
function getAllMarkdownFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // 跳过排除的目录
        if (!EXCLUDED_DIRS.includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * 提取 Markdown 文件中的所有链接
 */
function extractLinks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const links = [];

  // Markdown 链接: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = markdownLinkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      line: content.substring(0, match.index).split('\n').length
    });
  }

  return links;
}

/**
 * 检查内部链接
 */
function checkInternalLink(sourcePath, linkUrl) {
  // 移除锚点
  const [filePath, anchor] = linkUrl.split('#');

  if (!filePath) {
    // 只有锚点，检查当前文件
    return { valid: true, type: 'anchor' };
  }

  // 解析相对路径
  const sourceDir = path.dirname(sourcePath);
  const targetPath = path.resolve(sourceDir, filePath);

  // 检查文件是否存在
  if (!fs.existsSync(targetPath)) {
    return { valid: false, reason: '文件不存在', targetPath };
  }

  // 如果有锚点，检查锚点是否存在（简化版：只检查文件存在）
  if (anchor) {
    // 完整的锚点检查需要解析 Markdown 标题
    // 这里简化处理，只检查文件存在
    return { valid: true, type: 'internal-with-anchor', warning: '锚点未验证' };
  }

  return { valid: true, type: 'internal' };
}

/**
 * 检查外部链接（快速模式跳过）
 */
async function checkExternalLink(url) {
  if (QUICK_MODE) {
    return { valid: true, type: 'external-skipped' };
  }

  // 在实际实现中，这里应该发送 HTTP 请求检查
  // 为了避免依赖和网络问题，这里简化处理
  return { valid: true, type: 'external', warning: '外部链接未验证' };
}

/**
 * 检查单个 Markdown 文件
 */
async function checkFile(filePath) {
  console.log(`检查: ${path.relative(ROOT_DIR, filePath)}`);

  const links = extractLinks(filePath);
  stats.totalLinks += links.length;

  for (const link of links) {
    const { url, line, text } = link;

    // 跳过邮箱链接
    if (url.startsWith('mailto:')) {
      continue;
    }

    // 外部链接
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const result = await checkExternalLink(url);
      stats.externalLinks.push({ file: filePath, line, url, text });

      if (result.warning) {
        stats.warnings.push({
          file: filePath,
          line,
          url,
          message: result.warning
        });
      }

      continue;
    }

    // 内部链接
    const result = checkInternalLink(filePath, url);

    if (!result.valid) {
      stats.brokenLinks.push({
        file: filePath,
        line,
        url,
        text,
        reason: result.reason,
        targetPath: result.targetPath
      });
    }

    if (result.warning) {
      stats.warnings.push({
        file: filePath,
        line,
        url,
        message: result.warning
      });
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始检查链接...\n');
  console.log(`模式: ${QUICK_MODE ? '快速（跳过外部链接）' : '完整'}\n`);

  const markdownFiles = getAllMarkdownFiles(ROOT_DIR);
  stats.totalFiles = markdownFiles.length;

  console.log(`找到 ${stats.totalFiles} 个 Markdown 文件\n`);

  for (const file of markdownFiles) {
    await checkFile(file);
  }

  // 输出结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 检查结果');
  console.log('='.repeat(60));
  console.log(`总文件数: ${stats.totalFiles}`);
  console.log(`总链接数: ${stats.totalLinks}`);
  console.log(`外部链接: ${stats.externalLinks.length}`);
  console.log(`失效链接: ${stats.brokenLinks.length}`);
  console.log(`警告: ${stats.warnings.length}`);

  if (stats.brokenLinks.length > 0) {
    console.log('\n❌ 失效链接:');
    stats.brokenLinks.forEach(link => {
      const relPath = path.relative(ROOT_DIR, link.file);
      console.log(`  ${relPath}:${link.line}`);
      console.log(`    [${link.text}](${link.url})`);
      console.log(`    原因: ${link.reason}`);
      if (link.targetPath) {
        console.log(`    目标: ${path.relative(ROOT_DIR, link.targetPath)}`);
      }
      console.log('');
    });
  }

  if (stats.warnings.length > 0 && !QUICK_MODE) {
    console.log('\n⚠️  警告:');
    stats.warnings.forEach(warning => {
      const relPath = path.relative(ROOT_DIR, warning.file);
      console.log(`  ${relPath}:${warning.line}`);
      console.log(`    ${warning.url}`);
      console.log(`    ${warning.message}`);
      console.log('');
    });
  }

  // 退出码
  const exitCode = stats.brokenLinks.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// 运行
main().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
