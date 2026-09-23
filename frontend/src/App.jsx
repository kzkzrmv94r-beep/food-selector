import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import Cover from './pages/Cover.jsx';
import Home from './pages/Home.jsx';
import Block from './pages/Block.jsx';
import Payment from './pages/Payment.jsx';
import Invite from './pages/Invite.jsx';
import Admin from './pages/Admin.jsx';

const PHONE_KEY = 'fs_phone';

export default function App() {
  const [page, setPage] = useState('cover');
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || '');
  const [user, setUser] = useState(null);

  const refreshUser = useCallback(async (p) => {
    if (!p) return null;
    try {
      const u = await api.getUser(p);
      setUser(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (phone) refreshUser(phone);
  }, [phone, refreshUser]);

  const navigate = (p) => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  // 首次填写手机号注册（手机号即唯一账号）
  const handleRegister = async (p) => {
    const u = await api.register(p);
    localStorage.setItem(PHONE_KEY, p);
    setPhone(p);
    setUser(u);
  };

  const pageView = () => {
    switch (page) {
      case 'home':
        return (
          <Home
            phone={phone}
            user={user}
            onRegister={handleRegister}
            onRefresh={() => refreshUser(phone)}
            navigate={navigate}
          />
        );
      case 'block':
        return <Block phone={phone} navigate={navigate} />;
      case 'payment':
        return <Payment phone={phone} navigate={navigate} onRefresh={() => refreshUser(phone)} />;
      case 'invite':
        return (
          <Invite
            phone={phone}
            navigate={navigate}
            onUnlocked={() => {
              refreshUser(phone);
              navigate('home');
            }}
          />
        );
      case 'admin':
        return <Admin navigate={navigate} />;
      case 'cover':
      default:
        return <Cover onNext={() => navigate('home')} onAdmin={() => navigate('admin')} />;
    }
  };

  return <div className="app-shell">{pageView()}</div>;
}
