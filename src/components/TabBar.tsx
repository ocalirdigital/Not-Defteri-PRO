import React from 'react';
import { FileText, LayoutGrid, Plus, X, Pin } from 'lucide-react';
import { Note } from '../types';

interface TabBarProps {
  openTabs: string[];
  activeNoteId: string | null;
  notesMap: Map<string, Note>;
  activeFolderId?: string;
  onSelectTab: (noteId: string) => void;
  onCloseTab: (noteId: string, e: React.MouseEvent) => void;
  onNewPage: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  openTabs,
  activeNoteId,
  notesMap,
  activeFolderId,
  onSelectTab,
  onCloseTab,
  onNewPage,
}) => {
  return (
    <div className="h-9 bg-[#111114] border-b border-[#222228] flex items-center px-2 gap-1 overflow-x-auto select-none shrink-0 no-scrollbar">
      {openTabs.map((noteId) => {
        const note = notesMap.get(noteId);
        if (!note) return null;
        if (activeFolderId !== 'trash' && note.folderId === 'trash') return null;

        const isActive = activeNoteId === noteId;
        const isCanvas = note.viewMode === 'canvas';

        return (
          <div
            key={noteId}
            onClick={() => onSelectTab(noteId)}
            className={`group relative flex items-center gap-2 px-3 py-1.5 text-xs rounded-t-md cursor-pointer transition-all border-t-2 max-w-[200px] shrink-0 ${
              isActive
                ? 'bg-[#18181e] text-zinc-100 border-amber-500 font-medium shadow-sm'
                : 'bg-[#131317] text-zinc-400 hover:text-zinc-200 hover:bg-[#16161b] border-transparent'
            }`}
          >
            {isCanvas ? (
              <LayoutGrid
                size={13}
                className={isActive ? 'text-amber-400' : 'text-zinc-500'}
              />
            ) : (
              <FileText
                size={13}
                className={isActive ? 'text-amber-400' : 'text-zinc-500'}
              />
            )}

            <span className="truncate flex-1">
              {note.title || 'Yeni Sayfa'}
            </span>

            {note.isPinned && (
              <Pin size={10} className="text-amber-400 fill-amber-400 shrink-0" />
            )}

            <button
              onClick={(e) => onCloseTab(noteId, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-opacity shrink-0"
              title="Sekmeyi Kapat"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      {/* New Page / Tab Button */}
      <button
        onClick={onNewPage}
        className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#1c1c23] rounded-md transition-colors shrink-0 ml-1"
        title="Yeni Sayfa Aç (Ctrl+N)"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};
