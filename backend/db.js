import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { FOODS, INVITE_CODES } from './foods.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });

// 云端部署时通过环境变量指定 Turso 数据库；本地开发无该变量则回退到本地文件库
const url = process.env.TURSO_DATABASE_URL || `file:${join(dataDir, 'food.db')}`;
const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// libSQL 的 execute 一次只执行一条语句，故把 DDL 拆开逐条建表
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    is_permanent INTEGER NOT NULL DEFAULT 0,
    free_uses_remaining INTEGER NOT NULL DEFAULT 5,
    daily_uses_used INTEGER NOT NULL DEFAULT 0,
    last_use_date TEXT NOT NULL DEFAULT '',
    unlocked INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'none',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    used_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    food_id INTEGER,
    food_name TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

// 首次启动时灌入种子数据（菜品池 + 邀请码），已有数据则跳过
async function init() {
  await client.batch(SCHEMA.map((sql) => ({ sql })), 'write');

  const foodCount = (await client.execute('SELECT COUNT(*) AS c FROM foods')).rows[0].c;
  if (foodCount === 0) {
    const stmts = FOODS.map((f) => ({
      sql: 'INSERT INTO foods (name, category) VALUES (?, ?)',
      args: [f.name, f.category],
    }));
    await client.batch(stmts, 'write');
  }

  const inviteCount = (await client.execute('SELECT COUNT(*) AS c FROM invites')).rows[0].c;
  if (inviteCount === 0) {
    const stmts = INVITE_CODES.map((code) => ({
      sql: 'INSERT INTO invites (code) VALUES (?)',
      args: [code],
    }));
    await client.batch(stmts, 'write');
  }
}

// 异步门面：对外保持 get/all/run 语义，内部用 libSQL 客户端
const db = {
  async get(sql, ...args) {
    const rs = await client.execute({ sql, args });
    return rs.rows[0];
  },
  async all(sql, ...args) {
    const rs = await client.execute({ sql, args });
    return rs.rows;
  },
  async run(sql, ...args) {
    return client.execute({ sql, args });
  },
  init,
};

export default db;
