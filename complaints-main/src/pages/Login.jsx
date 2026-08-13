import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/images/mor-logo.png';

export function Login() {
  const navigate = useNavigate();
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
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2.5 mx-auto mb-6 shadow-xl shadow-sky-100 border border-sky-50 overflow-hidden">
            <img src={logo} alt="Ministry of Revenues" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-sky-900 tracking-tight mb-2 italic serif">Ministry of Revenues</h1>
          <p className="text-sky-500">Sign in to access the management portal.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-sky-200/50 border border-sky-100 p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-500 focus:ring-0 transition-all"
                  placeholder="name@revenue.gov.et"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-500 focus:ring-0 transition-all"
                  placeholder="••••••••"
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
              {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-sky-50 text-center">
            <p className="text-sm text-sky-500">
              Forgot your password? <Link to="#" className="text-sky-600 font-bold hover:underline">Contact Admin</Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-sky-400 hover:text-sky-600 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
