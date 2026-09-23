export default function Block({ phone, navigate }) {
  return (
    <div className="page">
      <header className="page-header">
        <h1>解锁使用</h1>
      </header>

      <div className="card center-card">
        <div className="blocked-icon">🔒</div>
        <h2>次数已用完</h2>
        <p className="muted">
          当前账号 <b>{phone}</b> 的免费机会已用完，
          <br />
          选择以下任一方式解锁，即可继续随机选择美食。
        </p>

        <div className="choice-list">
          <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('payment')}>
            💰 支付 0.99 元解锁
          </button>
          <button className="btn btn-outline btn-lg btn-block" onClick={() => navigate('invite')}>
            🎫 邀请码兑换
          </button>
        </div>
      </div>

      <button className="btn-ghost center" onClick={() => navigate('home')}>
        ← 返回
      </button>
    </div>
  );
}
