import React, { useState, useEffect } from 'react';
import { Task, TaskPriority } from '../types';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Modal, cn } from './ui';
import { Check, GripHorizontal, Plus, Trash2, Menu, Pencil, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskBoardProps {
  tasks: Task[];
  setTasks: (value: Task[] | ((val: Task[]) => Task[])) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  onUpdateCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
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

interface SortableTaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  isDeleting: boolean;
  onInitiateDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}

const SortableTaskItem = ({ task, onToggle, isDeleting, onInitiateDelete, onConfirmDelete, onCancelDelete }: SortableTaskItemProps) => {
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

      <AnimatePresence mode="wait">
        {isDeleting ? (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1 ml-2"
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onConfirmDelete(task.id);
                    }}
                    className="text-red-500 hover:text-red-400 bg-red-950/50 p-1.5 rounded-sm"
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Confirm Delete"
                >
                    <Check size={14} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCancelDelete();
                    }}
                    className="text-slate-400 hover:text-slate-200 bg-slate-800 p-1.5 rounded-sm"
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Cancel"
                >
                    <X size={14} />
                </button>
            </motion.div>
        ) : (
            <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                    e.stopPropagation();
                    onInitiateDelete(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-2"
                onPointerDown={(e) => e.stopPropagation()}
                title="Delete Task"
            >
                <Trash2 size={14} />
            </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks = [], setTasks, categories, onAddCategory, onUpdateCategory, onDeleteCategory }) => {
  const [activeTab, setActiveTab] = useState<string>(categories[0] || '');
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Category Management State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Ensure active tab exists in categories
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeTab)) {
      setActiveTab(categories[0]);
    } else if (!activeTab && categories.length > 0) {
      setActiveTab(categories[0]);
    }
  }, [categories, activeTab]);

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
    setIsTaskModalOpen(false);
  };

  const handleAddCategory = (name: string) => {
    if (!name.trim()) return;
    onAddCategory(name.trim());
    setActiveTab(name.trim());
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
  };

  const startEdit = (category: string) => {
    setEditingCategory(category);
    setDeletingCategory(null);
    setEditValue(category);
  };

  const saveEdit = (oldName: string) => {
    if (editValue.trim() !== oldName) {
      onUpdateCategory(oldName, editValue);
    }
    setEditingCategory(null);
    setEditValue('');
  };

  const confirmDeleteCategory = (category: string) => {
    onDeleteCategory(category);
    setDeletingCategory(null);
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
        <div className="flex items-center gap-2">
            <Button 
                onClick={() => setIsManageModalOpen(true)} 
                size="icon" 
                variant="secondary"
                title="Manage Sectors"
            >
                <Menu size={18} />
            </Button>
            <Button onClick={() => setIsTaskModalOpen(true)} size="sm" className="flex items-center gap-2">
                <Plus size={14} /> NEW DIRECTIVE
            </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center mb-4 border-b border-blue-900/30">
        <div className="flex overflow-x-auto custom-scrollbar no-scrollbar gap-1 max-w-full">
          {categories.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 text-sm font-mono tracking-widest font-bold uppercase transition-all relative flex-shrink-0 whitespace-nowrap",
                activeTab === tab 
                  ? "text-white bg-slate-900/50" 
                  : "text-slate-500 hover:text-blue-300 hover:bg-slate-900/30"
              )}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                />
              )}
            </button>
          ))}
          
          {/* Add Category Button */}
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-4 py-3 text-slate-600 hover:text-blue-400 hover:bg-slate-900/30 transition-colors flex items-center justify-center border-l border-blue-900/20"
            title="Add Category"
          >
            <Plus size={16} />
          </button>
        </div>
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
                <SortableTaskItem 
                  key={task.id} 
                  task={task} 
                  onToggle={toggleTask}
                  isDeleting={deletingTaskId === task.id}
                  onInitiateDelete={setDeletingTaskId}
                  onConfirmDelete={(id) => {
                    deleteTask(id);
                    setDeletingTaskId(null);
                  }}
                  onCancelDelete={() => setDeletingTaskId(null)}
                />
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

      {/* Add Task Modal */}
      <Modal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        title={`ADD TO ${activeTab.toUpperCase()}`}
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

      {/* Add Category Modal */}
      <Modal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        title="NEW SECTOR"
      >
        <div className="flex flex-col gap-4">
          <Input 
            placeholder="Sector Name..." 
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory(newCategoryName)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button onClick={() => handleAddCategory(newCategoryName)}>INITIALIZE</Button>
          </div>
        </div>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => {
            setIsManageModalOpen(false);
            setEditingCategory(null);
            setDeletingCategory(null);
        }}
        title="MANAGE SECTORS"
      >
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {categories.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No sectors available.</p>
            ) : (
                categories.map((cat) => (
                    <motion.div 
                        key={cat} 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex items-center justify-between p-3 border transition-colors",
                          deletingCategory === cat 
                            ? "bg-red-950/20 border-red-900/40" 
                            : "bg-slate-900/30 border-blue-900/20 hover:bg-slate-900/50"
                        )}
                    >
                        {editingCategory === cat ? (
                            <div className="flex items-center gap-2 w-full animate-in fade-in">
                                <Input 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-8 text-sm py-1"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(cat)}
                                />
                                <button onClick={() => saveEdit(cat)} className="text-green-500 hover:text-green-400 p-1">
                                    <Check size={16}/>
                                </button>
                                <button onClick={() => setEditingCategory(null)} className="text-red-500 hover:text-red-400 p-1">
                                    <X size={16}/>
                                </button>
                            </div>
                        ) : deletingCategory === cat ? (
                            <div className="flex items-center justify-between w-full animate-in fade-in">
                                <span className="font-mono text-sm text-red-400 font-bold flex items-center gap-2">
                                  <AlertTriangle size={14} /> DELETE?
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => confirmDeleteCategory(cat)} 
                                      className="text-red-500 hover:text-red-400 bg-red-950/50 p-1.5 rounded-sm"
                                    >
                                        <Check size={14}/>
                                    </button>
                                    <button 
                                      onClick={() => setDeletingCategory(null)} 
                                      className="text-slate-500 hover:text-slate-300 bg-slate-900 p-1.5 rounded-sm"
                                    >
                                        <X size={14}/>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span className="font-mono text-sm text-slate-300 truncate mr-2">{cat}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button 
                                        onClick={() => startEdit(cat)} 
                                        className="text-slate-600 hover:text-blue-400 p-1 transition-colors"
                                        title="Rename Sector"
                                    >
                                        <Pencil size={14}/>
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingCategory(cat);
                                        }} 
                                        className="text-slate-600 hover:text-red-400 p-1 transition-colors cursor-pointer"
                                        title="Delete Sector"
                                        type="button"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                ))
            )}
        </div>
        <div className="mt-4 pt-4 border-t border-blue-900/20 text-xs text-slate-600 text-center font-mono">
            Modifying sectors will update all associated directives.
        </div>
      </Modal>
    </div>
  );
};