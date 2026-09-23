import { useState } from 'react';
import { api } from '../api.js';

export default function Payment({ phone, navigate, onRefresh }) {
  const [status, setStatus] = useState('idle'); // idle | submitting | pending
  const [msg, setMsg] = useState('');

  const handlePaid = async () => {
    setStatus('submitting');
    try {
      await api.pay(phone);
      setStatus('pending');
      setMsg('已提交支付信息，等待管理员审核。审核通过后自动解除拦截。');
    } catch (e) {
      setStatus('idle');
      setMsg(e.message);
    }
  };

  const handleRefresh = async () => {
    setMsg('');
    const u = await onRefresh();
    if (u && u.unlocked) {
      navigate('home');
    } else {
      setMsg('仍在审核中，请稍后再试。');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>支付解锁</h1>
      </header>

      <div className="card center-card">
        <h2>永久解锁 · 0.99 元</h2>
        <p className="muted">扫码支付后，点击下方【已支付】提交，管理员审核通过即永久解锁。</p>

        <div className="qr-wrap">
          <img className="qr-img" src={import.meta.env.BASE_URL + 'qrcode.jpg'} alt="付款二维码" />
        </div>

        {msg && <p className={status === 'pending' ? 'ok-text' : 'error-text'}>{msg}</p>}

        {status === 'pending' ? (
          <div className="choice-list">
            <button className="btn btn-outline btn-lg btn-block" onClick={handleRefresh}>
              🔄 刷新审核状态
            </button>
            <button className="btn-ghost center" onClick={() => navigate('home')}>
              返回首页
            </button>
          </div>
        ) : (
          <div className="choice-list">
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={handlePaid}
              disabled={status === 'submitting'}
            >
              ✅ 我已支付，等待审核
            </button>
            <button className="btn btn-outline btn-lg btn-block" onClick={() => navigate('block')}>
              ❌ 暂不支付
            </button>
          </div>
        )}
      </div>

      <button className="btn-ghost center" onClick={() => navigate('block')}>
        ← 返回
      </button>
    </div>
  );
}
