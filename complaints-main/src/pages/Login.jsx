import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import logo from '../assets/images/mor-logo.png';

export function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(t('pages.login.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2.5 mx-auto mb-6 shadow-xl shadow-sky-100 border border-sky-50 overflow-hidden">
            <img src={logo} alt={t('pages.login.title')} className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-sky-900 tracking-tight mb-2 italic serif">{t('pages.login.title')}</h1>
          <p className="text-sky-500">{t('pages.login.subtitle')}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-sky-200/50 border border-sky-100 p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">{t('pages.login.emailLabel')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-500 focus:ring-0 transition-all"
                  placeholder={t('pages.login.emailPlaceholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">{t('pages.login.passwordLabel')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-500 focus:ring-0 transition-all"
                  placeholder={t('pages.login.passwordPlaceholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                <AlertCircle size={18} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-sky-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-sky-100"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : t('pages.login.signInButton')}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-sky-50 text-center">
            <p className="text-sm text-sky-500">
              {t('pages.login.forgotPassword')} <Link to="#" className="text-sky-600 font-bold hover:underline">{t('common.close')}</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-sky-400 hover:text-sky-600 transition-colors">
            <ArrowLeft size={16} /> {t('common.back')}
          </Link>
        </div>
      </div>
    </div>
  );
}
