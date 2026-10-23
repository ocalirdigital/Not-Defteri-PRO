import React, { useState, useEffect } from 'react';
import { Search, Pin, Image as ImageIcon, Plus, Trash2, FolderInput, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Note, Folder } from '../types';

interface NotesListProps {
  notes: Note[];
  folders: Folder[];
  activeFolderId: string;
  activeNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onNewNote: () => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  onEmptyTrash?: () => void;
  isTrashFolder?: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  folderTitle: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  folders,
  activeFolderId,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onTogglePin,
  onDeleteNote,
  onMoveNoteToFolder,
  onEmptyTrash,
  isTrashFolder,
  searchQuery,
  onSearchChange,
  folderTitle,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null);

  // Close move popup if user clicks anywhere else
  useEffect(() => {
    if (!movingNoteId) return;
    const handleClickOutside = () => setMovingNoteId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [movingNoteId]);

  const folderMap = new Map<string, Folder>();
  folders.forEach((f) => folderMap.set(f.id, f));
  // Format relative date display
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Dün';
      } else if (diffDays < 7) {
        return date.toLocaleDateString('tr-TR', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      }
    } catch {
      return '';
    }
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentNotes = unpinnedNotes.filter(
    (n) => new Date(n.updatedAt).getTime() >= sevenDaysAgo
  );
  const olderNotes = unpinnedNotes.filter(
    (n) => new Date(n.updatedAt).getTime() < sevenDaysAgo
  );

  const renderNoteCard = (note: Note) => {
    const isSelected = activeNoteId === note.id;
    const hasCanvasImages = note.canvasItems.some((item) => item.type === 'image');
    const imageCount = note.canvasItems.filter((i) => i.type === 'image').length;

    const cleanedContent = note.content
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/==(?:sarı|yeşil|mavi|yellow|green|blue):/gi, '')
      .replace(/==/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/~~/g, '')
      .replace(/- \[[ x]\] /g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const textSnippet =
      cleanedContent.slice(0, 75) ||
      (note.canvasItems[0]?.caption || 'İçerik yok');

    const noteFolder = folderMap.get(note.folderId);

    return (
      <div
        key={note.id}
        draggable={!isTrashFolder}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', note.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => {
          onSelectNote(note);
          setMovingNoteId(null);
        }}
        onMouseLeave={() => {
          if (movingNoteId === note.id) setMovingNoteId(null);
        }}
        className={`group relative p-2.5 rounded-lg cursor-pointer transition-all duration-100 mb-1 border select-none ${
          !isTrashFolder ? 'cursor-grab active:cursor-grabbing' : ''
        } ${
          isSelected
            ? 'bg-[#23201a] border-amber-500/80 text-zinc-100 shadow-sm'
            : 'bg-[#18181d] hover:bg-[#1f1f26] border-[#25252e] text-zinc-300'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {isSelected && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            )}
            <h4
              className={`text-xs font-semibold truncate ${
                isSelected ? 'text-amber-300' : 'text-zinc-100'
              }`}
            >
              {note.title || 'Başlıksız Not'}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {note.isPinned && (
              <Pin
                size={11}
                className="text-amber-400 fill-amber-400"
              />
            )}
            {hasCanvasImages && (
              <span
                className="flex items-center gap-0.5 text-[10px] text-amber-400/90"
              >
                <ImageIcon size={10} />
                <span className="font-mono">{imageCount}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] mb-1">
          <span
            className={`font-mono text-[10px] shrink-0 ${
              isSelected ? 'text-amber-400/90' : 'text-zinc-500'
            }`}
          >
            {formatDate(note.updatedAt)}
          </span>
          <span
            className={`truncate text-[11px] ${
              isSelected ? 'text-zinc-300' : 'text-zinc-400'
            }`}
          >
            {textSnippet}
          </span>
        </div>

        {/* Folder tag when viewing All Notes */}
        {activeFolderId === 'all' && noteFolder && (
          <div className="pt-0.5">
            <span className="inline-block text-[9px] font-mono text-zinc-400 bg-[#121217] px-1.5 py-0.5 rounded border border-[#262633] truncate max-w-[130px]">
              📁 {noteFolder.name}
            </span>
          </div>
        )}

        {/* Quick hover actions */}
        <div
          className="absolute right-2 bottom-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Move to folder button */}
          {!isTrashFolder && onMoveNoteToFolder && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMovingNoteId(movingNoteId === note.id ? null : note.id);
                }}
                className="p-1 rounded hover:bg-black/30 hover:text-amber-400 transition-colors"
                aria-label="Klasöre Taşı"
              >
                <FolderInput size={11} />
              </button>

              {/* Move to folder quick menu */}
              {movingNoteId === note.id && (
                <div
                  className="absolute right-0 bottom-6 bg-[#1a1a22] border border-[#2e2e3c] rounded-lg p-1 shadow-2xl z-30 min-w-[140px] text-left"
                  onClick={(e) => e.stopPropagation()}
                  onMouseLeave={() => setMovingNoteId(null)}
                >
                  <div className="px-2 py-1 text-[10px] text-zinc-400 font-semibold border-b border-[#252532]">
                    Klasöre Taşı
                  </div>
                  {folders
                    .filter((f) => f.id !== 'all' && f.id !== 'trash' && f.id !== note.folderId)
                    .map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          onMoveNoteToFolder(note.id, f.id);
                          setMovingNoteId(null);
                        }}
                        className="w-full text-left px-2 py-1 text-xs text-zinc-300 hover:text-amber-400 hover:bg-[#252532] rounded transition-colors truncate block"
                      >
                        {f.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={(e) => onTogglePin(note.id, e)}
            className="p-1 rounded hover:bg-black/30 hover:text-amber-400 transition-colors"
            title={note.isPinned ? "İğneyi Kaldır" : "İğnele"}
          >
            <Pin size={11} />
          </button>
          <button
            onClick={(e) => onDeleteNote(note.id, e)}
            className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title={isTrashFolder ? "Kalıcı Olarak Sil" : "Sil"}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="w-10 bg-[#141418] border-r border-[#24242c] flex flex-col items-center py-2.5 select-none shrink-0 justify-between transition-all">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#202028] rounded-md transition-colors"
            title="Not Listesini Göster"
          >
            <PanelLeft size={16} />
          </button>
          <span className="text-[10px] font-mono px-1 py-0.5 rounded-full bg-[#1c1c24] text-amber-400 border border-[#2c2c38]">
            {notes.length}
          </span>
        </div>
        <button
          onClick={onNewNote}
          className="p-1.5 text-black bg-amber-500 hover:bg-amber-400 rounded-md shadow-sm transition-colors"
          title="Yeni Not Oluştur"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-[#141418] border-r border-[#24242c] flex flex-col h-full select-none shrink-0 transition-all">
      {/* Header */}
      <div className="p-3 border-b border-[#202028]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#202028] rounded transition-colors shrink-0"
                title="Not Listesini Gizle (Daha Geniş Alan)"
              >
                <PanelLeftClose size={14} />
              </button>
            )}
            <h2 className="text-xs font-semibold text-zinc-300 truncate">
              {folderTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-zinc-500">
              {notes.length} Not
            </span>
            {isTrashFolder && notes.length > 0 && onEmptyTrash && (
              <button
                onClick={onEmptyTrash}
                className="text-[10px] text-red-400 hover:text-red-300 hover:underline"
              >
                Boşalt
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Notlarda ara..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#1b1b22] text-xs text-zinc-100 pl-8 pr-3 py-1.5 rounded-lg border border-[#2b2b35] focus:outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Note Cards List */}
      <div className="flex-1 overflow-y-auto p-2">
        {notes.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-zinc-500 mb-2">Bu klasörde henüz not yok</p>
            <button
              onClick={onNewNote}
              className="px-3 py-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md hover:bg-amber-500/20 transition-colors"
            >
              + Yeni Not Oluştur
            </button>
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedNotes.length > 0 && (
              <div className="mb-3">
                <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>İğnelenenler</span>
                  <Pin size={10} className="text-amber-400" />
                </div>
                {pinnedNotes.map(renderNoteCard)}
              </div>
            )}

            {/* Recent 7 Days */}
            {recentNotes.length > 0 && (
              <div className="mb-3">
                <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Son 7 Gün
                </div>
                {recentNotes.map(renderNoteCard)}
              </div>
            )}

            {/* Older */}
            {olderNotes.length > 0 && (
              <div className="mb-3">
                <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Daha Eski
                </div>
                {olderNotes.map(renderNoteCard)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
