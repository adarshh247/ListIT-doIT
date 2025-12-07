
import React, { useState, useEffect } from 'react';
import { AppMode, Habit, Task, ProtocolType, TaskPriority } from './types';
import { DailyTracker } from './components/DailyTracker';
import { TaskBoard } from './components/TaskBoard';
import { LayoutGrid, KanbanSquare, Terminal, User, LogOut, Check, Lock, Mail, AlertCircle } from 'lucide-react';
import { cn, Modal, Input, Button } from './components/ui';
import { supabase } from './services/supabase';
import { format } from 'date-fns';
import { arrayMove } from '@dnd-kit/sortable';

// Default Data Generators (Fallback)
const getDefaultHabits = (): Habit[] => [
  { id: '1', title: 'Deep Work (4h)', completions: {} },
  { id: '2', title: 'Physical Training', completions: {} },
  { id: '3', title: 'Zero Sugar', completions: {} }
];

const getDefaultMonthlyHabits = (): Habit[] => [
  { id: 'm1', title: 'Financial Audit', completions: {} },
  { id: 'm2', title: 'Network Review', completions: {} }
];

const getDefaultCategories = (): string[] => ['Complete It', 'Monthly', 'Yearly'];

const getDefaultTasks = (): Task[] => [
  { id: 't1', title: 'Deploy Production Build', column: 'Complete It', completed: false, priority: 'HIGH', createdAt: Date.now() },
  { id: 't2', title: 'Q3 Financial Review', column: 'Monthly', completed: false, priority: 'MEDIUM', createdAt: Date.now() },
  { id: 't3', title: 'Launch Mobile App', column: 'Yearly', completed: false, priority: 'HIGH', createdAt: Date.now() }
];

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.PROTOCOL);
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Data State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [monthlyHabits, setMonthlyHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // --- Auth & Initial Load ---
  useEffect(() => {
    if (!supabase) {
      // Fallback to local storage mode if Supabase not configured
      const user = localStorage.getItem('doit_current_user');
      setCurrentUser(user);
      loadLocalData(user);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCurrentUser(session?.user?.email || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCurrentUser(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Loading ---
  useEffect(() => {
    if (currentUser && supabase) {
      loadSupabaseData();
    } else if (!supabase) {
      loadLocalData(currentUser);
    } else {
      // Supabase is active but no user -> Clear data or show defaults
      setHabits([]);
      setMonthlyHabits([]);
      setCategories([]);
      setTasks([]);
    }
  }, [currentUser]);

  const loadLocalData = (user: string | null) => {
    const getStorageKey = (key: string) => user ? `${key}_${user}` : key;
    try {
      const h = localStorage.getItem(getStorageKey('doit_habits'));
      setHabits(h ? JSON.parse(h) : getDefaultHabits());

      const mh = localStorage.getItem(getStorageKey('doit_monthly_habits'));
      setMonthlyHabits(mh ? JSON.parse(mh) : getDefaultMonthlyHabits());

      const c = localStorage.getItem(getStorageKey('doit_categories'));
      setCategories(c ? JSON.parse(c) : getDefaultCategories());

      const t = localStorage.getItem(getStorageKey('doit_tasks'));
      setTasks(t ? JSON.parse(t) : getDefaultTasks());
    } catch (e) {
      console.error("Failed to load local data", e);
    }
  };

  const loadSupabaseData = async () => {
    if (!supabase || !session?.user) return;
    setIsLoading(true);
    try {
      // Fetch Habits
      const { data: habitsData } = await supabase.from('habits').select('*');
      if (habitsData) {
        setHabits(habitsData.filter((h: any) => h.type === 'DAILY'));
        setMonthlyHabits(habitsData.filter((h: any) => h.type === 'MONTHLY'));
      }

      // Fetch Categories
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData && catData.length > 0) {
        setCategories(catData.map((c: any) => c.name));
      } else {
        setCategories(getDefaultCategories()); // Fallback default
      }

      // Fetch Tasks
      const { data: taskData } = await supabase.from('tasks').select('*');
      if (taskData) {
        setTasks(taskData.map((t: any) => ({
           id: t.id,
           title: t.title,
           column: t.category,
           completed: t.completed,
           priority: t.priority,
           createdAt: new Date(t.created_at).getTime()
        })).sort((a: Task, b: Task) => a.createdAt - b.createdAt));
      }

    } catch (e) {
      console.error("Supabase load error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Actions ---

  const handleAuth = async () => {
    if (!supabase) {
      // Fallback local auth
      setAuthError('');
      if (!emailInput || !passwordInput) {
         setAuthError('Email and password required');
         return;
      }
      localStorage.setItem('doit_current_user', emailInput);
      setCurrentUser(emailInput);
      setIsAuthModalOpen(false);
      resetAuthForm();
      return;
    }

    setAuthError('');
    if (authMode === 'SIGN_UP') {
      const { error } = await supabase.auth.signUp({
        email: emailInput,
        password: passwordInput,
      });
      if (error) setAuthError(error.message);
      else {
        setAuthError('Check your email for confirmation link.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });
      if (error) setAuthError(error.message);
      else {
        setIsAuthModalOpen(false);
        resetAuthForm();
      }
    }
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('doit_current_user');
      setCurrentUser(null);
    }
    setIsAuthModalOpen(false);
  };

  const resetAuthForm = () => {
    setEmailInput('');
    setPasswordInput('');
    setAuthError('');
    setAuthMode('SIGN_IN');
  };

  // --- Data Handlers ---

  // HABITS
  const onAddHabit = async (title: string, type: ProtocolType) => {
    const newHabit: Habit = { id: crypto.randomUUID(), title, completions: {}, type };
    // Optimistic
    if (type === 'DAILY') setHabits(prev => [...prev, newHabit]);
    else setMonthlyHabits(prev => [...prev, newHabit]);

    if (supabase && session?.user) {
        await supabase.from('habits').insert({
            id: newHabit.id,
            user_id: session.user.id,
            title: newHabit.title,
            type: type,
            completions: {}
        });
    } else if (!supabase && currentUser) {
        // Persist Local
        saveLocalHabit(newHabit, type);
    }
  };

  const onToggleHabit = async (id: string, date: Date, type: ProtocolType) => {
    const dateKey = type === 'DAILY' ? format(date, 'yyyy-MM-dd') : format(date, 'yyyy-MM');
    
    // Find the current habit from state to calculate new state correctly
    const currentList = type === 'DAILY' ? habits : monthlyHabits;
    const habit = currentList.find(h => h.id === id);
    
    if (!habit) return;

    // Create updated completions map
    const newCompletions = { ...habit.completions };
    if (newCompletions[dateKey]) {
        delete newCompletions[dateKey];
    } else {
        newCompletions[dateKey] = true;
    }

    // Optimistic UI Update
    const updater = (prev: Habit[]) => prev.map(h => 
        h.id === id ? { ...h, completions: newCompletions } : h
    );

    if (type === 'DAILY') setHabits(updater);
    else setMonthlyHabits(updater);

    // Database Update
    if (supabase && session?.user) {
        await supabase
            .from('habits')
            .update({ completions: newCompletions })
            .eq('id', id);
    }
  };

  const onDeleteHabit = async (id: string, type: ProtocolType) => {
    if (type === 'DAILY') setHabits(prev => prev.filter(h => h.id !== id));
    else setMonthlyHabits(prev => prev.filter(h => h.id !== id));

    if (supabase && session?.user) {
        await supabase.from('habits').delete().eq('id', id);
    }
  };

  // TASKS
  const onAddTask = async (title: string, priority: TaskPriority, category: string) => {
    const newTask: Task = {
        id: crypto.randomUUID(),
        title,
        column: category,
        priority,
        completed: false,
        createdAt: Date.now()
    };
    setTasks(prev => [...prev, newTask]);

    if (supabase && session?.user) {
        await supabase.from('tasks').insert({
            id: newTask.id,
            user_id: session.user.id,
            title: newTask.title,
            category: newTask.column,
            priority: newTask.priority,
            completed: false,
            created_at: new Date(newTask.createdAt).toISOString()
        });
    }
  };

  const onUpdateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    
    if (supabase && session?.user) {
        // Map updates to DB columns
        const dbUpdates: any = {};
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
        if (updates.priority) dbUpdates.priority = updates.priority;
        if (updates.column) dbUpdates.category = updates.column;
        
        await supabase.from('tasks').update(dbUpdates).eq('id', id);
    }
  };

  const onDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (supabase && session?.user) {
        await supabase.from('tasks').delete().eq('id', id);
    }
  };

  const onToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const newCompleted = !task.completed;
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
        if (supabase && session?.user) {
            await supabase.from('tasks').update({ completed: newCompleted }).eq('id', id);
        }
    }
  };
  
  const onMoveTask = async (taskId: string, newCategory: string, newIndex: number) => {
      // For local state, we need to handle the reorder if using arrayMove
      // However, since we filter by category in TaskBoard, standard arrayMove might be tricky across categories
      // But here we receive the category change.
      
      const oldTask = tasks.find(t => t.id === taskId);
      if (!oldTask) return;

      const isSameCategory = oldTask.column === newCategory;
      
      setTasks((prevTasks) => {
          if (isSameCategory) {
              const oldIndex = prevTasks.findIndex(t => t.id === taskId);
              return arrayMove(prevTasks, oldIndex, newIndex);
          } else {
              return prevTasks.map(t => t.id === taskId ? { ...t, column: newCategory } : t);
          }
      });

      if (!isSameCategory && supabase && session?.user) {
          await supabase.from('tasks').update({ category: newCategory }).eq('id', taskId);
      }
      // Note: Reordering within same category is not persisted to DB in this version
  };

  // CATEGORIES
  const onAddCategory = async (name: string) => {
    if (categories.includes(name)) return;
    setCategories(prev => [...prev, name]);

    if (supabase && session?.user) {
        await supabase.from('categories').insert({ user_id: session.user.id, name });
    }
  };

  const onUpdateCategory = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || categories.includes(trimmed)) return;

    setCategories(prev => prev.map(c => c === oldName ? trimmed : c));
    setTasks(prev => prev.map(t => t.column === oldName ? { ...t, column: trimmed } : t));

    if (supabase && session?.user) {
        await supabase.from('categories').update({ name: trimmed }).eq('name', oldName);
        // Supabase foreign keys might handle task updates if configured, otherwise we update tasks
        await supabase.from('tasks').update({ category: trimmed }).eq('category', oldName);
    }
  };

  const onDeleteCategory = async (name: string) => {
    setCategories(prev => prev.filter(c => c !== name));
    setTasks(prev => prev.filter(t => t.column !== name));

    if (supabase && session?.user) {
        await supabase.from('categories').delete().eq('name', name);
        // Tasks cascade delete ideally, or we manual delete
        await supabase.from('tasks').delete().eq('category', name);
    }
  };

  // --- Legacy Local Storage Saver (Fallback only) ---
  const saveLocalHabit = (habit: Habit, type: ProtocolType) => {
      // This is complex to do purely functionally without effect. 
      // We rely on the generic Effect below for non-supabase mode.
  };

  useEffect(() => {
    if (!supabase && currentUser) {
       const key = currentUser ? `_${currentUser}` : '';
       localStorage.setItem(`doit_habits${key}`, JSON.stringify(habits));
       localStorage.setItem(`doit_monthly_habits${key}`, JSON.stringify(monthlyHabits));
       localStorage.setItem(`doit_categories${key}`, JSON.stringify(categories));
       localStorage.setItem(`doit_tasks${key}`, JSON.stringify(tasks));
    }
  }, [habits, monthlyHabits, categories, tasks, currentUser]);
  
  const getUserInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 selection:text-white flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-20 bg-slate-950 border-b md:border-b-0 md:border-r border-blue-900/30 flex md:flex-col items-center justify-between md:justify-start py-2 md:py-6 px-4 md:px-0 z-50 shrink-0">
        
        {/* Top Section: User & Logo */}
        <div className="flex md:flex-col items-center gap-4 md:gap-6 md:mb-8">
             {/* Logo & User Container - Row on Mobile, Stack on Desktop */}
            <div className="flex items-center md:flex-col-reverse gap-4">
                 {/* User Icon */}
                <button 
                    onClick={() => {
                        setIsAuthModalOpen(true);
                        resetAuthForm();
                    }}
                    className="group relative flex items-center justify-center order-1 md:order-2"
                    title={currentUser ? `Signed in as ${currentUser}` : "Sign In"}
                >
                    {currentUser ? (
                        <div className="w-8 h-8 rounded-full bg-blue-900/50 border border-blue-500/50 flex items-center justify-center text-[10px] font-bold tracking-tighter text-blue-200 group-hover:border-blue-400 group-hover:bg-blue-800 transition-colors">
                            {getUserInitials(currentUser)}
                        </div>
                    ) : (
                        <div className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors">
                            <User size={20} strokeWidth={1.5} />
                        </div>
                    )}
                </button>

                {/* Logo */}
                <div className="text-blue-500 order-2 md:order-1">
                   <Terminal size={32} strokeWidth={1.5} />
                </div>
            </div>
        </div>
        
        {/* Navigation Items */}
        <div className="flex md:flex-col gap-2 md:gap-6">
          <button 
            onClick={() => setMode(AppMode.PROTOCOL)}
            className={cn(
              "p-3 transition-all duration-300 relative group",
              mode === AppMode.PROTOCOL ? "text-blue-400" : "text-slate-600 hover:text-slate-300"
            )}
            title="Protocol Mode"
          >
            <LayoutGrid size={24} strokeWidth={1.5} />
            {mode === AppMode.PROTOCOL && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>

          <button 
            onClick={() => setMode(AppMode.TASKS)}
            className={cn(
              "p-3 transition-all duration-300 relative group",
              mode === AppMode.TASKS ? "text-blue-400" : "text-slate-600 hover:text-slate-300"
            )}
            title="Task Board"
          >
            <KanbanSquare size={24} strokeWidth={1.5} />
            {mode === AppMode.TASKS && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>
        </div>
        
        {/* Desktop Bottom Decoration */}
        <div className="hidden md:block mt-auto pb-4">
           <div className="w-8 h-px bg-blue-900/30 mx-auto" />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 h-[calc(100vh-60px)] md:h-screen overflow-hidden p-4 md:p-8 relative">
        {/* Background Grid Decoration */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }} 
        />
        
        {isLoading ? (
            <div className="relative z-10 h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        ) : (
            <div className="relative z-10 h-full max-w-7xl mx-auto">
              {mode === AppMode.PROTOCOL ? (
                <DailyTracker 
                  dailyHabits={habits} 
                  monthlyHabits={monthlyHabits}
                  onAddHabit={onAddHabit}
                  onToggleHabit={onToggleHabit}
                  onDeleteHabit={onDeleteHabit}
                />
              ) : (
                <TaskBoard 
                  tasks={tasks} 
                  categories={categories}
                  onAddTask={onAddTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onToggleTask={onToggleTask}
                  onMoveTask={onMoveTask}
                  onAddCategory={onAddCategory}
                  onUpdateCategory={onUpdateCategory}
                  onDeleteCategory={onDeleteCategory}
                />
              )}
            </div>
        )}
      </main>

      {/* Auth Modal */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => {
            setIsAuthModalOpen(false);
            resetAuthForm();
        }}
        title={currentUser ? "USER PROFILE" : (authMode === 'SIGN_IN' ? "SYSTEM ACCESS" : "NEW REGISTRATION")}
      >
        <div className="flex flex-col gap-6">
            {currentUser ? (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4 bg-slate-900/50 p-4 border border-blue-900/20">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-blue-900/50">
                            {getUserInitials(currentUser)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs text-slate-500 font-mono uppercase">Current User</p>
                            <p className="text-sm md:text-lg font-bold text-white truncate" title={currentUser}>{currentUser}</p>
                            {!supabase && <p className="text-[10px] text-amber-500 mt-1">OFFLINE MODE (LOCAL STORAGE)</p>}
                        </div>
                    </div>
                    <Button onClick={handleSignOut} variant="danger" className="w-full flex items-center justify-center gap-2">
                        <LogOut size={16} /> SIGN OUT
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-400">
                        {authMode === 'SIGN_IN' 
                         ? "Enter credentials to access your secure protocol." 
                         : "Create a new identity to initialize your protocol."}
                    </p>
                    
                    {authError && (
                        <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-900/50 text-red-400 text-xs">
                            <AlertCircle size={14} />
                            {authError}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-2.5 text-slate-500" />
                            <Input 
                                placeholder="Email Address" 
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                className="pl-10"
                                autoFocus
                            />
                        </div>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-2.5 text-slate-500" />
                            <Input 
                                type="password"
                                placeholder="Password" 
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                        <Button onClick={handleAuth} className="w-full flex items-center justify-center gap-2">
                            {authMode === 'SIGN_IN' ? 'ACCESS SYSTEM' : 'INITIALIZE IDENTITY'}
                        </Button>
                        
                        <div className="flex justify-center">
                            <button 
                                onClick={() => {
                                    setAuthMode(authMode === 'SIGN_IN' ? 'SIGN_UP' : 'SIGN_IN');
                                    setAuthError('');
                                }}
                                className="text-xs text-slate-500 hover:text-blue-400 transition-colors underline decoration-blue-900 underline-offset-4"
                            >
                                {authMode === 'SIGN_IN' 
                                 ? "New user? Create an account" 
                                 : "Existing user? Sign In"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </Modal>
    </div>
  );
}
