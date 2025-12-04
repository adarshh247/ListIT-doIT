import React, { useState, useEffect } from 'react';
import { AppMode, Habit, Task } from './types';
import { DailyTracker } from './components/DailyTracker';
import { TaskBoard } from './components/TaskBoard';
import { LayoutGrid, KanbanSquare, Terminal } from 'lucide-react';
import { cn } from './components/ui';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.DAILY);
  
  // Initialize Habits state
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem('doit_habits');
      return saved ? JSON.parse(saved) : [
        { id: '1', title: 'Deep Work (4h)', completions: {} },
        { id: '2', title: 'Physical Training', completions: {} },
        { id: '3', title: 'Zero Sugar', completions: {} }
      ];
    } catch (e) {
      return [];
    }
  });

  // Initialize Tasks state
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('doit_tasks');
      return saved ? JSON.parse(saved) : [
        { id: 't1', title: 'Deploy Production Build', column: 'COMPLETE_IT', completed: false, priority: 'HIGH', createdAt: Date.now() },
        { id: 't2', title: 'Q3 Financial Review', column: 'MONTHLY', completed: false, priority: 'MEDIUM', createdAt: Date.now() },
        { id: 't3', title: 'Launch Mobile App', column: 'YEARLY', completed: false, priority: 'HIGH', createdAt: Date.now() }
      ];
    } catch (e) {
      return [];
    }
  });

  // Persist Habits
  useEffect(() => {
    localStorage.setItem('doit_habits', JSON.stringify(habits));
  }, [habits]);

  // Persist Tasks
  useEffect(() => {
    localStorage.setItem('doit_tasks', JSON.stringify(tasks));
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 selection:text-white flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-20 bg-slate-950 border-b md:border-b-0 md:border-r border-blue-900/30 flex md:flex-col items-center justify-between md:justify-start py-2 md:py-6 px-4 md:px-0 z-50 shrink-0">
        <div className="mb-0 md:mb-8 text-blue-500">
           <Terminal size={32} strokeWidth={1.5} />
        </div>
        
        <div className="flex md:flex-col gap-2 md:gap-6">
          <button 
            onClick={() => setMode(AppMode.DAILY)}
            className={cn(
              "p-3 transition-all duration-300 relative group",
              mode === AppMode.DAILY ? "text-blue-400" : "text-slate-600 hover:text-slate-300"
            )}
            title="Daily Protocol"
          >
            <LayoutGrid size={24} strokeWidth={1.5} />
            {mode === AppMode.DAILY && (
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
        
        <div className="relative z-10 h-full max-w-7xl mx-auto">
          {mode === AppMode.DAILY ? (
            <DailyTracker 
              habits={habits} 
              setHabits={setHabits} 
            />
          ) : (
            <TaskBoard 
              tasks={tasks} 
              setTasks={setTasks} 
            />
          )}
        </div>
      </main>
    </div>
  );
}