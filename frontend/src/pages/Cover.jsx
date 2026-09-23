export default function Cover({ onNext, onAdmin }) {
  return (
    <div className="page cover-page">
      <div className="cover-inner">
        <div className="cover-logo">🍜</div>
        <h1 className="cover-title zoom-in">
          湖南农业大学
          <br />
          美食随机选择器
        </h1>
        <p className="cover-sub fade-in-delay">
          如果你也是
          <br />
          选择困难症
        </p>
      </div>

      <div className="cover-actions">
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          下一步
        </button>
        <button className="btn-ghost" onClick={onAdmin}>
          管理员入口
        </button>
      </div>
    </div>
  );
}
