export interface Folder {
  id: string;
  name: string;
  icon: 'folder' | 'quick' | 'canvas' | 'archive' | 'trash' | 'book' | 'star';
  isSystem?: boolean;
}

export interface CanvasItem {
  id: string;
  type: 'image' | 'text' | 'sticky';
  x: number;
  y: number;
  width: number;
  height?: number;
  zIndex: number;
  src?: string; // base64 or image url
  caption?: string; // text directly under photo
  text?: string; // for sticky notes or text blocks
  color?: 'amber' | 'slate' | 'zinc' | 'stone'; // strictly no green, no purple
}

export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  viewMode: 'canvas' | 'document' | 'split';
  canvasItems: CanvasItem[];
  drawingStrokes: DrawingStroke[];
  tags?: string[];
}
