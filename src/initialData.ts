import { Folder, Note } from './types';

export const INITIAL_FOLDERS: Folder[] = [
  { id: 'all', name: 'Tüm Notlar', icon: 'folder', isSystem: true },
  { id: 'quick', name: 'Hızlı Notlar', icon: 'quick', isSystem: true },
  { id: 'canvas', name: 'Görsel Tuval & Çizim', icon: 'canvas' },
  { id: 'projects', name: 'Projeler', icon: 'star' },
  { id: 'archive', name: 'Arşiv', icon: 'archive', isSystem: true },
  { id: 'trash', name: 'Çöp Kutusu', icon: 'trash', isSystem: true },
];

// Clean initial note - no mock data
export const INITIAL_NOTES: Note[] = [
  {
    id: `note-${Date.now()}`,
    folderId: 'quick',
    title: 'Yeni Not',
    content: '',
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewMode: 'document',
    canvasItems: [],
    drawingStrokes: [],
  },
];
