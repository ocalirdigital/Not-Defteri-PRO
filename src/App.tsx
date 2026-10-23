import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Folder, Note, CanvasItem } from './types';
import { INITIAL_FOLDERS, INITIAL_NOTES } from './initialData';
import { DesktopHeader } from './components/DesktopHeader';
import { FolderSidebar } from './components/FolderSidebar';
import { NotesList } from './components/NotesList';
import { TabBar } from './components/TabBar';
import { DocumentEditor } from './components/DocumentEditor';
import { CanvasEditor } from './components/CanvasEditor';
import { ImageUploadModal } from './components/ImageUploadModal';
import { ExportModal } from './components/ExportModal';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { FileText, LayoutGrid, Plus, Layers } from 'lucide-react';

const STORAGE_KEY_NOTES = 'slate_notes_app_notes_v3';
const STORAGE_KEY_FOLDERS = 'slate_notes_app_folders_v3';
const STORAGE_KEY_TABS = 'slate_notes_app_tabs_v3';

export default function App() {
  // Load folders from localStorage or initial
  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOLDERS);
      return saved ? JSON.parse(saved) : INITIAL_FOLDERS;
    } catch {
      return INITIAL_FOLDERS;
    }
  });

  // Load notes from localStorage or initial (filtering out any old mock notes)
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      if (saved) {
        const parsed: Note[] = JSON.parse(saved);
        // Filter out legacy mock notes if present
        const filtered = parsed.filter(
          (n) => !['note-1', 'note-2', 'note-3', 'note-4'].includes(n.id)
        );
        if (filtered.length > 0) return filtered;
      }
    } catch {}
    return INITIAL_NOTES;
  });

  // Active folder
  const [activeFolderId, setActiveFolderId] = useState<string>('all');

  // Open tabs list (array of note IDs)
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TABS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter(
          (id: string) => !['note-1', 'note-2', 'note-3', 'note-4'].includes(id)
        );
        if (Array.isArray(filtered) && filtered.length > 0) return filtered;
      }
    } catch {}
    return [INITIAL_NOTES[0].id];
  });

  // Active selected note ID
  const [activeNoteId, setActiveNoteId] = useState<string | null>(INITIAL_NOTES[0].id);

  // Layout UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotesListOpen, setIsNotesListOpen] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic window width for intelligent auto-responsiveness across any screen size
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (width < 680 && typeof window !== 'undefined') {
        try {
          window.resizeTo(Math.max(760, window.outerWidth), Math.max(540, window.outerHeight));
        } catch {}
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
    } catch (e) {
      console.error('LocalStorage error saving notes:', e);
    }
  }, [notes]);

  // Save folders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
    } catch (e) {
      console.error('LocalStorage error saving folders:', e);
    }
  }, [folders]);

  // Save open tabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(openTabs));
    } catch (e) {
      console.error('LocalStorage error saving tabs:', e);
    }
  }, [openTabs]);

  // Notes map for quick lookup
  const notesMap = useMemo(() => {
    const map = new Map<string, Note>();
    notes.forEach((n) => map.set(n.id, n));
    return map;
  }, [notes]);

  // Active note instance (ensures notes moved to trash never remain open in non-trash views)
  const activeNote = useMemo(() => {
    if (!activeNoteId) return undefined;
    const note = notesMap.get(activeNoteId);
    if (!note) return undefined;
    if (activeFolderId !== 'trash' && note.folderId === 'trash') {
      return undefined;
    }
    return note;
  }, [activeNoteId, notesMap, activeFolderId]);

  // Intelligent responsive auto-collapse: automatically shapes sidebars to prevent squashed content
  useEffect(() => {
    if (activeNote?.viewMode === 'split') {
      if (windowWidth < 1250 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
      if (windowWidth < 1020 && isNotesListOpen) {
        setIsNotesListOpen(false);
      }
    } else {
      if (windowWidth < 960 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
      if (windowWidth < 740 && isNotesListOpen) {
        setIsNotesListOpen(false);
      }
    }
  }, [windowWidth, activeNote?.viewMode]);

  // Filter notes based on active folder and search query
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // 1. Folder match
      if (activeFolderId === 'all') {
        if (note.folderId === 'trash') return false; // exclude trash in "All Notes"
      } else if (activeFolderId === 'trash') {
        if (note.folderId !== 'trash') return false;
      } else if (note.folderId !== activeFolderId) {
        return false;
      }

      // 2. Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = note.title.toLowerCase().includes(query);
        const cleanContent = note.content.replace(/<[^>]+>/g, ' ').toLowerCase();
        const contentMatch = cleanContent.includes(query);
        const captionMatch = note.canvasItems.some((item) =>
          item.caption?.toLowerCase().includes(query) || item.text?.toLowerCase().includes(query)
        );
        return titleMatch || contentMatch || captionMatch;
      }

      return true;
    });
  }, [notes, activeFolderId, searchQuery]);

  // Get note count for each folder
  const getNoteCount = (folderId: string) => {
    if (folderId === 'all') {
      return notes.filter((n) => n.folderId !== 'trash').length;
    }
    return notes.filter((n) => n.folderId === folderId).length;
  };

  // Select note and ensure it's in openTabs
  const handleSelectNote = (note: Note) => {
    setActiveNoteId(note.id);
    if (!openTabs.includes(note.id)) {
      setOpenTabs((prev) => [...prev, note.id]);
    }
  };

  // Close tab
  const handleCloseTab = (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newTabs = openTabs.filter((id) => id !== noteId);
    setOpenTabs(newTabs);

    if (activeNoteId === noteId) {
      if (newTabs.length > 0) {
        setActiveNoteId(newTabs[newTabs.length - 1]);
      } else {
        setActiveNoteId(null);
      }
    }
  };

  // Close currently active tab (Red window button action)
  const handleCloseActiveTab = () => {
    if (activeNoteId) {
      const currentTitle = activeNote?.title || 'Not';
      handleCloseTab(activeNoteId);
      showToast(`"${currentTitle}" sekmesi kapatıldı`);
    } else {
      showToast('Kapatılacak açık bir sekme yok');
    }
  };

  // Toggle distraction-free focus mode (Yellow window button action)
  const handleToggleFocusMode = () => {
    setIsFocusMode((prev) => {
      const next = !prev;
      if (next) {
        showToast('Odak Modu: Yan paneller gizlendi. Çıkmak için sarı butona tıklayın.');
      } else {
        showToast('Odak Modundan çıkıldı. Paneller geri yüklendi.');
      }
      return next;
    });
  };

  // Create New Note
  const handleNewNote = () => {
    const newId = `note-${Date.now()}`;
    const targetFolderId =
      activeFolderId === 'all' || activeFolderId === 'trash' ? 'quick' : activeFolderId;

    const newNote: Note = {
      id: newId,
      folderId: targetFolderId,
      title: 'Yeni Not',
      content: '',
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewMode: targetFolderId === 'canvas' ? 'canvas' : 'document',
      canvasItems: [],
      drawingStrokes: [],
    };

    setNotes((prev) => [newNote, ...prev]);
    setOpenTabs((prev) => [...prev, newId]);
    setActiveNoteId(newId);
    showToast('Yeni sayfa açıldı');
  };

  // Update existing note
  const handleUpdateNote = (updatedFields: Partial<Note>) => {
    if (!activeNoteId) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, ...updatedFields } : n))
    );
  };

  // Toggle Pinned
  const handleTogglePin = (id?: string) => {
    const targetId = id || activeNoteId;
    if (!targetId) return;

    setNotes((prev) =>
      prev.map((n) =>
        n.id === targetId
          ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  // Delete note (move to trash or permanently remove if already in trash)
  const handleDeleteNote = (id?: string) => {
    const targetId = id || activeNoteId;
    if (!targetId) return;

    const target = notesMap.get(targetId);
    if (!target) return;

    const remainingTabs = openTabs.filter((tabId) => tabId !== targetId);

    if (target.folderId === 'trash') {
      // Permanently remove from trash (no blocking window.confirm)
      setNotes((prev) => prev.filter((n) => n.id !== targetId));
      setOpenTabs(remainingTabs);
      if (activeNoteId === targetId) {
        setActiveNoteId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : null);
      }
      showToast('Not kalıcı olarak silindi');
    } else {
      // Move to trash
      setNotes((prev) =>
        prev.map((n) =>
          n.id === targetId
            ? { ...n, folderId: 'trash', updatedAt: new Date().toISOString() }
            : n
        )
      );
      // Immediately remove from open tabs
      setOpenTabs(remainingTabs);

      // If active note was deleted, switch to another tab or next available note in folder
      if (activeNoteId === targetId) {
        if (remainingTabs.length > 0) {
          setActiveNoteId(remainingTabs[remainingTabs.length - 1]);
        } else {
          // Check for other notes in current folder
          const otherNotes = notes.filter(
            (n) =>
              n.id !== targetId &&
              n.folderId !== 'trash' &&
              (activeFolderId === 'all' ? true : n.folderId === activeFolderId)
          );
          if (otherNotes.length > 0) {
            setActiveNoteId(otherNotes[0].id);
            setOpenTabs([otherNotes[0].id]);
          } else {
            setActiveNoteId(null);
          }
        }
      }
      showToast('Not çöp kutusuna taşındı');
    }
  };

  // Empty all notes in trash (immediate execution without window.confirm)
  const handleEmptyTrash = () => {
    const trashNotes = notes.filter((n) => n.folderId === 'trash');
    if (trashNotes.length === 0) {
      showToast('Çöp kutusu zaten boş');
      return;
    }
    const trashIds = trashNotes.map((n) => n.id);
    setNotes((prev) => prev.filter((n) => n.folderId !== 'trash'));
    setOpenTabs((prev) => prev.filter((id) => !trashIds.includes(id)));
    if (activeNoteId && trashIds.includes(activeNoteId)) {
      setActiveNoteId(null);
    }
    showToast(`${trashIds.length} not kalıcı olarak temizlendi`);
  };

  // Add Folder
  const handleAddFolder = (name: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      icon: 'folder',
    };
    setFolders((prev) => [...prev, newFolder]);
    setActiveFolderId(newFolder.id);
    showToast(`"${name}" klasörü oluşturuldu`);
  };

  // Delete Folder
  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    // Move notes in that folder to quick
    setNotes((prev) =>
      prev.map((n) => (n.folderId === folderId ? { ...n, folderId: 'quick' } : n))
    );
    if (activeFolderId === folderId) {
      setActiveFolderId('all');
    }
    showToast('Klasör silindi');
  };

  // Add Image to Note (if no note is open, automatically create a new note and add photo!)
  const handleAddImageToNote = (src: string, caption: string) => {
    // If no note is open or currently viewing trash, create a new note
    if (!activeNote || activeFolderId === 'trash') {
      const newId = `note-${Date.now()}`;
      const newNote: Note = {
        id: newId,
        folderId: activeFolderId === 'trash' || activeFolderId === 'all' ? 'quick' : activeFolderId,
        title: caption.trim() || 'Fotoğraflı Not',
        content: '',
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewMode: 'canvas',
        canvasItems: [
          {
            id: `img-${Date.now()}`,
            type: 'image',
            x: 80,
            y: 60,
            width: 380,
            zIndex: 1,
            src,
            caption: caption || 'Fotoğraf Açıklaması',
          },
        ],
        drawingStrokes: [],
      };

      setNotes((prev) => [newNote, ...prev]);
      setOpenTabs((prev) => [...prev, newId]);
      setActiveNoteId(newId);
      if (activeFolderId === 'trash') {
        setActiveFolderId('quick');
      }
      showToast('Yeni sayfa açıldı ve fotoğraf tuvale eklendi');
      return;
    }

    // Add to existing active note with smart non-overlapping positioning (respecting all images, notes, texts & drawings)
    const items = activeNote.canvasItems || [];
    const strokes = activeNote.drawingStrokes || [];

    let targetX = 80;
    let targetY = 80;
    let maxX = 0;
    let maxY = 0;
    let minY = Infinity;
    let hasElements = false;

    items.forEach((it) => {
      hasElements = true;
      const r = it.x + (it.width || 360);
      const b = it.y + (it.height || 280);
      if (r > maxX) maxX = r;
      if (b > maxY) maxY = b;
      if (it.y < minY) minY = it.y;
    });

    strokes.forEach((s) => {
      (s.points || []).forEach((p) => {
        hasElements = true;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
        if (p.y < minY) minY = p.y;
      });
    });

    if (hasElements) {
      if (maxX + 420 <= 1500) {
        // Place to the right side-by-side cleanly
        targetX = Math.round(maxX + 40);
        targetY = Math.max(60, Math.round(minY === Infinity ? 80 : minY));
      } else {
        // Wrap to the next line below everything
        targetX = 80;
        targetY = Math.round(maxY + 40);
      }
    }

    const maxZ = Math.max(0, ...activeNote.canvasItems.map((it) => it.zIndex));
    const newItem: CanvasItem = {
      id: `img-${Date.now()}`,
      type: 'image',
      x: targetX,
      y: targetY,
      width: 380,
      zIndex: maxZ + 1,
      src,
      caption: caption || 'Fotoğraf Açıklaması',
    };

    // If active note is in document mode, append the image right into the document text (under the text)
    const imgHtml = `
      <div class="note-image-container my-3 select-none" contenteditable="false">
        <img src="${src}" class="rounded-xl max-w-full max-h-[460px] mx-auto shadow-xl border border-[#2e2e3e] object-contain block hover:scale-[1.01] transition-transform" alt="${caption || 'Görsel'}" />
        <div contenteditable="true" class="text-center text-xs text-zinc-400 mt-1.5 outline-none hover:text-zinc-200">${caption || 'Fotoğraf Açıklaması'}</div>
      </div>
      <p><br></p>
    `;

    handleUpdateNote({
      content: (activeNote.content || '') + imgHtml,
      canvasItems: [...activeNote.canvasItems, newItem],
      updatedAt: new Date().toISOString(),
    });
    showToast('Fotoğraf nota eklendi');
  };

  // Move note to a specific folder
  const handleMoveNoteToFolder = (noteId: string, targetFolderId: string) => {
    const targetFolder = folders.find((f) => f.id === targetFolderId);
    if (!targetFolder) return;

    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, folderId: targetFolderId, updatedAt: new Date().toISOString() }
          : n
      )
    );

    // If moved to trash and was active, remove from openTabs
    if (targetFolderId === 'trash') {
      setOpenTabs((prev) => prev.filter((id) => id !== noteId));
      if (activeNoteId === noteId) {
        setActiveNoteId(null);
      }
    }

    showToast(`Not "${targetFolder.name}" klasörüne taşındı`);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N: New Note
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewNote();
      }
      // Ctrl+P or Cmd+P: Export Modal
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsExportModalOpen(true);
      }
      // Ctrl+/ or Cmd+/ or F1: Shortcuts & Help Modal
      else if (
        ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === '?')) ||
        e.key === 'F1'
      ) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
      // Ctrl+Shift+F: Toggle Focus Mode
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleToggleFocusMode();
      }
      // Ctrl+W or Cmd+W (when not system reserved): Close active tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleCloseActiveTab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewNote, handleToggleFocusMode, handleCloseActiveTab]);

  // If the window is launched unusually narrow in app mode, gently auto-size to a standard desktop window
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 850) {
      try {
        window.resizeTo(1180, 780);
      } catch {
        // Ignored if browser restricts resizeTo
      }
    }
  }, []);

  const activeFolderTitle =
    folders.find((f) => f.id === activeFolderId)?.name || 'Tüm Notlar';

  return (
    <div className="flex flex-col h-screen w-full min-w-[680px] min-h-[480px] bg-[#0c0c0e] text-[#f4f4f5] overflow-hidden select-none">
      {/* 1. Top Desktop Window Bar */}
      <DesktopHeader
        activeNote={activeNote}
        activeFolderId={activeFolderId}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => {
          if (isFocusMode) setIsFocusMode(false);
          setIsSidebarOpen(!isSidebarOpen);
        }}
        onNewNote={handleNewNote}
        onViewModeChange={(mode) => {
          if (mode === 'split') {
            setIsSidebarOpen(false);
            if (windowWidth < 1180) {
              setIsNotesListOpen(false);
            }
          }
          handleUpdateNote({ viewMode: mode });
        }}
        onPasteImageClick={() => setIsImageModalOpen(true)}
        onExport={() => setIsExportModalOpen(true)}
        onTogglePin={() => handleTogglePin()}
        onDeleteNote={() => handleDeleteNote()}
        onEmptyTrash={handleEmptyTrash}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCloseActiveTab={handleCloseActiveTab}
        onToggleFocusMode={handleToggleFocusMode}
        isFocusMode={isFocusMode}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* 2. Main 3-Column Desktop Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Column 1: Folder Sidebar */}
        {!isFocusMode && isSidebarOpen && (
          <FolderSidebar
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={setActiveFolderId}
            onAddFolder={handleAddFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveNoteToFolder={handleMoveNoteToFolder}
            onReorderFolders={setFolders}
            getNoteCount={getNoteCount}
          />
        )}

        {/* Column 2: Notes List */}
        {!isFocusMode && (
          <NotesList
            notes={filteredNotes}
            folders={folders}
            activeFolderId={activeFolderId}
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            onNewNote={handleNewNote}
            onTogglePin={(id, e) => {
              e.stopPropagation();
              handleTogglePin(id);
            }}
            onDeleteNote={(id, e) => {
              e.stopPropagation();
              handleDeleteNote(id);
            }}
            onMoveNoteToFolder={handleMoveNoteToFolder}
            onEmptyTrash={handleEmptyTrash}
            isTrashFolder={activeFolderId === 'trash'}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            folderTitle={activeFolderTitle}
            isCollapsed={!isNotesListOpen}
            onToggleCollapse={() => setIsNotesListOpen(!isNotesListOpen)}
          />
        )}

        {/* Column 3: Active Workspace with Tab Bar & Editors */}
        <main className="flex-1 flex flex-col h-full bg-[#121215] overflow-hidden relative">
          {/* Focus Mode subtle bar */}
          {isFocusMode && (
            <div className="bg-[#17171e] border-b border-[#292934] px-3 py-1 flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Odak Modu Aktif (Tam Çalışma Alanı)
              </span>
              <button
                onClick={handleToggleFocusMode}
                className="text-[11px] px-2 py-0.5 rounded bg-[#252532] hover:bg-[#303040] text-zinc-200 transition-colors"
              >
                Panelleri Geri Aç
              </button>
            </div>
          )}
          {/* Top Page Tabs ("SOL KISIMDA SEKME SKMELER OLSUN ACILTIKCA YENI SAYFA") */}
          <TabBar
            openTabs={openTabs}
            activeNoteId={activeNoteId}
            notesMap={notesMap}
            activeFolderId={activeFolderId}
            onSelectTab={setActiveNoteId}
            onCloseTab={handleCloseTab}
            onNewPage={handleNewNote}
          />

          {/* Active Note Content Area */}
          {activeNote ? (
            <div className="flex-1 flex overflow-hidden relative">
              {/* Document Mode */}
              {activeNote.viewMode === 'document' && (
                <DocumentEditor
                  note={activeNote}
                  folders={folders}
                  onMoveFolder={(folderId) => handleMoveNoteToFolder(activeNote.id, folderId)}
                  onUpdateNote={handleUpdateNote}
                  onSwitchToCanvas={() => handleUpdateNote({ viewMode: 'canvas' })}
                  onOpenImageUpload={() => setIsImageModalOpen(true)}
                />
              )}

              {/* Freeform Canvas Mode */}
              {activeNote.viewMode === 'canvas' && (
                <CanvasEditor
                  note={activeNote}
                  onUpdateNote={handleUpdateNote}
                  onOpenImageUpload={() => setIsImageModalOpen(true)}
                />
              )}

              {/* Split Mode (Side by side or Top/Bottom stacked when compact) */}
              {activeNote.viewMode === 'split' && (
                <div
                  className={`flex-1 flex ${
                    windowWidth < 720 ? 'flex-col' : 'flex-row'
                  } h-full overflow-hidden`}
                >
                  <div
                    className={`flex-1 min-w-0 ${
                      windowWidth < 720
                        ? 'border-b border-[#24242c] min-h-[220px]'
                        : 'border-r border-[#24242c]'
                    } overflow-hidden flex flex-col relative z-10`}
                  >
                    <DocumentEditor
                      note={activeNote}
                      folders={folders}
                      onMoveFolder={(folderId) => handleMoveNoteToFolder(activeNote.id, folderId)}
                      onUpdateNote={handleUpdateNote}
                      onSwitchToCanvas={() => handleUpdateNote({ viewMode: 'canvas' })}
                      onOpenImageUpload={() => setIsImageModalOpen(true)}
                    />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden flex flex-col relative z-0">
                    <CanvasEditor
                      note={activeNote}
                      onUpdateNote={handleUpdateNote}
                      onOpenImageUpload={() => setIsImageModalOpen(true)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State when no note is open */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#121215]">
              <div className="w-16 h-16 rounded-2xl bg-[#1a1a22] border border-[#262632] flex items-center justify-center text-amber-500 mb-4 shadow-lg">
                <FileText size={32} />
              </div>
              <h3 className="text-base font-semibold text-zinc-200 mb-1">
                Açık Not Bulunmuyor
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-4">
                Sol taraftaki listeden bir not seçin veya yeni bir sayfa açarak not almaya başlayın.
              </p>
              <button
                onClick={handleNewNote}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl shadow-md transition-all hover:scale-105"
              >
                <Plus size={16} />
                <span>Yeni Sayfa Aç (Ctrl+N)</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#1f1f28]/95 backdrop-blur-md border border-[#353545] text-amber-400 px-4 py-2 rounded-xl text-xs font-medium shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Image Upload / Paste Modal */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onAddImage={handleAddImageToNote}
      />

      {/* Export / Print Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        note={activeNote}
      />

      {/* Keyboard Shortcuts & Help Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
