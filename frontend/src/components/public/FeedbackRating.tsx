import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Check, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitFeedbackRating } from '@/lib/api';

interface FeedbackRatingProps {
  inquiryId?: string;
  meterNumber?: string;
  currentRating?: number | null;
  onRatingSubmitted?: (rating: number) => void;
}

export function FeedbackRating({
  inquiryId,
  meterNumber,
  currentRating,
  onRatingSubmitted
}: FeedbackRatingProps) {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!currentRating);

  const handleRate = async (star: number) => {
    if (submitted && rating === star) return;
    setRating(star);
    setIsSubmitting(true);

    try {
      await submitFeedbackRating({
        inquiryId,
        meterNumber,
        rating: star
      });

      setSubmitted(true);
      if (onRatingSubmitted) onRatingSubmitted(star);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#84cc16', '#10b981', '#f59e0b', '#38bdf8']
      });
    } catch (err) {
      console.error('Failed to submit rating:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mt-6 p-6 rounded-2xl glass-card-dark border-slate-800 text-center relative overflow-hidden">
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-lime-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Consumer Experience Feedback</span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          How accurate is this solar recommendation for your household?
        </h3>
        <p className="text-xs text-slate-400">
          Your rating directly trains the regional Gov demand radar.
        </p>

        {/* 5-Star Interactive Stepper */}
        <div className="flex items-center justify-center gap-2 pt-2 pb-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = (hoverRating || rating) >= star;
            return (
              <motion.button
                key={star}
                type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleRate(star)}
                disabled={isSubmitting}
                className="p-1.5 focus:outline-none transition-colors cursor-pointer"
                aria-label={`Rate ${star} stars out of 5`}
              >
                <Star
                  className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                    isFilled
                      ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                      : 'text-slate-600 hover:text-slate-400'
                  }`}
                />
              </motion.button>
            );
          })}
        </div>

        {/* Submission Feedback Message */}
        <div className="h-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isSubmitting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-slate-400"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
                <span>Recording your assessment...</span>
              </motion.div>
            )}

            {!isSubmitting && submitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Thank you! Rated {rating} out of 5 stars.</span>
              </motion.div>
            )}

            {!isSubmitting && !submitted && hoverRating > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-amber-300 font-medium"
              >
                {hoverRating === 5 && '🌟 Exceptional! Perfect match'}
                {hoverRating === 4 && '👍 Great sizing recommendation'}
                {hoverRating === 3 && '👌 Fair estimate'}
                {hoverRating === 2 && '👎 Needs calibration'}
                {hoverRating === 1 && '⚠️ Inaccurate for my load'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
