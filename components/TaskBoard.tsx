import React, { useState } from 'react';
import { Task, TaskColumn, TaskPriority } from '../types';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Modal, cn } from './ui';
import { Check, GripHorizontal, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface TaskBoardProps {
  tasks: Task[];
  setTasks: (value: Task[] | ((val: Task[]) => Task[])) => void;
}

const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const colors = {
    HIGH: 'text-red-400 bg-red-950/30 border-red-900/50',
    MEDIUM: 'text-amber-400 bg-amber-950/30 border-amber-900/50',
    LOW: 'text-blue-300 bg-blue-950/30 border-blue-900/50'
  };

  return (
    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 border uppercase", colors[priority])}>
      {priority}
    </span>
  );
};

const SortableTaskItem = ({ task, onDelete, onToggle }: { task: Task; onDelete: (id: string) => void; onToggle: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative p-4 bg-slate-900/50 border border-blue-900/30 flex gap-4 items-center select-none touch-none hover:border-blue-500/50 transition-colors",
        isDragging ? "opacity-30" : "opacity-100",
        task.completed ? "opacity-60" : ""
      )}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-blue-400 transition-colors"
      >
        <GripHorizontal size={16} />
      </div>
      
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "w-5 h-5 flex-shrink-0 border flex items-center justify-center transition-all",
          task.completed 
            ? "bg-blue-600 border-blue-500 text-white" 
            : "border-slate-600 text-transparent hover:border-blue-400"
        )}
      >
        <Check size={12} />
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
           <p className={cn(
            "text-sm text-slate-200 font-medium transition-all truncate",
            task.completed && "line-through text-slate-500"
          )}>
            {task.title}
          </p>
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      <button 
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-2"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks = [], setTasks }) => {
  const [activeTab, setActiveTab] = useState<TaskColumn>('COMPLETE_IT');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('MEDIUM');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
       const oldIndex = tasks.findIndex(t => t.id === active.id);
       const newIndex = tasks.findIndex(t => t.id === over.id);
       setTasks((items) => arrayMove(items, oldIndex, newIndex));
    }
    setActiveId(null);
  };

  const addTask = (title: string, priority: TaskPriority) => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      column: activeTab,
      completed: false,
      priority,
      createdAt: Date.now()
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setNewTaskPriority('MEDIUM');
    setIsModalOpen(false);
  };

  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const filteredTasks = tasks.filter(t => t.column === activeTab);
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Title */}
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">MISSION CONTROL</h2>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm" className="flex items-center gap-2">
            <Plus size={14} /> NEW DIRECTIVE
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-blue-900/30">
        {(['COMPLETE_IT', 'MONTHLY', 'YEARLY'] as TaskColumn[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 text-sm font-mono tracking-widest font-bold uppercase transition-all relative",
              activeTab === tab 
                ? "text-white bg-slate-900/50" 
                : "text-slate-500 hover:text-blue-300 hover:bg-slate-900/30"
            )}
          >
            {tab.replace('_', ' ')}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCorners} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
        >
          <div className="space-y-3 pb-8">
            <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {filteredTasks.map(task => (
                <SortableTaskItem key={task.id} task={task} onDelete={deleteTask} onToggle={toggleTask} />
              ))}
            </SortableContext>
            
            {filteredTasks.length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center text-slate-700 border border-dashed border-slate-800 bg-slate-950/30">
                    <p className="font-mono text-xs uppercase tracking-widest mb-2">No Active Directives</p>
                    <p className="text-sm text-slate-800">Assign new tasks to proceed</p>
                </div>
            )}
          </div>

          <DragOverlay>
             {activeTask ? (
                <div className="p-4 bg-slate-800 border border-blue-500 shadow-2xl opacity-90 cursor-grabbing w-full">
                   <div className="flex items-center gap-2">
                       <GripHorizontal size={16} className="text-blue-400"/>
                       <p className="text-sm text-white font-medium">{activeTask.title}</p>
                   </div>
                </div>
             ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`ADD TO ${activeTab.replace('_', ' ')}`}
      >
        <div className="flex flex-col gap-4">
          <Input 
            placeholder="Describe directive..." 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask(newTaskTitle, newTaskPriority)}
            autoFocus
          />
          
          <div className="flex gap-2 mb-2">
             {(['HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]).map(p => (
                 <button 
                    key={p}
                    onClick={() => setNewTaskPriority(p)}
                    className={cn(
                        "flex-1 py-2 text-xs font-mono uppercase border transition-all",
                        newTaskPriority === p 
                            ? "bg-blue-900/40 border-blue-500 text-white" 
                            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600"
                    )}
                 >
                    {p}
                 </button>
             ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={() => addTask(newTaskTitle, newTaskPriority)}>CONFIRM</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};