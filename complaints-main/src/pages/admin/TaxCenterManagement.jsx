import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  MapPin, 
  Search,
  X,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from '../../lib/axios';

export function TaxCenterManagement() {
  const [centers, setCenters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    location: ''
  });

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tax-centers');
      setCenters(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (center = null) => {
    if (center) {
      setEditingCenter(center);
      setFormData({
        name: center.name,
        location: center.location || ''
      });
    } else {
      setEditingCenter(null);
      setFormData({
        name: '',
        location: ''
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const url = editingCenter ? `/admin/tax-centers/${editingCenter.id}` : '/admin/tax-centers';

    try {
      if (editingCenter) {
        await api.patch(url, formData);
      } else {
        await api.post(url, formData);
      }

      await fetchCenters();
      setIsModalOpen(false);
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to save tax center.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tax center?')) return;
    
    try {
      await api.delete(`/admin/tax-centers/${id}`);
      await fetchCenters();
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to delete tax center.';
      alert(message);
    }
  };

  const filteredCenters = centers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">Tax Center Management</h1>
            <p className="text-sky-500 mt-2">Configure and manage Ministry branch offices.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"
          >
            <Plus size={20} /> Add New Center
          </button>
        </div>

        <div className="bg-sky-50 rounded-3xl border border-sky-100 overflow-hidden">
          <div className="p-6 border-b border-sky-200 bg-sky-100/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or location..." 
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
                  <th className="px-6 py-4">Tax Center</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto" />
                    </td>
                  </tr>
                ) : filteredCenters.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-sky-400">
                      No tax centers found.
                    </td>
                  </tr>
                ) : filteredCenters.map((c) => (
                  <tr key={c.id} className="hover:bg-white transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-sky-100 flex items-center justify-center text-sky-600 shadow-sm">
                          <Building2 size={20} />
                        </div>
                        <p className="text-sm font-bold text-sky-900">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-sky-600">
                        <MapPin size={14} className="text-sky-400" />
                        {c.location || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(c)}
                          className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
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

      {/* Tax Center Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-sky-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-sky-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-sky-50 flex items-center justify-between bg-sky-50/50">
              <h2 className="text-xl font-bold text-sky-900 italic serif">
                {editingCenter ? 'Edit Tax Center' : 'Add New Tax Center'}
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
                <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Center Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                  <input 
                    required
                    type="text"
                    className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                    placeholder="e.g. Addis Ababa Central Branch"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-sky-500 uppercase tracking-widest">Location / Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
                  <input 
                    required
                    type="text"
                    className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                    placeholder="e.g. Arada Subcity, Addis Ababa"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
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
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> {editingCenter ? 'Update Center' : 'Create Center'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
