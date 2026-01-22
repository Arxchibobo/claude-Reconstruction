/**
 * Active Email Domains - 活跃邮箱域名分析
 *
 * 查询最近一周内有用户登录的邮箱域名，排除白名单和临时邮箱，
 * 用于识别新的正常邮箱域名，建议加入白名单。
 */

import { executeSQL } from "./mcp/client.js";

// 临时邮箱域名列表 (56个)
const TEMP_EMAIL_DOMAINS = [
  "protectsmail.net",
  "roratu.com",
  "mucate.com",
  "mekuron.com",
  "airsworld.net",
  "arugy.com",
  "forexzig.com",
  "fxzig.com",
  "denipl.com",
  "denipl.net",
  "nctime.com",
  "fftube.com",
  "correostemporales.org",
  "yopmail.com",
  "rosuper.com",
  "ssgperf.com",
  "m3player.com",
  "guerrillamail.com",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.de",
  "trbvm.com",
  "mailinator.com",
  "10minutemail.com",
  "temp-mail.org",
  "throwaway.email",
  "getnada.com",
  "maildrop.cc",
  "trashmail.com",
  "tempmailaddress.com",
  "fakeinbox.com",
  "mytemp.email",
  "tempmail.com",
  "emailondeck.com",
  "sharklasers.com",
  "discard.email",
  "discardmail.com",
  "mintemail.com",
  "mailnesia.com",
  "mohmal.com",
  "crazymailing.com",
  "mailcatch.com",
  "mailnator.com",
  "tempr.email",
  "tempinbox.com",
  "spamgourmet.com",
  "mailexpire.com",
  "dispostable.com",
  "filzmail.com",
  "getairmail.com",
  "harakirimail.com",
  "anonymbox.com",
];

export interface ActiveDomain {
  domain: string;
  activeUsers: number;
}

export interface ActiveEmailDomainsData {
  /** 建议加入白名单的域名列表 */
  suggestedDomains: ActiveDomain[];
  /** 当前白名单域名数量 */
  whitelistCount: number;
  /** 查询天数 */
  days: number;
}

/**
 * 获取当前白名单
 * 返回的是 JSON 数组格式，如 ["gmail.com", "outlook.com", ...]
 */
async function getWhitelist(): Promise<string[]> {
  const rows = await executeSQL<{ value: string }>(
    `SELECT value FROM my_shell_prod.app_setting WHERE name = 'art_trial_email_whitelist'`
  );

  if (rows.length === 0 || !rows[0].value) {
    return [];
  }

  try {
    const parsed = JSON.parse(rows[0].value) as string[];
    return parsed.map((d) => d.trim().toLowerCase());
  } catch {
    console.error("[getWhitelist] Failed to parse JSON, value:", rows[0].value);
    return [];
  }
}

/**
 * 查询活跃邮箱域名
 * 优化：
 * 1. 避免 CTE 物化，使用派生表
 * 2. 所有过滤下推到 SQL 层 (HAVING + NOT IN)
 * 3. 减少 COALESCE/NULLIF 重复计算
 */
async function getActiveDomains(
  days: number,
  minUsers: number,
  excludeDomains: string[]
): Promise<ActiveDomain[]> {
  // 构建排除域名列表 (白名单 + 临时邮箱)
  const excludeList = excludeDomains.map((d) => `'${d}'`).join(",");

  const rows = await executeSQL<{ domain: string; active_users: number }>(
    `SELECT
      domain,
      COUNT(DISTINCT user_id) as active_users
    FROM (
      SELECT
        u.id as user_id,
        LOWER(SUBSTRING_INDEX(
          COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')),
          '@', -1
        )) as domain
      FROM my_shell_prod.user u
      INNER JOIN my_shell_prod.user_privy up ON u.id = up.user_id
      WHERE
        u.lastLoginTime >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        AND (up.email != '' OR up.google_email != '' OR up.apple_email != '')
    ) t
    WHERE domain IS NOT NULL
      AND domain != ''
      ${excludeList ? `AND domain NOT IN (${excludeList})` : ""}
    GROUP BY domain
    HAVING active_users >= ${minUsers}
    ORDER BY active_users DESC
    LIMIT 500`
  );

  return rows.map((row) => ({
    domain: row.domain,
    activeUsers: row.active_users,
  }));
}

/**
 * 获取建议加入白名单的邮箱域名
 *
 * @param days 查询最近 N 天的活跃用户 (默认 7)
 * @param minUsers 最小活跃用户数阈值 (默认 3)
 */
export async function getActiveEmailDomains(
  days = 7,
  minUsers = 3
): Promise<ActiveEmailDomainsData> {
  // 1. 获取白名单
  const whitelist = await getWhitelist();

  // 2. 合并排除列表 (白名单 + 临时邮箱)，在 SQL 层直接过滤
  const excludeDomains = [...whitelist, ...TEMP_EMAIL_DOMAINS];

  // 3. 获取活跃域名 (已在 SQL 层过滤)
  const suggestedDomains = await getActiveDomains(days, minUsers, excludeDomains);

  return {
    suggestedDomains,
    whitelistCount: whitelist.length,
    days,
  };
}
