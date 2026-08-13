import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Search, ArrowRight, CheckCircle2, MessageSquare, Shield, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="h-20 border-b border-sky-100 flex items-center justify-between px-8 md:px-16 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4 text-sky-900 font-bold text-2xl tracking-tight">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg shadow-sky-100 border border-sky-50">
            <ShieldCheck size={32} className="text-sky-600" />
          </div>
          Ministry of Revenues
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-sky-500">
          <Link to="/contact" className="hover:text-sky-900 transition-colors">Contact</Link>
          <Link to="/feedback" className="hover:text-sky-900 transition-colors">Feedback</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-8 md:px-16 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <Zap size={14} /> Ethiopian Ministry of Revenues
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-sky-900 tracking-tighter mb-8 leading-[0.9] italic serif">
            Tax payer <br />
            <span className="text-sky-600">complaints portal.</span>
          </h1>
          <p className="text-xl text-sky-500 mb-12 leading-relaxed max-w-2xl">
            Providing a transparent, efficient, and secure platform for taxpayers to voice their concerns and track resolutions in real-time.
          </p>
          <div className="flex flex-row gap-4">
            <Link 
              to="/submit" 
              className="px-10 py-5 bg-sky-600 text-white rounded-2xl font-bold text-lg hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-sky-200 group whitespace-nowrap"
            >
              File a Complaint <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/track" 
              className="px-10 py-5 bg-white text-sky-900 border-2 border-sky-100 rounded-2xl font-bold text-lg hover:bg-sky-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Track Your Complaint
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-sky-50 px-8 md:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-sky-900 tracking-tight italic serif mb-4">Built for Transparency</h2>
            <p className="text-sky-500 max-w-2xl mx-auto">We've designed this portal to be the bridge between taxpayers and tax authorities, ensuring every voice is heard and every issue resolved.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Easy Submission', desc: 'Step-by-step wizard to guide you through the complaint process with document support.', icon: <FileText className="text-sky-600" size={32} /> },
              { title: 'Real-time Tracking', desc: 'Use your unique tracking code to see exactly where your case stands in our workflow.', icon: <Search className="text-sky-500" size={32} /> },
              { title: 'Direct Feedback', desc: 'Communicate directly with assigned officers and provide feedback on resolutions.', icon: <MessageSquare className="text-amber-500" size={32} /> },
            ].map((f, i) => (
              <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-sky-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-8">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-sky-900 mb-4">{f.title}</h3>
                <p className="text-sky-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-sky-100 px-8 md:px-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4 text-sky-900 font-bold text-xl tracking-tight">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1.5 border border-sky-50 shadow-sm">
              <ShieldCheck size={28} className="text-sky-600" />
            </div>
            Ministry of Revenues
          </div>
          <p className="text-sm text-sky-400">© 2026 Ethiopian Ministry of Revenues. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm font-bold text-sky-500">
            <Link to="#" className="hover:text-sky-900">Privacy Policy</Link>
            <Link to="#" className="hover:text-sky-900">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
