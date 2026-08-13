import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Hash,
  X,
  File as FileIcon,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn } from '../lib/utils';
import api from '../lib/axios';

export function SubmitComplaint() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [taxCenters, setTaxCenters] = useState([]);
  const [trackingCode, setTrackingCode] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    tin: '',
    name: '',
    complainant_name: '',
    email: '',
    complainant_email: '',
    phone: '',
    complainant_phone: '',
    woreda: '',
    zone: '',
    region: '',
    enterprise_address: '',
    subject: '',
    category_id: '',
    subcategory_id: '',
    tax_center_id: '',
    mrc_code: '',
    ref_no: '',
    description: '',
    files: [] 
  });

useEffect(() => {
  api.get('/categories').then(res => {
    console.log("CATEGORIES API:", res.data);

    // handle different backend formats
    const data = Array.isArray(res.data)
      ? res.data
      : res.data.data || res.data.categories || [];

    setCategories(data);
  });

  // fetch subcategories separately (backend exposes /subcategories)
  api.get('/subcategories').then(res => {
    console.log('SUBCATEGORIES API:', res.data);
    const data = Array.isArray(res.data)
      ? res.data
      : res.data.data || res.data.subcategories || [];
    setSubcategories(data);
  }).catch(() => setSubcategories([]));

  api.get('/tax-centers').then(res => {
    console.log("TAX CENTERS API:", res.data);

    const data = Array.isArray(res.data)
      ? res.data
      : res.data.data || res.data.taxCenters || [];

    setTaxCenters(data);
  });
}, []);
const handleTinSearch = async () => {
    if (!formData.tin) {
      alert('TIN is required.');
      return;
    }

    try {
      setIsSearching(true);

      const res = await api.get(`/taxpayer/${formData.tin}`);

      const tp = res.data;

      console.log("TIN DATA:", tp);

      setFormData(prev => ({
        ...prev,
        name: tp.name || prev.name || "",
        phone: prev.phone || tp.phone || "",
        region: prev.region || tp.city || "",
        zone: prev.zone || tp.locality || ""
      }));

      setStep(1);

    } catch (error) {
      console.log("TIN ERROR:", error);

      setFormData(prev => ({
        ...prev,
        name: prev.name || "",
        phone: prev.phone || "",
        region: prev.region || "",
        zone: prev.zone || ""
      }));

      if (error?.response?.status === 404) {
        alert('Invalid TIN. Please check and try again.');
      } else {
        alert("Server error while fetching TIN. You can continue entering your complaint details manually.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const availableSubcategories = useMemo(() => {
    if (!formData.category_id || subcategories.length === 0) return [];
    return subcategories.filter(s => String(s.parent_id) === String(formData.category_id));
  }, [formData.category_id, subcategories]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone) => {
    const normalized = String(phone || '').trim();
    return /^(?:\+2519\d{8}|09\d{8})$/.test(normalized);
  };

  const validateComplainantInfo = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Complaint name is required.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(formData.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!isValidPhone(formData.phone.trim())) {
      nextErrors.phone = 'Please enter a valid phone number.';
    }

    if (!formData.complainant_name.trim()) {
      nextErrors.complainant_name = 'Complainant name is required.';
    }

    if (!formData.complainant_email.trim()) {
      nextErrors.complainant_email = 'Complainant email is required.';
    } else if (!isValidEmail(formData.complainant_email.trim())) {
      nextErrors.complainant_email = 'Please enter a valid complainant email address.';
    }

    if (!formData.complainant_phone.trim()) {
      nextErrors.complainant_phone = 'Complainant phone number is required.';
    } else if (!isValidPhone(formData.complainant_phone.trim())) {
      nextErrors.complainant_phone = 'Please enter a valid complainant phone number.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateComplaintDetails = () => {
    const nextErrors = {};

    if (!formData.subject.trim()) {
      nextErrors.subject = 'Subject is required.';
    }

    if (!formData.description.trim()) {
      nextErrors.description = 'Detailed description is required.';
    }

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.subject;
      delete updated.description;
      return { ...updated, ...nextErrors };
    });

    return Object.keys(nextErrors).length === 0;
  };

  const validateRequiredFields = () => {
    if (!validateComplainantInfo()) {
      return false;
    }

    if (!validateComplaintDetails()) {
      return false;
    }

    if (!formData.tax_center_id) {
      alert('Tax center is required.');
      return false;
    }

    if (formData.files.length === 0) {
      alert('Please upload at least one file.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateComplaintDetails() || !validateRequiredFields()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      const taxCenterName = taxCenters.find(tc => String(tc.id) === String(formData.tax_center_id))?.name;

      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'files') {
          formData.files.forEach(file => {
            data.append('files', file);
          });
        } else if (['complainant_name', 'complainant_email', 'complainant_phone'].includes(key)) {
          return;
        } else {
          data.append(key, value);
        }
      });

      data.append('COMPLAINANT_NAME', formData.complainant_name);
      data.append('COMPLAINANT_EMAIL', formData.complainant_email);
      data.append('COMPLAINANT_PHONE', formData.complainant_phone);
      if (taxCenterName) {
        data.append('tax_center', taxCenterName);
        data.append('tax_center_name', taxCenterName);
      }

      const response = await api.post('/complaints', data);
      setTrackingCode(response.data.tracking_code);
      setStep(4);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles].slice(0, 5) // Limit to 5 files
      }));
    }
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles].slice(0, 5)
      }));
    }
  };

  const steps = [
    { title: 'TIN Verification', icon: <Search size={20} /> },
    { title: 'Complainant Info', icon: <User size={20} /> },
    { title: 'Complaint Case', icon: <FileText size={20} /> },
    { title: 'Additional Info', icon: <Upload size={20} /> }
  ];

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-3xl w-full">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-sky-400 hover:text-sky-900 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-2 mx-auto mb-6 shadow-xl shadow-sky-100 border border-sky-50">
            <ShieldCheck size={40} className="text-sky-600" />
          </div>
          <h1 className="text-4xl font-bold text-sky-900 tracking-tight mb-2 italic serif">Submit a Complaint</h1>
          <p className="text-sky-500">Please follow the steps below to file your complaint with the portal.</p>
        </div>

        {/* Wizard Progress */}
        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-sky-200 -translate-y-1/2 z-0" />
          {steps.map((s, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                step >= i ? "bg-sky-600 text-white shadow-lg shadow-sky-200" : "bg-white text-sky-400 border-2 border-sky-200"
              )}>
                {step > i ? <CheckCircle2 size={20} /> : s.icon}
              </div>
              <span className={cn(
                "text-xs font-semibold mt-2 transition-colors",
                step >= i ? "text-sky-600" : "text-sky-400"
              )}>{s.title}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-sky-200/50 border border-sky-100 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-12"
              >
                <div className="max-w-md mx-auto text-center">
                  <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 mx-auto mb-6">
                    <Search size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-sky-900 mb-4">Verify Taxpayer Identification</h2>
                  <p className="text-sky-500 mb-8">Enter your Taxpayer Identification Number (TIN) to begin the complaint process.</p>

                  <div className="relative mb-6">
                    <input
                      type="text"
                      placeholder="Enter TIN (e.g. 123-456-789)"
                      className="w-full px-6 py-4 bg-sky-50 border-2 border-sky-100 rounded-2xl focus:border-sky-600 focus:ring-0 transition-all text-lg font-mono tracking-wider"
                      value={formData.tin}
                      onChange={e => setFormData({ ...formData, tin: e.target.value })}
                    />
                  </div>
                  
                  <button
                    onClick={handleTinSearch}
                    disabled={!formData.tin || isSearching}
                    className="w-full bg-sky-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-sky-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-sky-100"
                  >
                    {isSearching ? <Loader2 className="animate-spin" /> : 'Verify & Continue'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-12"
              >
                <h2 className="text-2xl font-bold text-sky-900 mb-8">Complainant Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Enterprise Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                      <input
                        type="email"
                        className={cn(
                          "w-full pl-12 pr-4 py-3 bg-sky-50 border rounded-xl focus:ring-0 transition-all",
                          errors.email ? 'border-red-400 focus:border-red-600' : 'border-sky-200 focus:border-sky-600'
                        )}
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Enterprise Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                      <input
                        type="tel"
                        className={cn(
                          "w-full pl-12 pr-4 py-3 bg-sky-50 border rounded-xl focus:ring-0 transition-all",
                          errors.phone ? 'border-red-400 focus:border-red-600' : 'border-sky-200 focus:border-sky-600'
                        )}
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Complainant Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                      <input
                        type="text"
                        placeholder=""
                        className={cn(
                          "w-full pl-12 pr-4 py-3 bg-sky-50 border rounded-xl focus:ring-0 transition-all",
                          errors.complainant_name ? 'border-red-400 focus:border-red-600' : 'border-sky-200 focus:border-sky-600'
                        )}
                        value={formData.complainant_name}
                        onChange={e => setFormData({ ...formData, complainant_name: e.target.value })}
                      />
                    </div>
                    {errors.complainant_name && (
                      <p className="text-xs text-red-600 mt-1">{errors.complainant_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Complainant Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                      <input
                        type="email"
                        placeholder="complainant@email.com"
                        className={cn(
                          "w-full pl-12 pr-4 py-3 bg-sky-50 border rounded-xl focus:ring-0 transition-all",
                          errors.complainant_email ? 'border-red-400 focus:border-red-600' : 'border-sky-200 focus:border-sky-600'
                        )}
                        value={formData.complainant_email}
                        onChange={e => setFormData({ ...formData, complainant_email: e.target.value })}
                      />
                    </div>
                    {errors.complainant_email && (
                      <p className="text-xs text-red-600 mt-1">{errors.complainant_email}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Complainant Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                      <input
                        type="tel"
                        placeholder="e.g. +251911234567"
                        className={cn(
                          "w-full pl-12 pr-4 py-3 bg-sky-50 border rounded-xl focus:ring-0 transition-all",
                          errors.complainant_phone ? 'border-red-400 focus:border-red-600' : 'border-sky-200 focus:border-sky-600'
                        )}
                        value={formData.complainant_phone}
                        onChange={e => setFormData({ ...formData, complainant_phone: e.target.value })}
                      />
                    </div>
                    {errors.complainant_phone && (
                      <p className="text-xs text-red-600 mt-1">{errors.complainant_phone}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Enterprise Address</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                      value={formData.enterprise_address}
                      onChange={e => setFormData({ ...formData, enterprise_address: e.target.value })}
                      placeholder="e.g. Bole, Addis Ababa"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Region</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                      value={formData.region}
                      onChange={e => setFormData({ ...formData, region: e.target.value })}
                      placeholder="e.g. Addis Ababa"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Zone / Sub-City</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                      value={formData.zone}
                      onChange={e => setFormData({ ...formData, zone: e.target.value })}
                      placeholder="e.g. Kirkos"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Woreda</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                      value={formData.woreda}
                      onChange={e => setFormData({ ...formData, woreda: e.target.value })}
                      placeholder="e.g. Woreda 01"
                    />
                  </div>
                </div>
                <div className="mt-12 flex justify-between">
                  <button onClick={() => setStep(0)} className="px-8 py-3 text-sky-500 font-bold hover:text-sky-900 transition-colors flex items-center gap-2">
                    <ChevronLeft size={20} /> Back
                  </button>
                  <button
                    onClick={() => {
                      if (validateComplainantInfo()) {
                        setStep(2);
                      }
                    }}
                    className="px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all flex items-center gap-2 shadow-lg shadow-sky-100"
                  >
                    Continue <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-12"
              >
                <h2 className="text-2xl font-bold text-sky-900 mb-8">Complaint Case Details</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Subject</label>
                    <input
                      type="text"
                      placeholder="Brief summary of the issue"
                      className={cn(
                        "w-full px-4 py-3 bg-sky-50 rounded-xl focus:ring-0 transition-all",
                        errors.subject ? 'border border-red-400 focus:border-red-600' : 'border border-sky-200 focus:border-sky-600'
                      )}
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    />
                    {errors.subject && (
                      <p className="text-xs text-red-600 mt-1">{errors.subject}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Category</label>
                      <select
                        className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                        value={String(formData.category_id)}
                        onChange={e => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '' })}
                      >
                        <option value="">Select a category</option>
                        {categories.filter(c => !c.parent_id).map(c => (
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Subcategory (Optional)</label>
                      <select
                        className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                        value={String(formData.subcategory_id)}
                        onChange={e => setFormData({ ...formData, subcategory_id: e.target.value })}
                        disabled={!formData.category_id}
                      >
                        <option value="">Select a subcategory</option>
                        {availableSubcategories.length === 0 && formData.category_id ? (
                          <option value="">No subcategories available</option>
                        ) : (
                          availableSubcategories.map(s => (
                            <option key={s.id} value={String(s.id)}>{s.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Tax Center</label>
                      <select
                        className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                        value={formData.tax_center_id}
                        onChange={e => setFormData({ ...formData, tax_center_id: e.target.value })}
                      >
                        <option value="">Select your tax center</option>
                        {taxCenters.map(tc => (
                          <option key={tc.id} value={tc.id}>{tc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Reference Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter Ref No if applicable"
                        className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                        value={formData.ref_no}
                        onChange={e => setFormData({ ...formData, ref_no: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">MRC Code (Optional)</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" size={20} />
                      <input
                        type="text"
                        placeholder="Enter MRC Code if applicable"
                        className="w-full pl-12 pr-4 py-3 bg-sky-50 border border-sky-200 rounded-xl focus:border-sky-600 focus:ring-0 transition-all"
                        value={formData.mrc_code}
                        onChange={e => setFormData({ ...formData, mrc_code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sky-500 uppercase tracking-wider">Detailed Description</label>
                    <textarea
                      rows={5}
                      placeholder="Provide as much detail as possible..."
                      className={cn(
                        "w-full px-4 py-3 bg-sky-50 rounded-xl focus:ring-0 transition-all resize-none",
                        errors.description ? 'border border-red-400 focus:border-red-600' : 'border border-sky-200 focus:border-sky-600'
                      )}
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                    {errors.description && (
                      <p className="text-xs text-red-600 mt-1">{errors.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-12 flex justify-between">
                  <button onClick={() => setStep(1)} className="px-8 py-3 text-sky-500 font-bold hover:text-sky-900 transition-colors flex items-center gap-2">
                    <ChevronLeft size={20} /> Back
                  </button>
                  <button
                    onClick={() => {
                      if (validateComplaintDetails()) {
                        setStep(3);
                      }
                    }}
                    className="px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all flex items-center gap-2 shadow-lg shadow-sky-100"
                  >
                    Continue <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-12"
              >
                <h2 className="text-2xl font-bold text-sky-900 mb-8">Additional Info & Uploads</h2>
                <div className="space-y-8">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-sky-200 rounded-3xl p-12 text-center hover:border-sky-600 transition-colors cursor-pointer group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      multiple 
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.png"
                    />
                    <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-400 mx-auto mb-4 group-hover:text-sky-600 group-hover:bg-sky-50 transition-all">
                      <Upload size={32} />
                    </div>
                    <p className="text-sky-900 font-bold mb-1">Click to upload or drag and drop</p>
                    <p className="text-sky-500 text-sm">PDF, JPG, PNG (Max 5MB per file, max 5 files)</p>
                  </div>

                  {formData.files.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-sky-900">Selected Files ({formData.files.length}/5)</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {formData.files.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-sky-50 border border-sky-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <FileIcon className="text-sky-400" size={20} />
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-sky-900 truncate max-w-[200px]">{file.name}</span>
                                <span className="text-xs text-sky-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(idx);
                              }}
                              className="p-2 text-sky-400 hover:text-red-600 transition-colors"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-6 flex gap-4">
                    <AlertCircle className="text-sky-600 shrink-0" size={24} />
                    <div>
                      <p className="text-sky-900 font-bold text-sm mb-1">Important Note</p>
                      <p className="text-sky-700 text-sm leading-relaxed">
                        <li>A valid identification (ID) of the person submitting the complaint.</li>
                        <li>If the complaint is submitted by a representative, a valid legal power
                         of attorney (authorization) document must be provided</li>
                        <li>The complainant may attach a written complaint letter that is signed by the </li>
                        appropriate authorized official and bears the organization's official seal/stamp.
                        <li>The submitted complaint must include a written response from the responsible branch.</li> 
                        Ensure scanned documents are complete before uploading.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-12 flex justify-between">
                  <button onClick={() => setStep(2)} className="px-8 py-3 text-sky-500 font-bold hover:text-sky-900 transition-colors flex items-center gap-2">
                    <ChevronLeft size={20} /> Back
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all flex items-center gap-2 shadow-lg shadow-sky-100"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Complaint'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-8 md:p-12 text-center"
              >
                <div className="w-20 h-20 bg-sky-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-sky-200">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-bold text-sky-900 mb-4">Submission Successful!</h2>
                <p className="text-sky-500 mb-8 max-w-md mx-auto">
                  Your complaint has been received and assigned a unique tracking code. 
                  Please save this code to track the progress of your case.
                </p>
                
                <div className="bg-sky-50 border-2 border-sky-100 rounded-3xl p-8 mb-12 inline-block">
                  <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Your Tracking Code</p>
                  <p className="text-4xl font-mono font-bold text-sky-900 tracking-wider">{trackingCode}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => navigate(`/track?code=${trackingCode}`)}
                    className="px-8 py-4 bg-sky-600 text-white rounded-2xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"
                  >
                    Track Progress Now
                  </button>
                  <button 
                    onClick={() => navigate('/')}
                    className="px-8 py-4 bg-white text-sky-900 border border-sky-200 rounded-2xl font-bold hover:bg-sky-50 transition-all"
                  >
                    Return Home
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
