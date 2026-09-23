import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './db.js';
import {
  TIME_SLOTS,
  FREE_TRIAL_USES,
  PERMANENT_DAILY_USES,
} from './foods.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
// 管理员验证码从环境变量读取，不入库、不进代码仓库
const ADMIN_CODE = process.env.ADMIN_CODE || '';

// 异步 handler 包装器：Express 4 不会自动捕获 Promise 拒绝，这里统一兜底
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- 工具函数 ----------

async function getUser(phone) {
  return db.get('SELECT * FROM users WHERE phone = ?', phone);
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 服务器本地时间（Render 上 TZ=Asia/Shanghai 即北京时间），用于历史记录时间戳
function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 跨天时重置永久用户的每日次数
async function resetDailyIfNeeded(user) {
  const today = todayStr();
  if (user.last_use_date !== today) {
    await db.run('UPDATE users SET daily_uses_used = 0, last_use_date = ? WHERE id = ?', today, user.id);
    user.daily_uses_used = 0;
    user.last_use_date = today;
  }
  return user;
}

function getCurrentSlot() {
  const now = new Date();
  const t = now.getHours() * 60 + now.getMinutes();
  for (const [key, slot] of Object.entries(TIME_SLOTS)) {
    if (t >= slot.startMin && t < slot.endMin) return { key, ...slot };
  }
  return null;
}

// 返回给前端的用户信息
function userSummary(u) {
  return {
    phone: u.phone,
    is_permanent: !!u.is_permanent,
    unlocked: !!u.unlocked,
    free_uses_remaining: u.free_uses_remaining,
    daily_uses_used: u.daily_uses_used,
    daily_remaining: u.is_permanent ? Math.max(0, PERMANENT_DAILY_USES - u.daily_uses_used) : 0,
    payment_status: u.payment_status,
    blocked: !u.unlocked && u.free_uses_remaining <= 0,
  };
}

// ---------- 用户 ----------

// 首次填手机号注册（已存在则直接返回，手机号即唯一账号）
app.post('/api/register', h(async (req, res) => {
  const { phone } = req.body || {};
  if (!phone || !/^1\d{10}$/.test(String(phone).trim())) {
    return res.status(400).json({ error: '请输入正确的11位手机号' });
  }
  const p = String(phone).trim();
  let user = await getUser(p);
  if (!user) {
    await db.run('INSERT INTO users (phone) VALUES (?)', p);
    user = await getUser(p);
  }
  res.json(userSummary(await resetDailyIfNeeded(user)));
}));

// 查询用户状态
app.get('/api/user/:phone', h(async (req, res) => {
  const user = await getUser(req.params.phone);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(userSummary(await resetDailyIfNeeded(user)));
}));

// ---------- 随机抽取（核心） ----------

app.post('/api/random', h(async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: '缺少手机号' });

  const user = await getUser(phone);
  if (!user) return res.status(404).json({ error: '用户不存在，请先注册' });

  // 时段校验
  const slot = getCurrentSlot();
  if (!slot) {
    return res.status(400).json({
      error: '当前不在用餐时段，请在 早餐05:00-10:00 / 午餐11:00-13:30 / 晚餐18:00-20:00 内使用',
      code: 'OFF_SLOT',
    });
  }

  const today = todayStr();
  const isPermanent = user.unlocked || user.is_permanent;

  // 次数校验
  if (isPermanent) {
    if (user.last_use_date !== today) {
      await db.run('UPDATE users SET daily_uses_used = 0, last_use_date = ? WHERE id = ?', today, user.id);
      user.daily_uses_used = 0;
    }
    if (user.daily_uses_used >= PERMANENT_DAILY_USES) {
      return res.status(400).json({ error: '今日次数已用完（永久用户每天3次）', code: 'DAILY_LIMIT' });
    }
  } else {
    if (user.free_uses_remaining <= 0) {
      return res.status(400).json({ error: '免费次数已用完', code: 'NO_FREE', blocked: true });
    }
  }

  // 从当前时段对应分类中随机抽取
  const foods = await db.all('SELECT * FROM foods WHERE category = ?', slot.key);
  if (foods.length === 0) {
    return res.status(400).json({ error: `${slot.label}菜品库为空，请联系管理员补充`, code: 'EMPTY_POOL' });
  }
  const food = foods[Math.floor(Math.random() * foods.length)];

  // 扣减次数
  if (isPermanent) {
    await db.run('UPDATE users SET daily_uses_used = daily_uses_used + 1, last_use_date = ? WHERE id = ?', today, user.id);
  } else {
    await db.run('UPDATE users SET free_uses_remaining = free_uses_remaining - 1 WHERE id = ?', user.id);
  }

  // 记录历史（需求第6条：持久化存储）
  await db.run('INSERT INTO usage_logs (phone, food_id, food_name, category, created_at) VALUES (?, ?, ?, ?, ?)',
    phone, food.id, food.name, food.category, nowStr());

  const updated = await getUser(phone);
  res.json({
    food: food.name,
    category: slot.key,
    categoryLabel: slot.label,
    ...userSummary(updated),
  });
}));

