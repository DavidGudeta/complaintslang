import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

const isLocalDev = import.meta.env.DEV;

const normalizeRole = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/__+/g, '_');

  if (normalized === 'HEAD_OFFICE' || normalized === 'HEADOFFICE') {
    return 'HEAD_OFFICE_DIRECTOR';
  }

  return normalized;
};

const getFallbackUser = () => ({
  id: 1,
  role: 'HEAD_OFFICE_DIRECTOR',
  display_role: 'HEAD_OFFICE_DIRECTOR',
  tax_center_name: '',
  tax_center_id: null,
  token: 'demo-token',
});

api.interceptors.request.use((config) => {
  let user = null;

  try {
    const savedUser = localStorage.getItem('taxguard_user');
    if (savedUser) {
      user = JSON.parse(savedUser);
    } else if (isLocalDev) {
      user = getFallbackUser();
    }
  } catch (error) {
    console.error('Failed to read report user context:', error);
    user = isLocalDev ? getFallbackUser() : null;
  }

  if (user) {
    const userContext = {
      id: user.id,
      role: normalizeRole(user.role),
      display_role: normalizeRole(user.display_role || user.role),
      tax_center_name: user.tax_center_name || user.taxCenterName || user.tax_center || user.branch_name || user.branch || user.branchName || '',
      tax_center_id: user.tax_center_id ?? user.taxCenterId ?? user.branch_id ?? user.branchId ?? null,
      token: user.token,
    };

    config.headers = config.headers || {};
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    } else if (isLocalDev) {
      config.headers.Authorization = 'Bearer demo-token';
    }
    config.headers['X-User-Context'] = JSON.stringify(userContext);
  }

  return config;
});

export default api;