import { Lock, LogIn, X } from 'lucide-react';
import { motion } from 'motion/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { emailSignIn, emailSignUp } from '../../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onLogin,
}: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setError(null);
      setLoading(false);
      setIsSignUp(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await emailSignUp(email.trim(), password, name.trim() || undefined);
      } else {
        await emailSignIn(email.trim(), password);
      }
      onClose();
    } catch (err: any) {
      console.error('Email auth error:', err);
      setError(
        err.message || 'Authentication failed. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await onLogin();
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Google authentication failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm"
      />

      {/* Modal card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', duration: 0.35 }}
        className="relative bg-tj-bg-card rounded-2xl border border-tj-border-main shadow-2xl max-w-sm w-full p-6 space-y-4 overflow-hidden z-10"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-tj-bg-recessed text-tj-text-muted rounded-full cursor-pointer transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-3">
          {/* Header Icon & Title */}
          <div className="flex flex-col items-center text-center space-y-2 pt-1">
            <div className="p-2.5 bg-tj-primary-light dark:bg-tj-primary-light/20 text-tj-primary rounded-2xl border border-tj-primary-border/60">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-tj-text-main font-sans tracking-tight">
                Unlock Your Bookshelf
              </h3>
              <p className="text-[11px] text-tj-text-muted leading-normal font-medium px-2">
                Sign in or create a free account to track reading history,
                bookshelves, and vocab.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-tj-border-main text-xs select-none">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`flex-1 pb-2 font-bold transition-all border-b-2 bg-transparent border-0 cursor-pointer ${
                !isSignUp
                  ? 'border-tj-primary text-tj-text-main font-sans'
                  : 'border-transparent text-tj-text-muted hover:text-tj-text-main font-sans'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`flex-1 pb-2 font-bold transition-all border-b-2 bg-transparent border-0 cursor-pointer ${
                isSignUp
                  ? 'border-tj-primary text-tj-text-main font-sans'
                  : 'border-transparent text-tj-text-muted hover:text-tj-text-main font-sans'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <div className="space-y-1">
                <label
                  htmlFor="auth-modal-name"
                  className="block text-[9px] font-mono uppercase tracking-wider text-tj-text-muted font-bold"
                >
                  Name
                </label>
                <input
                  id="auth-modal-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-3 py-2 bg-transparent border border-tj-border-main rounded-xl text-xs text-tj-text-main focus:border-tj-primary focus:outline-none focus:ring-0"
                />
              </div>
            )}
            <div className="space-y-1">
              <label
                htmlFor="auth-modal-email"
                className="block text-[9px] font-mono uppercase tracking-wider text-tj-text-muted font-bold"
              >
                Email Address
              </label>
              <input
                id="auth-modal-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 bg-transparent border border-tj-border-main rounded-xl text-xs text-tj-text-main focus:border-tj-primary focus:outline-none focus:ring-0"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="auth-modal-password"
                className="block text-[9px] font-mono uppercase tracking-wider text-tj-text-muted font-bold"
              >
                Password
              </label>
              <input
                id="auth-modal-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-transparent border border-tj-border-main rounded-xl text-xs text-tj-text-main focus:border-tj-primary focus:outline-none focus:ring-0"
              />
            </div>

            {error && (
              <p className="text-[10px] text-tj-error font-semibold leading-relaxed bg-rose-50 dark:bg-rose-955/20 border border-red-200 dark:border-red-900/30 p-2.5 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Loading...</span>
              ) : (
                <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1.5 items-center">
            <div className="flex-grow border-t border-tj-border-main/50"></div>
            <span className="flex-shrink mx-3 text-[9px] font-bold text-tj-text-muted uppercase tracking-wider">
              Or
            </span>
            <div className="flex-grow border-t border-tj-border-main/50"></div>
          </div>

          {/* Google Sign In option */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 border border-tj-border-main hover:bg-tj-bg-recessed text-tj-text-main font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-transparent"
          >
            <LogIn className="w-3.5 h-3.5 text-tj-text-muted" />
            <span>Continue with Google</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
