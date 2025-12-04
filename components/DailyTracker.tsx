import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit } from '../types';
import { format, getDaysInMonth, getDate, isSameDay, addMonths } from 'date-fns';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight, Flame, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Modal, cn } from './ui';

// Local helpers for missing date-fns exports
const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const subDays = (date: Date, amount: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
};

interface DailyTrackerProps {
  habits: Habit[];
  setHabits: (value: Habit[] | ((val: Habit[]) => Habit[])) => void;
}

export const DailyTracker: React.FC<DailyTrackerProps> = ({ habits = [], setHabits }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const stickyColRef = useRef<HTMLDivElement>(null);

  const daysInMonth = getDaysInMonth(currentDate);
  const currentMonthStart = startOfMonth(currentDate);
  
  // Generate array of days for current month
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(currentMonthStart);
      date.setDate(i + 1);
      return date;
    });
  }, [daysInMonth, currentMonthStart]);

  // Initial scroll to current date with mobile/sticky column compensation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const target = todayRef.current;
        const stickyCol = stickyColRef.current;
        
        // Measure sticky column width dynamically or fallback to 0
        const stickyWidth = stickyCol ? stickyCol.offsetWidth : 0;
        const containerWidth = container.clientWidth;
        
        // Check if sticky column consumes significant space relative to container (mobile scenario)
        // If so, we need to center the target in the REMAINING available space, not the whole container.
        const availableWidth = Math.max(0, containerWidth - stickyWidth);
        
        if (stickyWidth > 0 && availableWidth > 0) {
          const targetLeft = target.offsetLeft;
          const targetWidth = target.offsetWidth;
          
          // Formula to center target in the available space to the right of sticky col:
          // ScrollLeft = TargetLeft + (TargetHalfWidth) - StickyWidth - (AvailableHalfWidth)
          const scrollLeft = targetLeft + (targetWidth / 2) - stickyWidth - (availableWidth / 2);
          
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        } else {
          // Standard desktop behavior or when sticky col isn't obscuring view
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }, 300); // 300ms delay to allow for rendering/layout stabilization
    return () => clearTimeout(timer);
  }, [currentDate, daysInMonth]);

  const toggleHabit = (habitId: string, date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const newCompletions = { ...h.completions };
        if (newCompletions[dateKey]) {
          delete newCompletions[dateKey];
        } else {
          newCompletions[dateKey] = true;
        }
        return { ...h, completions: newCompletions };
      }
      return h;
    }));
  };

  const addHabit = (title: string) => {
    if (!title.trim()) return;
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      title,
      completions: {}
    };
    setHabits(prev => [...prev, newHabit]);
    setNewHabitTitle('');
    setIsModalOpen(false);
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => addMonths(prev, delta));
  };

  // Calculate daily progress
  const dailyProgress = days.map(day => {
    if (!habits || habits.length === 0) return 0;
    const dateKey = format(day, 'yyyy-MM-dd');
    const completedCount = habits.filter(h => h.completions[dateKey]).length;
    return Math.round((completedCount / habits.length) * 100);
  });

  // Calculate Streak
  const getStreak = (habit: Habit) => {
    let streak = 0;
    let checkDate = new Date();
    
    // Check if completed today, if so, start count from today, otherwise from yesterday
    const todayKey = format(checkDate, 'yyyy-MM-dd');
    if (!habit.completions[todayKey]) {
      checkDate = subDays(checkDate, 1);
    }

    while (true) {
      const key = format(checkDate, 'yyyy-MM-dd');
      if (habit.completions[key]) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return streak;
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-1">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-4">
            DAILY PROTOCOL
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => changeMonth(-1)} className="text-slate-500 hover:text-blue-400 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-blue-400 text-sm font-mono min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy').toUpperCase()}
            </span>
            <button onClick={() => changeMonth(1)} className="text-slate-500 hover:text-blue-400 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> ADD HABIT
        </Button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto border border-blue-900/30 bg-slate-950/50 backdrop-blur relative custom-scrollbar">
        <div className="inline-block min-w-full align-middle">
          {/* Header Row */}
          <div className="flex sticky top-0 z-20 bg-slate-950 border-b border-blue-900/50">
            <div 
              ref={stickyColRef}
              className="sticky left-0 z-30 w-72 bg-slate-950 border-r border-blue-900/50 p-4 font-mono text-xs text-blue-300 flex items-center justify-between"
            >
              <span>TASK IDENTIFIER</span>
              <span className="text-[10px] text-slate-500">STREAK</span>
            </div>
            {days.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={day.toISOString()} 
                  ref={isToday ? todayRef : null}
                  className={cn(
                    "flex-shrink-0 w-10 h-14 flex flex-col items-center justify-center border-r border-blue-900/20 font-mono text-xs transition-colors",
                    isToday ? "bg-blue-900/40 text-blue-100 font-bold border-blue-500/30" : "text-slate-500"
                  )}
                  data-date={format(day, 'yyyy-MM-dd')}
                >
                  <span className="text-[10px] uppercase">{format(day, 'EEE')}</span>
                  <span className="text-sm">{getDate(day)}</span>
                </div>
              );
            })}
          </div>

          {/* Habits Rows */}
          <div className="divide-y divide-blue-900/20">
            <AnimatePresence>
              {habits.map((habit) => {
                const streak = getStreak(habit);
                const isDeleting = deletingHabitId === habit.id;

                return (
                  <motion.div 
                    key={habit.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex group hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="sticky left-0 z-10 w-72 bg-slate-950 border-r border-blue-900/50 p-4 flex items-center justify-between group-hover:bg-slate-900 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {isDeleting ? (
                          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
                             <button 
                                onClick={() => {
                                    deleteHabit(habit.id);
                                    setDeletingHabitId(null);
                                }}
                                className="text-red-500 hover:text-red-400 bg-red-950/50 p-1 rounded-none"
                                title="Confirm Delete"
                             >
                                <Check size={14} />
                             </button>
                             <button 
                                onClick={() => setDeletingHabitId(null)}
                                className="text-slate-400 hover:text-slate-200 bg-slate-800 p-1 rounded-none"
                                title="Cancel"
                             >
                                <X size={14} />
                             </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeletingHabitId(habit.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all"
                            title="Delete Habit"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <span className="text-sm font-medium text-slate-300 truncate">{habit.title}</span>
                      </div>
                      <div className={cn("flex items-center gap-1 text-xs font-mono", streak > 2 ? "text-orange-400" : "text-slate-600")}>
                        {streak > 0 && <span className="font-bold">{streak}</span>}
                        {streak > 0 && <Flame size={12} className={streak > 4 ? "fill-orange-400 text-orange-400 animate-pulse" : ""} />}
                      </div>
                    </div>
                    {days.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const isCompleted = habit.completions[dateKey];
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div 
                          key={day.toISOString()} 
                          className={cn(
                            "flex-shrink-0 w-10 h-12 border-r border-blue-900/20 flex items-center justify-center cursor-pointer transition-all duration-200 relative",
                            isToday && !isCompleted && "bg-blue-900/10",
                            isCompleted && "bg-blue-600/10"
                          )}
                          onClick={() => toggleHabit(habit.id, day)}
                        >
                          {isToday && <div className="absolute inset-0 border-2 border-blue-500/20 pointer-events-none" />}
                          <div className={cn(
                            "w-5 h-5 border border-blue-900/50 flex items-center justify-center transition-all duration-300",
                            isCompleted ? "bg-blue-600 border-blue-500 scale-100" : "bg-transparent scale-90 opacity-50 group-hover:opacity-100"
                          )}>
                             {isCompleted && <Check size={14} className="text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Footer Progress Row */}
          <div className="flex sticky bottom-0 z-20 bg-slate-950 border-t border-blue-900/50 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
            <div className="sticky left-0 z-30 w-72 bg-slate-950 border-r border-blue-900/50 p-4 font-mono text-xs text-blue-300 flex items-center">
              DAILY COMPLETION RATE
            </div>
            {dailyProgress.map((prog, idx) => {
               const day = days[idx];
               const isToday = isSameDay(day, new Date());
               return (
                <div 
                  key={`prog-${idx}`} 
                  className={cn(
                    "flex-shrink-0 w-10 h-12 border-r border-blue-900/20 flex flex-col justify-end pb-1 items-center relative group",
                    isToday ? "bg-blue-900/10" : ""
                  )}
                >
                  <div 
                    className="w-full bg-blue-600/30 absolute bottom-0 left-0 transition-all duration-500"
                    style={{ height: `${prog}%` }}
                  />
                  <span className="text-[10px] font-mono text-white z-10 mix-blend-difference opacity-70 group-hover:opacity-100">{prog}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Initialize New Protocol"
      >
        <div className="flex flex-col gap-4">
          <Input 
            placeholder="Enter habit name..." 
            value={newHabitTitle}
            onChange={(e) => setNewHabitTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit(newHabitTitle)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button onClick={() => addHabit(newHabitTitle)}>CONFIRM</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};