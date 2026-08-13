import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Message Sent!</h2>
          <p className="text-zinc-500 mb-8">
            Thank you for contacting us. Our team will get back to you as soon as possible.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
          >
            Return Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h1 className="text-5xl font-bold text-zinc-900 tracking-tight mb-6 italic serif">Get in Touch</h1>
            <p className="text-xl text-zinc-500 mb-12">
              Have questions about the complaints process? Our team is here to help you navigate the system.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 mb-1">Email Us</h3>
                  <p className="text-zinc-500">support@revenue.gov.et</p>
                  <p className="text-zinc-500">complaints@revenue.gov.et</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 mb-1">Call Us</h3>
                  <p className="text-zinc-500">+251 11 123 4567</p>
                  <p className="text-zinc-500">Toll Free: 8080</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 mb-1">Visit Us</h3>
                  <p className="text-zinc-500">Meles Zenawi Way, Addis Ababa</p>
                  <p className="text-zinc-500">Ethiopian Ministry of Revenues HQ</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-zinc-200/50 border border-zinc-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-600 focus:ring-0 transition-all"
                  placeholder="Your full name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                  <input 
                    required
                    type="email" 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-600 focus:ring-0 transition-all"
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
                  <input 
                    type="tel" 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-600 focus:ring-0 transition-all"
                    placeholder="+251 ..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Subject</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-600 focus:ring-0 transition-all"
                  placeholder="How can we help?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Message</label>
                <textarea 
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-600 focus:ring-0 transition-all resize-none"
                  placeholder="Tell us more about your inquiry..."
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                <Send size={20} /> Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
