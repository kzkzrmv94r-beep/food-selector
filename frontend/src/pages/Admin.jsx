import { useState, useEffect } from 'react';
import { api } from '../api.js';

const CAT = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
const PAY_LABEL = { none: '未支付', pending: '待审核', approved: '已批准', rejected: '已拒绝' };

export default function Admin({ navigate }) {
  const [authed, setAuthed] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [foods, setFoods] = useState([]);

  const [newInvite, setNewInvite] = useState('');
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodCat, setNewFoodCat] = useState('lunch');
  const [notice, setNotice] = useState('');

  const loadAll = async () => {
    const [u, i, f] = await Promise.all([api.adminUsers(), api.adminInvites(), api.adminFoods()]);
    setUsers(u);
    setInvites(i);
    setFoods(f);
  };

  useEffect(() => {
    if (authed) loadAll();
  }, [authed]);

  const login = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await api.adminLogin(codeInput.trim());
      setAuthed(true);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 2000);
  };

  // ---------- 登录 ----------
  if (!authed) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>管理员入口</h1>
        </header>
        <div className="card center-card">
          <h2>🔐 管理员验证</h2>
          <p className="muted">请输入管理员验证码</p>
          <form onSubmit={login}>
            <input
              className="input"
              type="password"
              placeholder="管理员验证码"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              autoFocus
            />
            {loginError && <p className="error-text">{loginError}</p>}
            <button className="btn btn-primary btn-lg btn-block">登录</button>
          </form>
        </div>
        <button className="btn-ghost center" onClick={() => navigate('cover')}>
          ← 返回首页
        </button>
      </div>
    );
  }

  // ---------- 后台 ----------
  const groupedFoods = foods.reduce((acc, f) => {
    (acc[f.category] ||= []).push(f);
    return acc;
  }, {});

  const addInvite = async () => {
    if (!newInvite.trim()) return flash('请输入邀请码');
    try {
      await api.adminAddInvite(newInvite.trim());
      setNewInvite('');
      loadAll();
      flash('已添加');
    } catch (e) {
      flash(e.message);
    }
  };

  const addFood = async () => {
    if (!newFoodName.trim()) return flash('请输入菜名');
    try {
      await api.adminAddFood(newFoodName.trim(), newFoodCat);
      setNewFoodName('');
      loadAll();
      flash('已添加');
    } catch (e) {
      flash(e.message);
    }
  };

  return (
    <div className="page admin-page">
      <header className="page-header">
        <div className="header-row">
          <h1>管理员后台</h1>
          <button className="btn-ghost" onClick={() => navigate('home')}>
            关闭
          </button>
        </div>
      </header>

      {notice && <div className="toast">{notice}</div>}

      <div className="tabs">
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          用户管理
        </button>
        <button className={`tab ${tab === 'invites' ? 'active' : ''}`} onClick={() => setTab('invites')}>
          邀请码
        </button>
        <button className={`tab ${tab === 'foods' ? 'active' : ''}`} onClick={() => setTab('foods')}>
          食物库
        </button>
      </div>

      {tab === 'users' && (
        <div className="card">
          <h3>用户列表（{users.length}）</h3>
          {users.length === 0 && <p className="muted">暂无用户</p>}
          <ul className="admin-list">
            {users.map((u) => (
              <li key={u.id} className="admin-item">
                <div className="admin-item-main">
                  <div className="admin-item-title">{u.phone}</div>
                  <div className="admin-item-sub">
                    {u.is_permanent ? '永久用户' : '新用户'} · {PAY_LABEL[u.payment_status] || u.payment_status}
                    {u.is_permanent ? ` · 今日${u.daily_uses_used}/3` : ` · 免费剩${u.free_uses_remaining}`}
                  </div>
                </div>
                {u.payment_status === 'pending' ? (
                  <div className="admin-item-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={async () => {
                        await api.adminApprove(u.phone);
                        loadAll();
                      }}
                    >
                      批准
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={async () => {
                        await api.adminReject(u.phone);
                        loadAll();
                      }}
                    >
                      拒绝
                    </button>
                  </div>
                ) : (
                  <span className="badge">{u.unlocked ? '已解锁' : '未解锁'}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'invites' && (
        <div className="card">
          <h3>邀请码管理</h3>
          <div className="inline-form">
            <input
              className="input"
              placeholder="新邀请码"
              value={newInvite}
              onChange={(e) => setNewInvite(e.target.value.toUpperCase())}
            />
            <button className="btn btn-primary" onClick={addInvite}>
              添加
            </button>
          </div>
          <ul className="admin-list">
            {invites.map((iv) => (
              <li key={iv.id} className="admin-item">
                <div className="admin-item-main">
                  <div className="admin-item-title mono">{iv.code}</div>
                  <div className="admin-item-sub">{iv.used ? `已使用（${iv.used_by}）` : '未使用'}</div>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={async () => {
                    await api.adminDeleteInvite(iv.id);
                    loadAll();
                  }}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'foods' && (
        <div className="card">
          <h3>食物库管理（共 {foods.length} 道）</h3>
          <div className="inline-form">
            <input
              className="input"
              placeholder="菜名"
              value={newFoodName}
              onChange={(e) => setNewFoodName(e.target.value)}
            />
            <select className="input select" value={newFoodCat} onChange={(e) => setNewFoodCat(e.target.value)}>
              <option value="breakfast">早餐</option>
              <option value="lunch">午餐</option>
              <option value="dinner">晚餐</option>
            </select>
            <button className="btn btn-primary" onClick={addFood}>
              添加
            </button>
          </div>

          {Object.entries(CAT).map(([key, label]) => (
            <div key={key} className="food-group">
              <div className="food-group-title">
                {label}（{groupedFoods[key]?.length || 0}）
              </div>
              <div className="food-tags">
                {(groupedFoods[key] || []).map((f) => (
                  <span key={f.id} className="food-tag">
                    {f.name}
                    <button
                      className="food-del"
                      onClick={async () => {
                        await api.adminDeleteFood(f.id);
                        loadAll();
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
