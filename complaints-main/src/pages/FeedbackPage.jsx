import React, { useState } from 'react';
import { Star, Send, CheckCircle2, MessageSquare, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export function FeedbackPage() {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

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
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Thank You!</h2>
          <p className="text-zinc-500 mb-8">
            Your feedback is invaluable to us. We use it to continuously improve the taxpayer experience.
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6">
            <MessageSquare size={32} />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-4 italic serif">Share Your Feedback</h1>
          <p className="text-zinc-500">
            How was your experience with the Ministry of Revenues portal? Let us know how we can improve.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-zinc-200/50 border border-zinc-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
              <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4 block">Rate your experience</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star 
                      size={40} 
                      className={cn(
                        "transition-colors",
                        (hoveredRating || rating) >= star 
                          ? "fill-amber-400 text-amber-400" 
                          : "text-zinc-200"
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm font-medium text-zinc-400">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">What did you like most?</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-600 focus:ring-0 transition-all resize-none"
                  placeholder="The interface, speed of response, etc..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">What can we improve?</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-blue-600 focus:ring-0 transition-all resize-none"
                  placeholder="Any suggestions for us..."
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={!rating}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              Submit Feedback
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
