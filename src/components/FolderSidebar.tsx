import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  Zap,
  LayoutGrid,
  BookOpen,
  Star,
  Archive,
  Trash2,
  FolderPlus,
  ChevronRight,
  MoreVertical,
  Check,
  X,
  GripVertical
} from 'lucide-react';
import { Folder } from '../types';

interface FolderSidebarProps {
  folders: Folder[];
  activeFolderId: string;
  onSelectFolder: (id: string) => void;
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string) => void;
  onReorderFolders?: (folders: Folder[]) => void;
  getNoteCount: (folderId: string) => number;
}

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  folders,
  activeFolderId,
  onSelectFolder,
  onAddFolder,
  onDeleteFolder,
  onMoveNoteToFolder,
  onReorderFolders,
  getNoteCount,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const getFolderIcon = (iconType: string, isSelected: boolean) => {
    const iconClass = isSelected ? 'text-amber-400' : 'text-zinc-400';
    switch (iconType) {
      case 'quick':
        return <Zap size={15} className={iconClass} />;
      case 'canvas':
        return <LayoutGrid size={15} className={iconClass} />;
      case 'book':
        return <BookOpen size={15} className={iconClass} />;
      case 'star':
        return <Star size={15} className={iconClass} />;
      case 'archive':
        return <Archive size={15} className={iconClass} />;
      case 'trash':
        return <Trash2 size={15} className={iconClass} />;
      default:
        return <FolderIcon size={15} className={iconClass} />;
    }
  };

  return (
    <aside className="w-56 bg-[#111114] border-r border-[#222228] flex flex-col h-full select-none shrink-0">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-[#1e1e24] flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Klasörler
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-[#1c1c22] rounded transition-colors"
          title="Yeni Klasör Oluştur"
        >
          <FolderPlus size={15} />
        </button>
      </div>

      {/* New Folder Form */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-[#222228] bg-[#16161c]">
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              placeholder="Klasör adı..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-[#1e1e26] text-xs text-zinc-100 px-2 py-1.5 rounded border border-[#33333d] focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="p-1.5 text-amber-400 hover:bg-[#282834] rounded transition-colors"
              title="Kaydet"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewFolderName('');
              }}
              className="p-1.5 text-zinc-400 hover:bg-[#282834] rounded transition-colors"
              title="İptal"
            >
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {folders.map((folder) => {
          const isSelected = activeFolderId === folder.id;
          const isDragOver = dragOverFolderId === folder.id;
          const count = getNoteCount(folder.id);
          const isFolderDropTarget = dropTargetFolderId === folder.id;

          return (
            <div
              key={folder.id}
              draggable={true}
              onDragStart={(e) => {
                setDraggedFolderId(folder.id);
                e.dataTransfer.setData('application/folder-id', folder.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDraggedFolderId(null);
                setDropTargetFolderId(null);
                setDropPosition(null);
              }}
              onClick={() => onSelectFolder(folder.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer.types.includes('application/folder-id')) {
                  e.dataTransfer.dropEffect = 'move';
                  if (draggedFolderId !== folder.id) {
                    setDropTargetFolderId(folder.id);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    setDropPosition(e.clientY < midY ? 'above' : 'below');
                  }
                } else {
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverFolderId !== folder.id) {
                    setDragOverFolderId(folder.id);
                  }
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverFolderId(null);
                if (dropTargetFolderId === folder.id) {
                  setDropTargetFolderId(null);
                  setDropPosition(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const folderDragId = e.dataTransfer.getData('application/folder-id');
                const noteId = e.dataTransfer.getData('text/plain');

                setDragOverFolderId(null);
                setDropTargetFolderId(null);
                setDropPosition(null);

                if (folderDragId && onReorderFolders) {
                  if (folderDragId === folder.id) return;
                  const currentList = [...folders];
                  const fromIdx = currentList.findIndex((f) => f.id === folderDragId);
                  if (fromIdx !== -1) {
                    const [moved] = currentList.splice(fromIdx, 1);
                    const targetIdx = currentList.findIndex((f) => f.id === folder.id);
                    if (targetIdx !== -1) {
                      const finalIdx = dropPosition === 'below' ? targetIdx + 1 : targetIdx;
                      currentList.splice(finalIdx, 0, moved);
                      onReorderFolders(currentList);
                    }
                  }
                  return;
                }

                if (noteId) {
                  onMoveNoteToFolder(noteId, folder.id);
                }
              }}
              className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-100 text-xs font-medium ${
                draggedFolderId === folder.id
                  ? 'opacity-40 scale-[0.98]'
                  : isDragOver
                  ? 'ring-2 ring-amber-500 bg-amber-500/25 text-amber-200 scale-[1.02] shadow-md'
                  : isSelected
                  ? 'bg-[#22222a] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#17171d]'
              }`}
            >
              {/* Drop Insertion Line */}
              {isFolderDropTarget && dropPosition === 'above' && (
                <div className="absolute -top-0.5 left-1 right-1 h-[2px] bg-amber-400 rounded-full shadow-sm shadow-amber-400 z-20 pointer-events-none" />
              )}
              {isFolderDropTarget && dropPosition === 'below' && (
                <div className="absolute -bottom-0.5 left-1 right-1 h-[2px] bg-amber-400 rounded-full shadow-sm shadow-amber-400 z-20 pointer-events-none" />
              )}

              <div className="flex items-center gap-1.5 truncate">
                <GripVertical
                  size={12}
                  className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing -ml-1 shrink-0"
                />
                {getFolderIcon(folder.icon, isSelected || isDragOver)}
                <span className="truncate">{folder.name}</span>
              </div>

              <div className="relative flex items-center justify-end min-w-[28px] h-5 shrink-0">
                <span
                  className={`px-1.5 py-0.5 min-w-[18px] text-center text-[10px] font-mono leading-none rounded-full border transition-all duration-150 tabular-nums ${
                    !folder.isSystem ? 'group-hover:opacity-0' : ''
                  } ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold shadow-xs'
                      : count > 0
                      ? 'bg-[#1c1c24] text-zinc-300 border-[#2d2d38] group-hover:border-zinc-500/50 group-hover:text-zinc-100'
                      : 'bg-[#16161d] text-zinc-600 border-[#22222a]'
                  }`}
                >
                  {count}
                </span>

                {!folder.isSystem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(folder.id);
                    }}
                    className="absolute right-0 inset-y-0 opacity-0 group-hover:opacity-100 flex items-center justify-center p-0.5 text-zinc-400 hover:text-red-400 rounded transition-opacity"
                    title="Klasörü Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Storage & Status */}
      <div className="p-3 border-t border-[#1e1e24] text-[11px] text-zinc-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Yerel Kayıt Aktif" />
          <span className="text-[10px] text-zinc-400 font-mono tracking-tight">ocalir labs</span>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono">v1.0</span>
      </div>
    </aside>
  );
};
