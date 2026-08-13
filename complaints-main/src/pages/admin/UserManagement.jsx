import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Search, 
  Mail, 
  Shield, 
  Building2,
  X,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { cn } from '../../lib/utils';
import api from '../../lib/axios';
const UserRole = {
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  TEAM_LEADER: 'TEAM_LEADER',
  OFFICER: 'OFFICER',
  PROCESS_OWNER: 'PROCESS_OWNER',
  HEAD_OFFICE_TEAM_LEADER: 'HEAD_OFFICE_TEAM_LEADER',
  BRANCH_TEAM_LEADER: 'BRANCH_TEAM_LEADER',
  HEAD_OFFICE_DIRECTOR: 'HEAD_OFFICE_DIRECTOR',
  BRANCH_DIRECTOR: 'BRANCH_DIRECTOR',
  HEAD_OFFICE_OFFICER: 'HEAD_OFFICE_OFFICER',
  BRANCH_OFFICER: 'BRANCH_OFFICER'
};

const ROLE_OPTIONS = [
  { value: UserRole.ADMIN, label: 'System Administrator', description: 'Full control over all accounts, settings and tax center configuration.' },
  { value: UserRole.HEAD_OFFICE_DIRECTOR, label: 'Head Office Director', description: 'High-level oversight of all escalated ministry complaints.' },
  { value: UserRole.HEAD_OFFICE_TEAM_LEADER, label: 'Head Office Team Leader', description: 'Manage Head Office complaint allocations and review HO officer work.' },
  { value: UserRole.HEAD_OFFICE_OFFICER, label: 'Head Office Officer', description: 'Process escalated complaints assigned to Head Office.' },
  { value: UserRole.BRANCH_TEAM_LEADER, label: 'Branch Team Leader', description: 'Manage a branch tax center and assign cases to branch officers.' },
  { value: UserRole.BRANCH_OFFICER, label: 'Branch Officer', description: 'Process cases assigned within a branch tax center.' },
  { value: UserRole.DIRECTOR, label: 'Director', description: 'Director with ministry-wide reporting privileges.' },
  { value: UserRole.TEAM_LEADER, label: 'Team Leader', description: 'Branch team leader with case assignment responsibilities.' },
  { value: UserRole.OFFICER, label: 'Officer', description: 'Branch officer responsible for assigned cases.' },
  { value: UserRole.PROCESS_OWNER, label: 'Process Owner', description: 'Operational owner with process oversight permissions.' }
];