// 抽取历史
app.get('/api/history/:phone', h(async (req, res) => {
  const logs = await db.all('SELECT * FROM usage_logs WHERE phone = ? ORDER BY id DESC LIMIT 50', req.params.phone);
  res.json(logs);
}));

// 当前时段
app.get('/api/timeslot', (req, res) => {
  const slot = getCurrentSlot();
  res.json(slot ? { key: slot.key, label: slot.label, start: slot.start, end: slot.end } : null);
});

// ---------- 支付（模拟流程） ----------

// 用户点击【已支付】→ 提交待审核
app.post('/api/pay', h(async (req, res) => {
  const { phone } = req.body || {};
  const user = await getUser(phone);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  await db.run("UPDATE users SET payment_status = 'pending' WHERE phone = ?", phone);
  res.json({ ok: true, payment_status: 'pending' });
}));

// ---------- 邀请码兑换 ----------

app.post('/api/invite/redeem', h(async (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: '缺少参数' });

  const user = await getUser(phone);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const c = String(code).trim().toUpperCase();
  const invite = await db.get('SELECT * FROM invites WHERE code = ?', c);
  if (!invite) return res.status(400).json({ error: '邀请码无效' });
  if (invite.used) return res.status(400).json({ error: '邀请码已被使用' });

  await db.run('UPDATE invites SET used = 1, used_by = ? WHERE id = ?', phone, invite.id);
  await db.run("UPDATE users SET unlocked = 1, is_permanent = 1, payment_status = 'approved', free_uses_remaining = 0 WHERE phone = ?", phone);

  res.json({ ok: true });
}));

// ---------- 管理员 ----------

// 管理员验证码登录
app.post('/api/admin/login', (req, res) => {
  const { code } = req.body || {};
  if (!ADMIN_CODE) return res.status(500).json({ error: '管理员验证码未配置，请在环境变量 ADMIN_CODE 中设置' });
  if (code === ADMIN_CODE) return res.json({ ok: true });
  return res.status(401).json({ error: '管理员验证码错误' });
});

// 用户列表
app.get('/api/admin/users', h(async (req, res) => {
  const users = await db.all(`
    SELECT id, phone, is_permanent, unlocked, free_uses_remaining,
           daily_uses_used, last_use_date, payment_status, created_at
    FROM users ORDER BY id DESC
  `);
  res.json(users);
}));

// 批准账号（解除拦截，成为永久用户）
app.post('/api/admin/approve', h(async (req, res) => {
  const { phone } = req.body || {};
  const user = await getUser(phone);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  await db.run("UPDATE users SET payment_status = 'approved', unlocked = 1, is_permanent = 1, free_uses_remaining = 0 WHERE phone = ?", phone);
  res.json({ ok: true });
}));

// 拒绝批准（保留拦截）
app.post('/api/admin/reject', h(async (req, res) => {
  const { phone } = req.body || {};
  const user = await getUser(phone);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  await db.run("UPDATE users SET payment_status = 'rejected' WHERE phone = ?", phone);
  res.json({ ok: true });
}));

// 邀请码列表 / 新增 / 删除
app.get('/api/admin/invites', h(async (req, res) => {
  res.json(await db.all('SELECT * FROM invites ORDER BY id'));
}));

app.post('/api/admin/invites', h(async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: '缺少邀请码' });
  const c = String(code).trim().toUpperCase();
  try {
    await db.run('INSERT INTO invites (code) VALUES (?)', c);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: '邀请码已存在' });
  }
}));

app.delete('/api/admin/invites/:id', h(async (req, res) => {
  await db.run('DELETE FROM invites WHERE id = ?', req.params.id);
  res.json({ ok: true });
}));

// 菜品列表 / 新增 / 删除
app.get('/api/admin/foods', h(async (req, res) => {
  res.json(await db.all('SELECT * FROM foods ORDER BY category, id'));
}));

app.post('/api/admin/foods', h(async (req, res) => {
  const { name, category } = req.body || {};
  if (!name || !category) return res.status(400).json({ error: '缺少参数' });
  await db.run('INSERT INTO foods (name, category) VALUES (?, ?)', String(name).trim(), category);
  res.json({ ok: true });
}));

app.delete('/api/admin/foods/:id', h(async (req, res) => {
  await db.run('DELETE FROM foods WHERE id = ?', req.params.id);
  res.json({ ok: true });
}));

app.get('/', (req, res) => {
  res.json({ name: '湖南农业大学美食随机选择器', status: 'ok' });
});

// 统一错误兜底
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 初始化数据库后启动
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ 后端服务已启动：http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('数据库初始化失败：', err);
    process.exit(1);
  });
