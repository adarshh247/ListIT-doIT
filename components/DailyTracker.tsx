
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit, ProtocolType } from '../types';
import { format, getDaysInMonth, getDate, isSameDay, addMonths, addYears, getMonth } from 'date-fns';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight, Flame, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Modal, cn } from './ui';

// Local helpers
const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfYear = (date: Date) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear(), 0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const subDays = (date: Date, amount: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
};

const subMonths = (date: Date, amount: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() - amount);
    return d;
};

interface ProtocolTrackerProps {
  dailyHabits: Habit[];
  monthlyHabits: Habit[];
  onAddHabit: (title: string, type: ProtocolType) => void;
  onToggleHabit: (id: string, date: Date, type: ProtocolType) => void;
  onDeleteHabit: (id: string, type: ProtocolType) => void;
}

export const DailyTracker: React.FC<ProtocolTrackerProps> = ({ 
  dailyHabits = [], 
  monthlyHabits = [],
  onAddHabit,
  onToggleHabit,
  onDeleteHabit
}) => {
  const [protocolMode, setProtocolMode] = useState<ProtocolType>('DAILY');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  
  // Date states
  const [currentDate, setCurrentDate] = useState(new Date()); // Used for Month in Daily, Year in Monthly
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const stickyColRef = useRef<HTMLDivElement>(null);

  // --- Derived Data for DAILY ---
  const daysInMonth = getDaysInMonth(currentDate);
  const currentMonthStart = startOfMonth(currentDate);
  
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(currentMonthStart);
      date.setDate(i + 1);
      return date;
    });
  }, [daysInMonth, currentMonthStart]);

  // --- Derived Data for MONTHLY ---
  const months = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    return Array.from({ length: 12 }, (_, i) => {
      return addMonths(yearStart, i);
    });
  }, [currentDate]);


  // Scroll logic
  useEffect(() => {
    // Logic runs for both DAILY and MONTHLY modes to center the current item
    const timer = setTimeout(() => {
      if (todayRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const target = todayRef.current;
        const stickyCol = stickyColRef.current;
        
        const stickyWidth = stickyCol ? stickyCol.offsetWidth : 0;
        const containerWidth = container.clientWidth;
        const availableWidth = Math.max(0, containerWidth - stickyWidth);
        
        if (stickyWidth > 0 && availableWidth > 0) {
          const targetLeft = target.offsetLeft;
          const targetWidth = target.offsetWidth;
          const scrollLeft = targetLeft + (targetWidth / 2) - stickyWidth - (availableWidth / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentDate, protocolMode]);

  const handleAddHabit = () => {
    if (!newHabitTitle.trim()) return;
    onAddHabit(newHabitTitle, protocolMode);
    setNewHabitTitle('');
    setIsModalOpen(false);
  };

  const navigateDate = (delta: number) => {
    if (protocolMode === 'DAILY') {
      setCurrentDate(prev => addMonths(prev, delta));
    } else {
      setCurrentDate(prev => addYears(prev, delta));
    }
  };

  // Logic Selectors
  const currentHabits = protocolMode === 'DAILY' ? dailyHabits : monthlyHabits;
  const currentColumns = protocolMode === 'DAILY' ? days : months;
  const dateFormat = protocolMode === 'DAILY' ? 'yyyy-MM-dd' : 'yyyy-MM';

  // Calculate Progress
  const calculateProgress = () => {
    return currentColumns.map(colDate => {
      if (!currentHabits || currentHabits.length === 0) return 0;
      const dateKey = format(colDate, dateFormat);
      const completedCount = currentHabits.filter(h => h.completions[dateKey]).length;
      return Math.round((completedCount / currentHabits.length) * 100);
    });
  };

  const dailyProgress = calculateProgress();

  // Calculate Streak
  const getStreak = (habit: Habit) => {
    let streak = 0;
    let checkDate = new Date(); // Start checking from now
    
    // For Monthly, check if current month is done, if not start from last month
    // For Daily, check if today is done, if not start from yesterday
    
    const isDaily = protocolMode === 'DAILY';
    const currentKey = format(checkDate, dateFormat);
    
    if (!habit.completions[currentKey]) {
        checkDate = isDaily ? subDays(checkDate, 1) : subMonths(checkDate, 1);
    }

    while (true) {
      const key = format(checkDate, dateFormat);
      if (habit.completions[key]) {
        streak++;
        checkDate = isDaily ? subDays(checkDate, 1) : subMonths(checkDate, 1);
      } else {
        break;
      }
    }
    return streak;
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 mb-6 px-1 border-b border-blue-900/30 pb-4">
        {/* Tab Switcher */}
        <div className="flex gap-6">
            <button 
            onClick={() => setProtocolMode('DAILY')}
            className={cn(
                "text-sm font-bold tracking-widest transition-colors relative pb-1",
                protocolMode === 'DAILY' ? "text-white" : "text-slate-500 hover:text-slate-300"
            )}
            >
            DAILY PROTOCOL
            {protocolMode === 'DAILY' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" />}
            </button>
            <button 
            onClick={() => setProtocolMode('MONTHLY')}
            className={cn(
                "text-sm font-bold tracking-widest transition-colors relative pb-1",
                protocolMode === 'MONTHLY' ? "text-white" : "text-slate-500 hover:text-slate-300"
            )}
            >
            MONTHLY PROTOCOL
            {protocolMode === 'MONTHLY' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" />}
            </button>
        </div>

        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button onClick={() => navigateDate(-1)} className="text-slate-500 hover:text-blue-400 transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <span className="text-blue-400 text-sm font-mono min-w-[140px] text-center">
                    {protocolMode === 'DAILY' 
                    ? format(currentDate, 'MMMM yyyy').toUpperCase()
                    : format(currentDate, 'yyyy').toUpperCase()
                    }
                </span>
                <button onClick={() => navigateDate(1)} className="text-slate-500 hover:text-blue-400 transition-colors">
                    <ChevronRight size={18} />
                </button>
            </div>
            
            <div className="flex justify-end flex-1">
              <Button onClick={() => setIsModalOpen(true)} size="sm" className="flex items-center gap-2">
                  <Plus size={16} /> ADD ITEM
              </Button>
            </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto border border-blue-900/30 bg-slate-950/50 backdrop-blur relative custom-scrollbar">
        <div className="inline-block min-w-full align-middle">
          {/* Header Row */}
          <div className="flex sticky top-0 z-20 bg-slate-950 border-b border-blue-900/50">
            <div 
              ref={stickyColRef}
              className="sticky left-0 z-30 w-72 bg-slate-950 border-r border-blue-900/50 p-4 font-mono text-xs text-blue-300 flex items-center justify-between shadow-[4px_0_10px_rgba(0,0,0,0.5)]"
            >
              <span>{protocolMode === 'DAILY' ? 'HABIT IDENTIFIER' : 'MONTHLY OBJECTIVE'}</span>
              <span className="text-[10px] text-slate-500">STREAK</span>
            </div>
            {currentColumns.map((dateItem) => {
              const isToday = protocolMode === 'DAILY' 
                ? isSameDay(dateItem, new Date()) 
                : (getMonth(dateItem) === getMonth(new Date()) && dateItem.getFullYear() === new Date().getFullYear());
              
              return (
                <div 
                  key={dateItem.toISOString()} 
                  ref={isToday ? todayRef : null}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center border-r border-blue-900/20 font-mono text-xs transition-colors",
                    protocolMode === 'DAILY' ? "w-10 h-14" : "w-24 h-14",
                    isToday ? "bg-blue-900/40 text-blue-100 font-bold border-blue-500/30" : "text-slate-500"
                  )}
                >
                  {protocolMode === 'DAILY' ? (
                    <>
                        <span className="text-[10px] uppercase">{format(dateItem, 'EEE')}</span>
                        <span className="text-sm">{getDate(dateItem)}</span>
                    </>
                  ) : (
                    <span className="text-sm uppercase">{format(dateItem, 'MMM')}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Habits Rows */}
          <div className="divide-y divide-blue-900/20">
            <AnimatePresence>
              {currentHabits.map((habit) => {
                const streak = getStreak(habit);
                const isDeleting = deletingHabitId === habit.id;

                return (
                  <motion.div 
                    layout
                    key={habit.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex group hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="sticky left-0 z-10 w-72 bg-slate-950 border-r border-blue-900/50 p-4 flex items-center justify-between group-hover:bg-slate-900 transition-colors shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className="relative w-14 h-6 flex-shrink-0">
                             <AnimatePresence mode="popLayout" initial={false}>
                                {isDeleting ? (
                                  <motion.div 
                                    key="confirm"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute inset-0 flex items-center gap-1"
                                  >
                                     <button 
                                        onClick={() => {
                                            onDeleteHabit(habit.id, protocolMode);
                                            setDeletingHabitId(null);
                                        }}
                                        className="text-red-500 hover:text-red-400 bg-red-950/50 p-1 rounded-none flex items-center justify-center w-6 h-6"
                                        title="Confirm Delete"
                                     >
                                        <Check size={14} />
                                     </button>
                                     <button 
                                        onClick={() => setDeletingHabitId(null)}
                                        className="text-slate-400 hover:text-slate-200 bg-slate-800 p-1 rounded-none flex items-center justify-center w-6 h-6"
                                        title="Cancel"
                                     >
                                        <X size={14} />
                                     </button>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="delete"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex items-center"
                                  >
                                      <button 
                                        onClick={() => setDeletingHabitId(habit.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all p-1"
                                        title="Delete Item"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                  </motion.div>
                                )}
                             </AnimatePresence>
                        </div>
                        <span className="text-sm font-medium text-slate-300 truncate">{habit.title}</span>
                      </div>
                      <div className={cn("flex items-center gap-1 text-xs font-mono pl-2", streak > 2 ? "text-orange-400" : "text-slate-600")}>
                        {streak > 0 && <span className="font-bold">{streak}</span>}
                        {streak > 0 && <Flame size={12} className={streak > 4 ? "fill-orange-400 text-orange-400 animate-pulse" : ""} />}
                      </div>
                    </div>
                    {currentColumns.map((dateItem) => {
                      const dateKey = format(dateItem, dateFormat);
                      const isCompleted = habit.completions[dateKey];
                      const isToday = protocolMode === 'DAILY' 
                        ? isSameDay(dateItem, new Date()) 
                        : (getMonth(dateItem) === getMonth(new Date()) && dateItem.getFullYear() === new Date().getFullYear());
                      
                      return (
                        <div 
                          key={dateItem.toISOString()} 
                          className={cn(
                            "flex-shrink-0 border-r border-blue-900/20 flex items-center justify-center cursor-pointer transition-all duration-200 relative",
                            protocolMode === 'DAILY' ? "w-10 h-12" : "w-24 h-12",
                            isToday && !isCompleted && "bg-blue-900/10",
                            isCompleted && "bg-blue-600/10"
                          )}
                          onClick={() => onToggleHabit(habit.id, dateItem, protocolMode)}
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
            <div className="sticky left-0 z-30 w-72 bg-slate-950 border-r border-blue-900/50 p-4 font-mono text-xs text-blue-300 flex items-center shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
              {protocolMode === 'DAILY' ? 'DAILY COMPLETION RATE' : 'MONTHLY COMPLETION RATE'}
            </div>
            {dailyProgress.map((prog, idx) => {
               const dateItem = currentColumns[idx];
               const isToday = protocolMode === 'DAILY' 
                    ? isSameDay(dateItem, new Date()) 
                    : (getMonth(dateItem) === getMonth(new Date()) && dateItem.getFullYear() === new Date().getFullYear());
               
               return (
                <div 
                  key={`prog-${idx}`} 
                  className={cn(
                    "flex-shrink-0 border-r border-blue-900/20 flex flex-col justify-end pb-1 items-center relative group",
                    protocolMode === 'DAILY' ? "w-10 h-12" : "w-24 h-12",
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
        title={`Initialize ${protocolMode === 'DAILY' ? 'Daily' : 'Monthly'} Protocol`}
      >
        <div className="flex flex-col gap-4">
          <Input 
            placeholder={protocolMode === 'DAILY' ? "E.g., Deep Work (4h)..." : "E.g., Financial Audit..."}
            value={newHabitTitle}
            onChange={(e) => setNewHabitTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button onClick={handleAddHabit}>CONFIRM</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
