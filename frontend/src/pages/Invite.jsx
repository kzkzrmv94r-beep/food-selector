import { useState } from 'react';
import { api } from '../api.js';

export default function Invite({ phone, navigate, onUnlocked }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('请输入邀请码');
      return;
    }
    setLoading(true);
    try {
      await api.redeemInvite(phone, code.trim());
      onUnlocked();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>邀请码兑换</h1>
      </header>

      <div className="card center-card">
        <h2>🎫 输入邀请码</h2>
        <p className="muted">邀请码一次性使用，兑换成功即永久解锁。</p>
        <form onSubmit={submit}>
          <input
            className="input input-code"
            type="text"
            placeholder="请输入邀请码"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? '兑换中…' : '兑换'}
          </button>
        </form>
      </div>

      <button className="btn-ghost center" onClick={() => navigate('block')}>
        ← 返回
      </button>
    </div>
  );
}
