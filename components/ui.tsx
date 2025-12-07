import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, HTMLMotionProps } from 'framer-motion';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-500 border border-transparent',
      secondary: 'bg-slate-900 text-blue-100 border border-blue-900/50 hover:bg-slate-800 hover:border-blue-700',
      ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5',
      danger: 'bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/50'
    };
    
    const sizes = {
      sm: 'px-3 py-1 text-xs',
      md: 'px-5 py-2.5 text-sm',
      icon: 'p-2'
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'rounded-none font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'bg-slate-950 border border-blue-900/30 text-white px-4 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors w-full rounded-none',
          className
        )}
        {...props}
      />
    );
  }
);

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-950 border border-blue-900 w-full max-w-md shadow-2xl shadow-blue-900/20"
      >
        <div className="flex justify-between items-center p-4 border-b border-blue-900/30">
          <h3 className="text-lg font-bold text-blue-50 uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};