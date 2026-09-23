# 芷兰版 · 湖南农业大学美食随机选择器

一款帮助「选择困难症」同学随机决定今天吃什么的手机版网页小工具。
前端 React + Vite，后端 Node.js + Express，数据库 SQLite（零原生依赖，开箱即用）。

---

## 目录结构

```
code/
├── backend/          # 后端服务（Express + SQLite）
│   ├── server.js     # 接口与业务逻辑
│   ├── db.js         # 数据库连接、建表、种子数据
│   ├── foods.js      # 菜品池 / 邀请码 / 管理员验证码 / 时段配置
│   └── data/         # SQLite 数据库文件（首次启动自动生成，持久化）
├── frontend/         # 前端（React + Vite，手机版优先）
│   ├── src/pages/    # 封面 / 主页 / 拦截 / 支付 / 邀请码 / 管理员
│   └── public/       # 付款二维码等静态资源
├── assets/           # 需求文档、付款二维码原件
└── README.md
```

## 快速开始（本地一键运行）

需要 Node.js ≥ 20（推荐 22+）。终端执行：

```bash
# 1. 启动后端（端口 3001）
cd backend
npm install
cp .env.example .env   # 首次：配置管理员验证码 ADMIN_CODE（可选，不配则后台无法登录）
npm start

# 2. 另开一个终端，启动前端（端口 5173）
cd frontend
npm install
npm run dev
```

浏览器打开 **http://localhost:5173** 即可（手机可访问同一局域网 IP:5173 模拟手机端）。

> 后端使用了 Node 内置的 `node:sqlite`，除 `express` / `cors` 外无原生编译依赖，`npm install` 秒装。

## 核心流程

1. **封面页** → 点「下一步」
2. **主页**：首次填写 11 位手机号注册（手机号即唯一账号）→ 点击按钮随机抽菜（滚动动画 3 秒后定格）
3. **次数限制**：
   - 新用户：免费 **5 次**（用完后跳转拦截页）
   - 永久用户：每天 **3 次**
4. **时段限制**（自动按当前时间推荐对应分类）：
   - 早餐 `05:00–10:00` / 午餐 `11:00–13:30` / 晚餐 `18:00–20:00`
5. **解锁方式**（拦截页二选一）：
   - 支付 0.99 元（模拟流程：扫码 → 点「已支付」→ 管理员后台批准）
   - 邀请码兑换（一次性使用）
6. **管理员后台**：用户管理 / 邀请码管理 / 食物库管理
7. **持久化**：数据库落盘 `backend/data/food.db`，退出后历史记录保留

## 关键配置（见 `backend/foods.js` 与 `backend/.env`）

| 项目 | 值 |
|---|---|
| 管理员验证码 | 环境变量 `ADMIN_CODE`（本地：复制 `backend/.env.example` 为 `backend/.env` 后填写；部署：Render 面板填写） |
| 新用户免费次数 | 5 |
| 永久用户每日次数 | 3 |
| 初始邀请码 | 见下表（可后台增删） |

初始邀请码（一次性）：`7S9K2P5G`、`3D8F6N4J`、`2R7T5M9C`、`6H4V8B2X`、`9Q5L3Z7E`、`4W6Y2U8N`、`5C7B9V3R`、`8M2P6S4D`、`2F9G5H7K`、`7N3J8T5W`

## 数据库表

- `users` —— 用户（手机号、是否永久、剩余次数、支付状态）
- `foods` —— 菜品池（名称 + 早餐/午餐/晚餐分类）
- `invites` —— 邀请码（是否已用、被谁用）
- `usage_logs` —— 抽取历史记录

## 重置数据

删除 `backend/data/food.db` 后重新 `npm start`，会自动重建并重新灌入初始菜品与邀请码。

---

## 上线部署（公网可访问，手机无需同一局域网）

后端数据库已从本地 SQLite 迁移到 **Turso（云端 SQLite）**，因此整套应用可上云。部署架构：

```
手机 ──> GitHub Pages(前端静态) ──> Render(Express 后端) ──> Turso(云端数据库)
```

> 本地开发完全不受影响：未配置 `TURSO_DATABASE_URL` 时后端自动回退到本地文件库 `backend/data/food.db`。

### 前置：准备 3 个免费账号

1. **GitHub**（已有即可）：一个公开仓库。
2. **Turso**（[turso.tech](https://turso.tech)，GitHub 一键登录）：建一个数据库。
3. **Render**（[render.com](https://render.com)，GitHub 一键登录）：部署后端。

### 步骤一：推代码到 GitHub

```bash
cd ~/Desktop/code
git init
git add .
git commit -m "上线部署：Turso + Render + GitHub Pages"
# 在 GitHub 网页新建同名空仓库后：
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

### 步骤二：创建 Turso 数据库，拿到连接信息

```bash
# 安装 Turso CLI（也可用网页版创建）
brew install tursodatabase/tap/turso
turso auth login          # 用 GitHub 登录
turso db create food-selector
turso db tokens create food-selector   # 拿到 auth token（只显示一次）
```

记录两个值，稍后填入 Render：

- `TURSO_DATABASE_URL`：形如 `libsql://food-selector-<xxx>.turso.io`
- `TURSO_AUTH_TOKEN`：上一步生成的 token

### 步骤三：Render 部署后端

1. Render 控制台 → **New + → Blueprint** → 关联刚推送的 GitHub 仓库。
2. Render 会自动读取仓库根目录的 `render.yaml`，创建 `food-selector-backend` 服务。
3. 在服务 **Environment** 中填入 `ADMIN_CODE`（管理员后台验证码）、`TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`。
4. 等待部署完成，记下后端地址：`https://food-selector-backend.onrender.com`。
   （首次访问免费实例会休眠约 30–50 秒才唤醒，属正常现象。）

### 步骤四：GitHub Pages 部署前端

1. 仓库 **Settings → Secrets and variables → Actions → Variables**，新增：
   - 名称 `VITE_API_BASE`，值 `https://food-selector-backend.onrender.com/api`
2. **Settings → Pages**：Source 选择 **GitHub Actions**。
3. 进入 **Actions** 标签，手动运行一次 `Deploy frontend to GitHub Pages`（或再 push 一次）。
4. 完成后即可访问：`https://<你的用户名>.github.io/<仓库名>/`。

### 注意事项

- 后端时区已通过 `render.yaml` 的 `TZ=Asia/Shanghai` 固定为北京时间，时段判断与每日重置正确。
- 前端跨域调用后端：后端 `cors()` 已放开所有来源，无需额外配置。
- 免费额度限制：Render 免费实例 15 分钟无访问会休眠；Turso 免费额度足够个人/同学间使用。

