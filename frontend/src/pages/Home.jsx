import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

const CAT_LABEL = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };

// 滚动动画用到的候选菜名（纯视觉效果，真实结果由后端返回）
const ROLL_POOL = [
  '鱼香肉丝', '宫保鸡丁', '麻婆豆腐', '小炒黄牛肉', '红烧鸡块', '番茄炒蛋',
  '凉拌黄瓜', '小米粥', '扬州炒饭', '红烧牛肉面', '清蒸鲈鱼', '地三鲜',
  '回锅肉', '香菇滑鸡', '炒河粉', '水煮肉片', '香辣大虾', '梅菜扣肉',
  '酸辣土豆丝', '菌菇鸡汤',
];

export default function Home({ phone, user, onRegister, onRefresh, navigate }) {
  const [phoneInput, setPhoneInput] = useState('');
  const [regError, setRegError] = useState('');
  const [registering, setRegistering] = useState(false);

  const [rolling, setRolling] = useState(false);
  const [rollingName, setRollingName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [slot, setSlot] = useState(null);
  const [history, setHistory] = useState([]);

  const rollTimer = useRef(null);
  const blockedTimer = useRef(null);

  useEffect(() => {
    api.timeslot().then(setSlot).catch(() => {});
    if (phone) {
      api.history(phone).then(setHistory).catch(() => {});
    }
  }, [phone]);

  useEffect(() => () => {
    clearInterval(rollTimer.current);
    clearTimeout(blockedTimer.current);
  }, []);

  // ---------- 注册 ----------
  const submitRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    if (!/^1\d{10}$/.test(phoneInput.trim())) {
      setRegError('请输入正确的11位手机号');
      return;
    }
    setRegistering(true);
    try {
      await onRegister(phoneInput.trim());
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  // ---------- 随机抽取 ----------
  const startRoll = async () => {
    setError('');
    setResult(null);
    setRolling(true);

    let res = null;
    let err = null;
    const apiP = api.random(phone).then((r) => (res = r)).catch((e) => (err = e));
    const rollP = new Promise((resolve) => {
      const id = setInterval(() => {
        setRollingName(ROLL_POOL[Math.floor(Math.random() * ROLL_POOL.length)]);
      }, 60);
      rollTimer.current = id;
      setTimeout(() => {
        clearInterval(id);
        resolve();
      }, 3000);
    });

    await Promise.all([apiP, rollP]);
    setRolling(false);

    if (err) {
      setError(err.message);
      if (err.code === 'NO_FREE') {
        blockedTimer.current = setTimeout(() => navigate('block'), 1200);
      }
      return;
    }

    setResult(res);
    await onRefresh();
    api.history(phone).then(setHistory).catch(() => {});

    // 免费次数用完后，稍作停留再跳转拦截页
    if (res.blocked) {
      blockedTimer.current = setTimeout(() => navigate('block'), 2500);
    }
  };

  // ---------- 注册视图 ----------
  if (!phone) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>美食随机选择器</h1>
        </header>
        <div className="card reg-card">
          <h2>欢迎使用 👋</h2>
          <p className="muted">首次使用请填写手机号，手机号将作为你的唯一账号。</p>
          <form onSubmit={submitRegister}>
            <input
              className="input"
              type="tel"
              maxLength={11}
              placeholder="请输入11位手机号"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
            />
            {regError && <p className="error-text">{regError}</p>}
            <button className="btn btn-primary btn-lg btn-block" disabled={registering}>
              {registering ? '注册中…' : '开始使用'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------- 拦截视图（免费次数用完且未解锁） ----------
  if (user && user.blocked && !result && !rolling) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>美食随机选择器</h1>
        </header>
        <div className="card center-card">
          <div className="blocked-icon">🔒</div>
          <h2>免费次数已用完</h2>
          <p className="muted">解锁后才能继续随机选择美食哦～</p>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('block')}>
            去解锁
          </button>
        </div>
      </div>
    );
  }

  // ---------- 主视图 ----------
  const isPermanent = user?.is_permanent || user?.unlocked;
  const remaining = isPermanent
    ? user?.daily_remaining ?? 0
    : user?.free_uses_remaining ?? 0;

  return (
    <div className="page">
      <header className="page-header">
        <div className="header-row">
          <div>
            <div className="phone-label">{phone}</div>
            <span className={`badge ${isPermanent ? 'badge-vip' : 'badge-new'}`}>
              {isPermanent ? '永久用户' : '新用户'}
            </span>
          </div>
          <button className="btn-ghost" onClick={() => navigate('cover')}>
            退出
          </button>
        </div>
      </header>

      <div className="slot-banner">
        {slot ? (
          <>
            当前时段：<b>{slot.label}</b>（{slot.start}–{slot.end}）
          </>
        ) : (
          <>当前非用餐时段（早餐05:00-10:00 / 午餐11:00-13:30 / 晚餐18:00-20:00）</>
        )}
      </div>

      <div className="remaining-bar">
        <span className="remaining-label">剩余次数</span>
        <span className="remaining-num">{remaining}</span>
        {isPermanent ? (
          <span className="remaining-unit">/ 3 次（今日）</span>
        ) : (
          <span className="remaining-unit">次（免费）</span>
        )}
      </div>
      {!isPermanent && remaining > 0 && remaining <= 2 && (
        <p className="warn">⚠️ 请注意使用次数</p>
      )}

      <div className="roll-stage">
        {rolling ? (
          <div className="roll-display">
            <div className="roll-name">{rollingName}</div>
            <div className="roll-hint">正在为你精心挑选…</div>
          </div>
        ) : result ? (
          <div className="result-display">
            <div className="result-cat">{result.categoryLabel}推荐</div>
            <div className="result-food pop-in">{result.food}</div>
            {result.blocked && <p className="warn">免费次数已用完，即将跳转解锁…</p>}
          </div>
        ) : (
          <div className="idle-display">
            <div className="idle-emoji">🍽️</div>
            <div>今天吃什么？</div>
            <div className="muted">点下面按钮，帮你决定！</div>
          </div>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn btn-primary btn-lg btn-block" onClick={startRoll} disabled={rolling || !slot}>
        {rolling ? '抽取中…' : '🎲 随机抽一道菜'}
      </button>
      {!slot && <p className="muted center">当前不在用餐时段，按钮暂不可用</p>}

      {history.length > 0 && (
        <div className="card history-card">
          <h3>最近抽取记录</h3>
          <ul className="history-list">
            {history.slice(0, 8).map((h) => (
              <li key={h.id}>
                <span className="history-food">{h.food_name}</span>
                <span className="history-meta">
                  {CAT_LABEL[h.category] || h.category} · {h.created_at.slice(5, 16)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
