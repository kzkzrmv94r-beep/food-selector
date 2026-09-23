// 后端接口封装
// 开发环境走 /api 代理（vite.config.js）；生产环境由构建时注入 VITE_API_BASE 指向云后端
const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || '请求失败');
    err.code = data.code;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  register: (phone) => request('/register', { method: 'POST', body: { phone } }),
  getUser: (phone) => request(`/user/${phone}`),
  random: (phone) => request('/random', { method: 'POST', body: { phone } }),
  pay: (phone) => request('/pay', { method: 'POST', body: { phone } }),
  redeemInvite: (phone, code) => request('/invite/redeem', { method: 'POST', body: { phone, code } }),
  history: (phone) => request(`/history/${phone}`),
  timeslot: () => request('/timeslot'),

  adminLogin: (code) => request('/admin/login', { method: 'POST', body: { code } }),
  adminUsers: () => request('/admin/users'),
  adminApprove: (phone) => request('/admin/approve', { method: 'POST', body: { phone } }),
  adminReject: (phone) => request('/admin/reject', { method: 'POST', body: { phone } }),
  adminInvites: () => request('/admin/invites'),
  adminAddInvite: (code) => request('/admin/invites', { method: 'POST', body: { code } }),
  adminDeleteInvite: (id) => request(`/admin/invites/${id}`, { method: 'DELETE' }),
  adminFoods: () => request('/admin/foods'),
  adminAddFood: (name, category) => request('/admin/foods', { method: 'POST', body: { name, category } }),
  adminDeleteFood: (id) => request(`/admin/foods/${id}`, { method: 'DELETE' }),
};