const normalizeRole = (role) =>
  String(role || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const getRoleLabel = (role, tax_center_name) => {
  const normalized = normalizeRole(role);
  if (normalized === UserRole.HEAD_OFFICE_DIRECTOR) return 'Head Office Director';
  if (normalized === UserRole.HEAD_OFFICE_TEAM_LEADER) return 'Head Office Team Leader';
  if (normalized === UserRole.HEAD_OFFICE_OFFICER) return 'Head Office Officer';
  if (normalized === UserRole.BRANCH_TEAM_LEADER) return 'Branch Team Leader';
  if (normalized === UserRole.BRANCH_OFFICER) return 'Branch Officer';
  if (normalized === UserRole.BRANCH_DIRECTOR) return 'Branch Director';
  if (normalized === UserRole.DIRECTOR) return tax_center_name ? 'Branch Director' : 'Director';
  if (normalized === UserRole.TEAM_LEADER) return tax_center_name ? 'Branch Team Leader' : 'Head Office Team Leader';
  if (normalized === UserRole.OFFICER) return tax_center_name ? 'Branch Officer' : 'Head Office Officer';
  if (normalized === UserRole.ADMIN) return 'Administrator';
  if (normalized === UserRole.PROCESS_OWNER) return 'Process Owner';
  return normalized.replace(/_/g, ' ');
};

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [taxCenters, setTaxCenters] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.OFFICER,
    tax_center_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  setIsLoading(true);
  try {
    const [usersRes, centersRes] = await Promise.all([
      api.get('/admin/users'),
      api.get('/tax-centers')
    ]);

    const centerList = Array.isArray(centersRes.data) ? centersRes.data : centersRes.data?.data || [];
    const centerMap = centerList.reduce((map, center) => {
      map[String(center.id)] = center.name;
      return map;
    }, {});

    const usersData = Array.isArray(usersRes.data)
      ? usersRes.data
      : usersRes.data?.data || [];

    setUsers(usersData.map((u) => {
      const resolvedTaxCenterId = u.tax_center_id ?? u.TAX_CENTER_ID ?? null;
      const taxCenterKey = resolvedTaxCenterId !== null ? String(resolvedTaxCenterId) : null;
      const rawRole = u.role || u.ROLE || u.ROLE_NAME || 'OFFICER';
      const normalizedRole = normalizeRole(rawRole);
      const taxCenterName = u.tax_center_name || u.TAX_CENTER_NAME || (taxCenterKey ? centerMap[taxCenterKey] : null) || null;

      return {
        ...u,
        name: u.name || u.NAME || u.login_name || u.LOGIN_NAME || 'Unnamed',
        email: u.email || u.EMAIL || '',
        role: normalizedRole,
        role_display: getRoleLabel(normalizedRole, taxCenterName),
        tax_center_id: resolvedTaxCenterId,
        tax_center_name: taxCenterName || 'N/A'
      };
    }));

    setTaxCenters(centerList);
  } catch (err) {
    console.error(err);
  } finally {
    setIsLoading(false);
  }
};

  const getRoleSelection = (role, taxCenterName) => {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === UserRole.TEAM_LEADER) {
      return taxCenterName ? UserRole.TEAM_LEADER : UserRole.HEAD_OFFICE_TEAM_LEADER;
    }
    if (normalizedRole === UserRole.OFFICER) {
      return taxCenterName ? UserRole.OFFICER : UserRole.HEAD_OFFICE_OFFICER;
    }
    if (normalizedRole === UserRole.DIRECTOR) {
      return taxCenterName ? UserRole.DIRECTOR : UserRole.HEAD_OFFICE_DIRECTOR;
    }
    return normalizedRole;
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: getRoleSelection(user.role, user.tax_center_name),
        tax_center_id: user.tax_center_id?.toString() || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: UserRole.OFFICER,
        tax_center_id: ''
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const normalizedRole = normalizeRole(formData.role);
    const isHeadOfficeRole = normalizedRole.startsWith('HEAD_OFFICE');
    const url = editingUser ? `/admin/users/${editingUser.id}` : '/admin/users';

    try {
      const requiresTaxCenter = !isHeadOfficeRole && [
        UserRole.TEAM_LEADER,
        UserRole.OFFICER,
        UserRole.DIRECTOR,
        UserRole.BRANCH_TEAM_LEADER,
        UserRole.BRANCH_OFFICER,
        UserRole.BRANCH_DIRECTOR
      ].includes(normalizedRole);

      if (requiresTaxCenter && !formData.tax_center_id) {
        setError('Branch roles require selecting a tax center.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        role: normalizedRole,
        tax_center_id: isHeadOfficeRole ? null : formData.tax_center_id ? parseInt(formData.tax_center_id) : null
      };

      if (editingUser) {
        await api.patch(url, payload);
      } else {
        await api.post(url, payload);
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to save user.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/admin/users/${id}`);
      await fetchData();
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to delete user.';
      console.error(message);
      alert(message);
    }
  };

const term = searchTerm.toLowerCase();
const isHeadOfficeRole = normalizeRole(formData.role).startsWith('HEAD_OFFICE');

const filteredUsers = users.filter(u => {
  const name = u?.name?.toLowerCase() || '';
  const email = u?.email?.toLowerCase() || '';
  const role = u?.role?.toLowerCase() || '';

  return (
    name.includes(term) ||
    email.includes(term) ||
    role.includes(term)
  );
});
  

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">User Management</h1>
            <p className="text-sky-500 mt-2">Create and manage internal staff accounts.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"
          >
            <UserPlus size={20} /> Add New User
          </button>
        </div>

        <div className="bg-sky-50 rounded-3xl border border-sky-100 overflow-hidden">
          <div className="p-6 border-b border-sky-200 bg-sky-100/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, email or role..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-sky-200 rounded-xl text-sm focus:ring-1 focus:ring-sky-500 transition-all outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-sky-100/50 text-sky-400 text-[10px] font-bold uppercase tracking-widest border-b border-sky-200">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Tax Center</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sky-400">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold border border-sky-200">
                          {(u?.name ? u.name.charAt(0) : '?')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-sky-900">{u.name}</p>
                          <p className="text-xs text-sky-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                        u.role === UserRole.ADMIN ? "bg-purple-50 text-purple-600 border-purple-100" :
                        u.role === UserRole.DIRECTOR || u.role === UserRole.BRANCH_DIRECTOR || u.role === UserRole.HEAD_OFFICE_DIRECTOR ? "bg-sky-50 text-sky-600 border-sky-100" :
                        u.role === UserRole.TEAM_LEADER || u.role === UserRole.BRANCH_TEAM_LEADER || u.role === UserRole.HEAD_OFFICE_TEAM_LEADER ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        u.role === UserRole.OFFICER || u.role === UserRole.BRANCH_OFFICER || u.role === UserRole.HEAD_OFFICE_OFFICER ? "bg-sky-50 text-sky-600 border-sky-100" :
                        "bg-sky-50 text-sky-600 border-sky-100"
                      )}>
                        {(u.role_display || u.role || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-sky-600">
                      {u.tax_center_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(u)}
                          className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-sky-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-sky-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-sky-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-sky-50 flex items-center justify-between bg-sky-50/50">
              <h2 className="text-xl font-bold text-sky-900 italic serif">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-sky-400 hover:text-sky-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-sm font-medium">
                  <AlertCircle size={20} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Full Name</label>
                <input 
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                  <input 
                    required
                    type="email"
                    className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Initial Password</label>
                  <input 
                    required
                    type="password"
                    className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Role</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                    <select 
                      className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all appearance-none"
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value  })}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Tax Center</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                    <select 
                      disabled={isHeadOfficeRole}
                      className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all appearance-none disabled:cursor-not-allowed disabled:opacity-60"
                      value={formData.tax_center_id}
                      onChange={e => setFormData({ ...formData, tax_center_id: e.target.value })}
                    >
                      <option value="">None</option>
                      {taxCenters.map(tc => (
                        <option key={tc.id} value={tc.id}>{tc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-sky-50 text-sky-600 rounded-2xl font-bold hover:bg-sky-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-100"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> {editingUser ? 'Update User' : 'Create User'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
