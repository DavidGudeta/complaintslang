import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Edit3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import api from '../lib/axios';

export function Profile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.patch(`/profile/${user?.id}`, profileData);
      updateUser(response.data);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch(`/profile/${user?.id}/password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccess('Password changed successfully');
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">My Profile</h1>
            <p className="text-sky-500 mt-2">Manage your account settings and security.</p>
          </div>
          <div className="flex gap-3">
            {!isEditing && !isChangingPassword && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200 rounded-xl text-sm font-bold text-sky-600 hover:bg-sky-100 transition-all"
                >
                  <Edit3 size={18} /> Edit Profile
                </button>
                <button 
                  onClick={() => setIsChangingPassword(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all"
                >
                  <Key size={18} /> Change Password
                </button>
              </>
            )}
          </div>
        </div>

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-medium"
          >
            <CheckCircle2 size={20} />
            {success}
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
          >
            <AlertCircle size={20} />
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-sky-50 rounded-3xl p-8 border border-sky-100 shadow-sm text-center">
              <div className="w-24 h-24 bg-sky-600 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-sky-200 mb-6">
                {user.name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-sky-900">{user.name}</h2>
              <p className="text-sm text-sky-500 mt-1">{user.email}</p>
              <div className="mt-6 pt-6 border-t border-sky-200 flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-sky-100 rounded-full text-[10px] font-bold text-sky-500 uppercase tracking-widest">
                  <Shield size={12} />
                  {(user.display_role || user.role).replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Forms Area */}
          <div className="md:col-span-2 space-y-8">
            {isEditing ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-sky-50 rounded-3xl p-8 border border-sky-100 shadow-sm"
              >
                <h2 className="text-xl font-bold text-sky-900 mb-6">Edit Profile</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                      <input 
                        type="text"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                        value={profileData.name}
                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                      <input 
                        type="email"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                        value={profileData.email}
                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 bg-white border border-sky-200 text-sky-600 rounded-xl font-bold hover:bg-sky-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-200"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Changes</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : isChangingPassword ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-sky-50 rounded-3xl p-8 border border-sky-100 shadow-sm"
              >
                <h2 className="text-xl font-bold text-sky-900 mb-6">Change Password</h2>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Current Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                      <input 
                        type="password"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                        value={passwordData.currentPassword}
                        onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">New Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                      <input 
                        type="password"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Confirm New Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                      <input 
                        type="password"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-white border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="flex-1 py-3 bg-white border border-sky-200 text-sky-600 rounded-xl font-bold hover:bg-sky-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-200"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Update Password</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <div className="bg-sky-50 rounded-3xl p-8 border border-sky-100 shadow-sm space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-sky-900 mb-6">Account Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-sky-400 uppercase tracking-widest">Full Name</p>
                      <p className="text-sky-900 font-medium">{user.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-sky-400 uppercase tracking-widest">Email Address</p>
                      <p className="text-sky-900 font-medium">{user.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-sky-400 uppercase tracking-widest">Role</p>
                      <p className="text-sky-900 font-medium">{(user.display_role || user.role).replace('_', ' ')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-sky-400 uppercase tracking-widest">Tax Center ID</p>
                      <p className="text-sky-900 font-medium">{user.tax_center_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-sky-200">
                  <h2 className="text-xl font-bold text-sky-900 mb-6">Security Status</h2>
                  <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-sky-100">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-sky-900">Account is Protected</p>
                      <p className="text-xs text-sky-500">Your account is active and secured with standard encryption.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
