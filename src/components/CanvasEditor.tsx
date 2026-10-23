import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Image as ImageIcon,
  StickyNote,
  Type,
  Trash2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  PenTool,
  MousePointer,
  Copy,
  Layers,
  ArrowUpRight,
  Download,
  Upload,
  Grid,
  Focus
} from 'lucide-react';
import { CanvasItem, DrawingStroke, Note } from '../types';

interface CanvasEditorProps {
  note: Note;
  onUpdateNote: (updated: Partial<Note>) => void;
  onOpenImageUpload: () => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  note,
  onUpdateNote,
  onOpenImageUpload,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen & Cosmic Space Void States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasTheme, setCanvasTheme] = useState<'space' | 'dots' | 'pure'>('dots');
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Canvas Viewport transform
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Selected item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Dragging item
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const itemStartPosRef = useRef({ x: 0, y: 0 });

  // Resizing item
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const resizeStartDimRef = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

  // Vector Freehand Drawing Mode - SVG Powered (Zero disappearing, zero clipping)
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#f59e0b'); // amber accent
  const [brushSize, setBrushSize] = useState(3);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const [liveStrokePoints, setLiveStrokePoints] = useState<{ x: number; y: number }[]>([]);

  // Freehand Drawing Stroke Selection & Dragging (Active when isDrawingMode is OFF)
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [draggingStrokeId, setDraggingStrokeId] = useState<string | null>(null);
  const strokeDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const strokeOriginalPointsRef = useRef<Map<string, { x: number; y: number }[]>>(new Map());

  // Stroke helper methods
  const handleDeleteSelectedStrokes = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    onUpdateNote({
      drawingStrokes: (note.drawingStrokes || []).filter(
        (s) => !selectedStrokeIds.includes(s.id)
      ),
      updatedAt: new Date().toISOString(),
    });
    setSelectedStrokeIds([]);
  }, [selectedStrokeIds, note.drawingStrokes, onUpdateNote]);

  const handleSelectAllStrokes = useCallback(() => {
    if (!note.drawingStrokes || note.drawingStrokes.length === 0) return;
    setSelectedStrokeIds(note.drawingStrokes.map((s) => s.id));
  }, [note.drawingStrokes]);

  const handleChangeSelectedStrokesColor = useCallback(
    (color: string) => {
      if (selectedStrokeIds.length === 0) return;
      onUpdateNote({
        drawingStrokes: (note.drawingStrokes || []).map((s) =>
          selectedStrokeIds.includes(s.id) ? { ...s, color } : s
        ),
        updatedAt: new Date().toISOString(),
      });
    },
    [selectedStrokeIds, note.drawingStrokes, onUpdateNote]
  );

  const handleStrokeMouseDown = (stroke: DrawingStroke, e: React.MouseEvent) => {
    if (isDrawingMode) return;
    e.stopPropagation();

    setSelectedItemId(null);

    let newSelected = selectedStrokeIds;
    if (e.shiftKey) {
      if (selectedStrokeIds.includes(stroke.id)) {
        newSelected = selectedStrokeIds.filter((id) => id !== stroke.id);
      } else {
        newSelected = [...selectedStrokeIds, stroke.id];
      }
    } else {
      if (!selectedStrokeIds.includes(stroke.id)) {
        newSelected = [stroke.id];
      }
    }
    setSelectedStrokeIds(newSelected);
    setDraggingStrokeId(stroke.id);

    strokeDragStartRef.current = { x: e.clientX, y: e.clientY };

    const pointsMap = new Map<string, { x: number; y: number }[]>();
    (note.drawingStrokes || []).forEach((s) => {
      if (newSelected.includes(s.id)) {
        pointsMap.set(
          s.id,
          s.points.map((p) => ({ x: p.x, y: p.y }))
        );
      }
    });
    strokeOriginalPointsRef.current = pointsMap;
  };

  // Selected stroke bounding box calculation for floating actions
  const selectedStrokesBounds = useMemo(() => {
    if (selectedStrokeIds.length === 0 || !note.drawingStrokes) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    note.drawingStrokes.forEach((s) => {
      if (selectedStrokeIds.includes(s.id)) {
        (s.points || []).forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });
      }
    });

    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  }, [selectedStrokeIds, note.drawingStrokes]);

  // Keyboard listeners: Escape, Space, Delete/Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedStrokeIds.length > 0) {
          setSelectedStrokeIds([]);
          return;
        }
        if (selectedItemId) {
          setSelectedItemId(null);
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
          return;
        }
      }

      // Delete or Backspace to delete selected stroke(s) or item
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = (document.activeElement as HTMLElement)?.tagName;
        const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && !isEditable) {
          if (selectedStrokeIds.length > 0) {
            e.preventDefault();
            handleDeleteSelectedStrokes();
          } else if (selectedItemId) {
            e.preventDefault();
            handleDeleteItem(selectedItemId);
          }
        }
      }

      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isFullscreen, selectedStrokeIds, selectedItemId, handleDeleteSelectedStrokes]);

  // Direct smooth mousewheel zooming (tekerlek ileri = yakınlaş, tekerlek geri = uzaklaş)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomStep = 0.08;
    const isZoomIn = e.deltaY < 0;

    setScale((prevScale) => {
      const nextScale = isZoomIn ? prevScale + zoomStep : prevScale - zoomStep;
      // Mantıklı sınırlar: Minimum %40 (fazla küçülüp kaybolmasın), Maksimum %200
      return Math.max(0.4, Math.min(2.0, +nextScale.toFixed(2)));
    });
  };

  // Auto-center and fit all cards in cosmic space view
  const handleFitAllItems = () => {
    if (note.canvasItems.length === 0) {
      handleResetZoom();
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    note.canvasItems.forEach((item) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + (item.height || 260));
    });

    const contentWidth = maxX - minX + 220;
    const contentHeight = maxY - minY + 220;
    const scaleX = container.clientWidth / contentWidth;
    const scaleY = container.clientHeight / contentHeight;
    const newScale = Math.max(0.35, Math.min(1.1, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setScale(+newScale.toFixed(2));
    setPan({
      x: container.clientWidth / 2 - centerX * newScale,
      y: container.clientHeight / 2 - centerY * newScale,
    });
  };

  // Cycle through canvas space themes
  const cycleTheme = () => {
    setCanvasTheme((t) => (t === 'dots' ? 'space' : t === 'space' ? 'pure' : 'dots'));
  };

  // Smart non-overlapping positioning calculation for images & items
  const getSmartImagePosition = useCallback(
    (preferredX: number, preferredY: number, itemWidth = 360, itemHeight = 280) => {
      const items = note.canvasItems || [];
      const strokes = note.drawingStrokes || [];

      let overlaps = false;
      for (const it of items) {
        const itRight = it.x + (it.width || 360);
        const itBottom = it.y + (it.height || 260);
        if (
          preferredX < itRight + 20 &&
          preferredX + itemWidth > it.x - 20 &&
          preferredY < itBottom + 20 &&
          preferredY + itemHeight > it.y - 20
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps && items.length === 0 && strokes.length === 0) {
        return { x: Math.max(20, preferredX), y: Math.max(20, preferredY) };
      }

      if (overlaps || items.length > 0) {
        let maxX = 0;
        let maxY = 0;
        let minY = Infinity;

        items.forEach((it) => {
          const r = it.x + (it.width || 360);
          const b = it.y + (it.height || 260);
          if (r > maxX) maxX = r;
          if (b > maxY) maxY = b;
          if (it.y < minY) minY = it.y;
        });

        strokes.forEach((s) => {
          (s.points || []).forEach((p) => {
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
            if (p.y < minY) minY = p.y;
          });
        });

        if (maxX > 0) {
          if (maxX + itemWidth + 40 <= 1500) {
            return {
              x: Math.round(maxX + 40),
              y: Math.max(60, Math.round(minY === Infinity ? 60 : minY)),
            };
          } else {
            return {
              x: 60,
              y: Math.round(maxY + 40),
            };
          }
        }
      }

      return { x: Math.max(20, preferredX), y: Math.max(20, preferredY) };
    },
    [note.canvasItems, note.drawingStrokes]
  );

  // Handle direct clipboard paste on canvas
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                // Add new image item at center of current view
                const container = containerRef.current;
                const centerX = container
                  ? (container.clientWidth / 2 - pan.x) / scale - 180
                  : 150;
                const centerY = container
                  ? (container.clientHeight / 2 - pan.y) / scale - 140
                  : 120;

                const maxZ = Math.max(0, ...note.canvasItems.map((it) => it.zIndex));

                // Smart positioning: never stack directly on top of existing elements
                const { x: targetX, y: targetY } = getSmartImagePosition(
                  Math.max(20, Math.round(centerX)),
                  Math.max(20, Math.round(centerY))
                );

                const newItem: CanvasItem = {
                  id: `img-${Date.now()}`,
                  type: 'image',
                  x: targetX,
                  y: targetY,
                  width: 360,
                  zIndex: maxZ + 1,
                  src: base64,
                  caption: 'Yapıştırılan Fotoğraf - Açıklama ekleyin...',
                };

                onUpdateNote({
                  canvasItems: [...note.canvasItems, newItem],
                  updatedAt: new Date().toISOString(),
                });
                setSelectedItemId(newItem.id);
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [note, pan, scale, onUpdateNote, getSmartImagePosition]);

  // Drag and drop image files onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          const rect = containerRef.current?.getBoundingClientRect();
          const dropX = rect ? (e.clientX - rect.left - pan.x) / scale - 180 : 100;
          const dropY = rect ? (e.clientY - rect.top - pan.y) / scale - 140 : 100;

          const maxZ = Math.max(0, ...note.canvasItems.map((it) => it.zIndex));
          const { x: targetX, y: targetY } = getSmartImagePosition(
            Math.max(20, Math.round(dropX)),
            Math.max(20, Math.round(dropY))
          );

          const newItem: CanvasItem = {
            id: `img-${Date.now()}`,
            type: 'image',
            x: targetX,
            y: targetY,
            width: 360,
            zIndex: maxZ + 1,
            src: base64,
            caption: files[0].name.replace(/\.[^/.]+$/, ''),
          };

          onUpdateNote({
            canvasItems: [...note.canvasItems, newItem],
            updatedAt: new Date().toISOString(),
          });
          setSelectedItemId(newItem.id);
        }
      };
      reader.readAsDataURL(files[0]);
    }
  };

  // Add Sticky Note
  const handleAddSticky = (color: 'amber' | 'slate' | 'zinc' = 'amber') => {
    const container = containerRef.current;
    const centerX = container ? (container.clientWidth / 2 - pan.x) / scale - 130 : 200;
    const centerY = container ? (container.clientHeight / 2 - pan.y) / scale - 100 : 150;
    const maxZ = Math.max(0, ...note.canvasItems.map((it) => it.zIndex));

    const newItem: CanvasItem = {
      id: `sticky-${Date.now()}`,
      type: 'sticky',
      x: Math.round(centerX),
      y: Math.round(centerY),
      width: 260,
      zIndex: maxZ + 1,
      text: '📌 Yeni Yapışkan Not\nBuraya fikirlerinizi veya fotoğraf açıklamalarını yazabilirsiniz.',
      color,
    };

    onUpdateNote({
      canvasItems: [...note.canvasItems, newItem],
      updatedAt: new Date().toISOString(),
    });
    setSelectedItemId(newItem.id);
  };

  // Add Freeform Text Box
  const handleAddTextBox = () => {
    const container = containerRef.current;
    const centerX = container ? (container.clientWidth / 2 - pan.x) / scale - 150 : 200;
    const centerY = container ? (container.clientHeight / 2 - pan.y) / scale - 60 : 150;
    const maxZ = Math.max(0, ...note.canvasItems.map((it) => it.zIndex));

    const newItem: CanvasItem = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: Math.round(centerX),
      y: Math.round(centerY),
      width: 320,
      zIndex: maxZ + 1,
      text: 'Metin başlığı veya serbest not buraya yazılır...',
      color: 'zinc',
    };

    onUpdateNote({
      canvasItems: [...note.canvasItems, newItem],
      updatedAt: new Date().toISOString(),
    });
    setSelectedItemId(newItem.id);
  };

  // Mouse Down on Canvas Background
  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (isDrawingMode) {
      // Start freehand vector drawing stroke
      setIsDrawing(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = Math.round((e.clientX - rect.left - pan.x) / scale);
        const y = Math.round((e.clientY - rect.top - pan.y) / scale);
        const initialPt = { x, y };
        currentStrokeRef.current = [initialPt];
        setLiveStrokePoints([initialPt]);
      }
      return;
    }

    // If middle click or space held, or clicking empty background
    if (e.button === 1 || e.button === 0) {
      setSelectedItemId(null);
      setSelectedStrokeIds([]);
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  // Mouse Move on Container
  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Drawing
    if (isDrawingMode && isDrawing) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = Math.round((e.clientX - rect.left - pan.x) / scale);
        const y = Math.round((e.clientY - rect.top - pan.y) / scale);
        currentStrokeRef.current.push({ x, y });
        setLiveStrokePoints((prev) => [...prev, { x, y }]);
      }
      return;
    }

    // 2. Panning
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // 3. Dragging Freehand Drawing Stroke(s)
    if (draggingStrokeId) {
      const deltaX = Math.round((e.clientX - strokeDragStartRef.current.x) / scale);
      const deltaY = Math.round((e.clientY - strokeDragStartRef.current.y) / scale);

      const updatedStrokes = (note.drawingStrokes || []).map((s) => {
        const orig = strokeOriginalPointsRef.current.get(s.id);
        if (!orig) return s;
        return {
          ...s,
          points: orig.map((p) => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          })),
        };
      });

      onUpdateNote({
        drawingStrokes: updatedStrokes,
      });
      return;
    }

    // 4. Dragging Item
    if (draggingItemId) {
      const deltaX = (e.clientX - dragStartPosRef.current.x) / scale;
      const deltaY = (e.clientY - dragStartPosRef.current.y) / scale;

      const newX = Math.round(itemStartPosRef.current.x + deltaX);
      const newY = Math.round(itemStartPosRef.current.y + deltaY);

      onUpdateNote({
        canvasItems: note.canvasItems.map((item) =>
          item.id === draggingItemId ? { ...item, x: newX, y: newY } : item
        ),
      });
      return;
    }

    // 5. Resizing Item
    if (resizingItemId) {
      const deltaX = (e.clientX - resizeStartDimRef.current.mouseX) / scale;
      const newWidth = Math.max(160, Math.round(resizeStartDimRef.current.width + deltaX));

      onUpdateNote({
        canvasItems: note.canvasItems.map((item) =>
          item.id === resizingItemId ? { ...item, width: newWidth } : item
        ),
      });
      return;
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    if (isDrawingMode && isDrawing) {
      setIsDrawing(false);
      if (currentStrokeRef.current.length > 1) {
        const newStroke: DrawingStroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          points: [...currentStrokeRef.current],
          color: brushColor,
          size: brushSize,
        };
        onUpdateNote({
          drawingStrokes: [...(note.drawingStrokes || []), newStroke],
          updatedAt: new Date().toISOString(),
        });
      }
      currentStrokeRef.current = [];
      setLiveStrokePoints([]);
      return;
    }

    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingStrokeId) {
      setDraggingStrokeId(null);
      strokeOriginalPointsRef.current.clear();
      onUpdateNote({ updatedAt: new Date().toISOString() });
    }

    if (draggingItemId) {
      setDraggingItemId(null);
      onUpdateNote({ updatedAt: new Date().toISOString() });
    }

    if (resizingItemId) {
      setResizingItemId(null);
      onUpdateNote({ updatedAt: new Date().toISOString() });
    }
  };

  // Start Dragging an Item
  const handleItemMouseDown = (item: CanvasItem, e: React.MouseEvent) => {
    if (isDrawingMode) return;
    e.stopPropagation();
    setSelectedStrokeIds([]);
    setSelectedItemId(item.id);
    setDraggingItemId(item.id);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    itemStartPosRef.current = { x: item.x, y: item.y };
  };

  // Start Resizing an Item
  const handleResizeStart = (item: CanvasItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingItemId(item.id);
    resizeStartDimRef.current = {
      width: item.width,
      height: item.height || 0,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };
  };

  // Item deletion
  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateNote({
      canvasItems: note.canvasItems.filter((i) => i.id !== id),
      updatedAt: new Date().toISOString(),
    });
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // Item duplicate
  const handleDuplicateItem = (item: CanvasItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const maxZ = Math.max(0, ...note.canvasItems.map((it) => it.zIndex));
    const newItem: CanvasItem = {
      ...item,
      id: `${item.type}-${Date.now()}`,
      x: item.x + 30,
      y: item.y + 30,
      zIndex: maxZ + 1,
    };
    onUpdateNote({
      canvasItems: [...note.canvasItems, newItem],
      updatedAt: new Date().toISOString(),
    });
    setSelectedItemId(newItem.id);
  };

  // Bring item forward
  const handleBringToFront = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const maxZ = Math.max(0, ...note.canvasItems.map((it) => it.zIndex));
    onUpdateNote({
      canvasItems: note.canvasItems.map((i) =>
        i.id === id ? { ...i, zIndex: maxZ + 1 } : i
      ),
    });
  };

  // Update Item Text or Caption
  const handleItemTextChange = (id: string, field: 'caption' | 'text', val: string) => {
    onUpdateNote({
      canvasItems: note.canvasItems.map((i) =>
        i.id === id ? { ...i, [field]: val } : i
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(2.0, +(s + 0.15).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(0.4, +(s - 0.15).toFixed(2)));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Clear all drawings
  const handleClearDrawings = () => {
    onUpdateNote({
      drawingStrokes: [],
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleBackgroundMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'relative flex-1 h-full'
      } ${
        canvasTheme === 'space'
          ? 'canvas-space-void'
          : canvasTheme === 'pure'
          ? 'canvas-pure-void'
          : 'canvas-dot-grid'
      } overflow-hidden select-none ${
        isDrawingMode ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : 'cursor-default'
      }`}
      style={{
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Floating Canvas Top Toolbar - Sleek, Compact Pill with NO horizontal scrollbar */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-[#18181f]/95 backdrop-blur-md border border-[#2b2b36] shadow-2xl px-2 py-1 rounded-full flex items-center gap-0.5 sm:gap-1 z-40 text-xs select-none max-w-[calc(100%-16px)] overflow-x-auto no-scrollbar">
        <button
          onClick={onOpenImageUpload}
          className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-[#252530] rounded-full transition-colors shrink-0"
          title="Fotoğraf Yükle veya Yapıştır (Ctrl+V)"
          aria-label="Fotoğraf Ekle"
        >
          <ImageIcon size={14} className="text-amber-400" />
        </button>

        <div className="w-[1px] h-3.5 bg-[#2f2f3d] shrink-0" />

        <button
          onClick={() => handleAddSticky('amber')}
          className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-[#252530] rounded-full transition-colors shrink-0"
          title="Sarı Yapışkan Not Ekle"
          aria-label="Yapışkan Not"
        >
          <StickyNote size={14} className="text-amber-400" />
        </button>

        <button
          onClick={handleAddTextBox}
          className="p-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-[#252530] rounded-full transition-colors shrink-0"
          title="Serbest Metin Bloğu Ekle"
          aria-label="Metin Ekle"
        >
          <Type size={14} className="text-zinc-400" />
        </button>

        <div className="w-[1px] h-3.5 bg-[#2f2f3d] shrink-0" />

        {/* Freehand Drawing Toggle */}
        <button
          onClick={() => {
            const next = !isDrawingMode;
            setIsDrawingMode(next);
            if (next) {
              setSelectedItemId(null);
              setSelectedStrokeIds([]);
            }
          }}
          className={`p-1.5 rounded-full transition-colors shrink-0 ${
            isDrawingMode
              ? 'bg-amber-500 text-black font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#252530]'
          }`}
          title="Serbest Çizim Kalemi / Çizgiler"
          aria-label="Çizim Modu"
        >
          <PenTool size={13} />
        </button>

        {isDrawingMode && (
          <div className="flex items-center gap-1 pl-1 shrink-0">
            <button
              onClick={() => setBrushColor('#f59e0b')}
              className={`w-3.5 h-3.5 rounded-full bg-amber-500 border ${
                brushColor === '#f59e0b' ? 'border-white scale-110' : 'border-transparent'
              }`}
              title="Kehribar / Sarı Kalem"
            />
            <button
              onClick={() => setBrushColor('#ffffff')}
              className={`w-3.5 h-3.5 rounded-full bg-white border ${
                brushColor === '#ffffff' ? 'border-amber-500 scale-110' : 'border-transparent'
              }`}
              title="Beyaz Kalem"
            />
            <button
              onClick={() => setBrushColor('#a1a1aa')}
              className={`w-3.5 h-3.5 rounded-full bg-zinc-400 border ${
                brushColor === '#a1a1aa' ? 'border-amber-500 scale-110' : 'border-transparent'
              }`}
              title="Gri Kalem"
            />
            <button
              onClick={handleClearDrawings}
              className="px-1.5 py-0.5 text-zinc-400 hover:text-red-400 rounded transition-colors text-[10px]"
              title="Tüm Çizimleri Temizle"
            >
              Sil
            </button>
          </div>
        )}

        <div className="w-[1px] h-3.5 bg-[#2f2f3d] shrink-0" />

        {/* Theme Cycle Button */}
        <button
          onClick={cycleTheme}
          className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-[#252530] rounded-full transition-colors shrink-0"
          title={`Tuval Temasını Değiştir (${
            canvasTheme === 'space' ? 'Uzay Boşluğu' : canvasTheme === 'dots' ? 'Izgara' : 'Saf Boşluk'
          })`}
          aria-label="Tema Değiştir"
        >
          <Grid size={13} className="text-amber-400" />
        </button>

        {/* Auto Focus / Fit Button */}
        <button
          onClick={handleFitAllItems}
          className="p-1.5 text-zinc-300 hover:text-amber-400 hover:bg-[#252530] rounded-full transition-colors shrink-0"
          title="Tüm Ögeleri Merkeze Odakla"
          aria-label="Merkeze Odakla"
        >
          <Focus size={13} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`p-1.5 rounded-full transition-colors font-medium shrink-0 ${
            isFullscreen
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-zinc-300 hover:text-amber-400 hover:bg-[#252530]'
          }`}
          title={isFullscreen ? 'Tam Ekrandan Çık (Esc)' : 'Tam Ekran Tuval Modu'}
          aria-label="Tam Ekran"
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {/* Floating Exit Fullscreen pill when in fullscreen */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <div className="bg-[#121217]/90 backdrop-blur-md border border-amber-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-2xl shadow-black/80">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-medium text-amber-200">Uzay Odak Modu</span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="ml-2 flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-[#22222c] hover:bg-amber-500 hover:text-black text-zinc-200 rounded-full transition-all"
              title="Tam Ekrandan Çık (Esc)"
            >
              <Minimize2 size={11} />
              <span>Çık (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Zoom & View Controls */}
      <div className="absolute bottom-3 right-3 bg-[#18181f]/95 backdrop-blur-md border border-[#2b2b36] shadow-xl px-2 py-1 rounded-xl flex items-center gap-1 z-40 text-xs max-w-[calc(100%-16px)] overflow-x-auto no-scrollbar">
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#252530] rounded-lg transition-colors"
          title="Uzaklaştır (Fare Tekerleği Geri)"
        >
          <ZoomOut size={13} />
        </button>

        <span
          onClick={handleResetZoom}
          className="px-1.5 text-[11px] font-mono text-zinc-400 hover:text-amber-400 cursor-pointer tabular-nums"
          title="Sıfırla (%100)"
        >
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#252530] rounded-lg transition-colors"
          title="Yakınlaştır (Fare Tekerleği İleri)"
        >
          <ZoomIn size={13} />
        </button>

        <div className="w-[1px] h-3.5 bg-[#2f2f3d] mx-0.5" />

        <button
          onClick={handleFitAllItems}
          className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#252530] rounded-lg transition-colors"
          title="Tümünü Sığdır ve Ortala"
        >
          <Focus size={12} />
        </button>

        <button
          onClick={handleResetZoom}
          className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#252530] rounded-lg transition-colors"
          title="Görünümü Sıfırla"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Quick Paste Notification / Hint */}
      {note.canvasItems.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center px-4">
          <div className="p-4 rounded-2xl bg-[#16161b]/80 border border-[#262630] backdrop-blur-sm max-w-sm pointer-events-auto shadow-2xl">
            <ImageIcon size={32} className="text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">
              Serbest Görsel Tuvaline Hoş Geldiniz
            </h3>
            <p className="text-xs text-zinc-400 mb-3">
              Herhangi bir görseli kopyalayıp doğrudan <kbd className="px-1.5 py-0.5 bg-[#22222b] text-amber-400 rounded font-mono text-[11px]">Ctrl+V</kbd> ile yapıştırabilir veya bilgisayarınızdan sürükleyip bırakabilirsiniz.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onOpenImageUpload}
                className="px-3 py-1.5 text-xs font-medium text-black bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
              >
                Fotoğraf Yükle
              </button>
              <button
                onClick={() => handleAddSticky('amber')}
                className="px-3 py-1.5 text-xs font-medium text-zinc-200 bg-[#22222b] hover:bg-[#2c2c38] rounded-lg transition-colors"
              >
                + Not Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Viewport with transform */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transition:
            isPanning || draggingItemId || resizingItemId || draggingStrokeId
              ? 'none'
              : 'transform 0.05s ease-out',
        }}
      >
        {/* Infinite, Crisp Vector Freehand Drawing Layer - NEVER disappears, NEVER clips, DRAGGABLE! */}
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible w-full h-full"
          style={{ zIndex: 10 }}
        >
          {note.drawingStrokes?.map((stroke) => {
            if (!stroke.points || stroke.points.length < 2) return null;
            const isSelected = selectedStrokeIds.includes(stroke.id);
            const pathData =
              `M ${stroke.points[0].x} ${stroke.points[0].y} ` +
              stroke.points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');

            return (
              <g
                key={stroke.id}
                onMouseDown={(e) => handleStrokeMouseDown(stroke, e)}
                className={
                  !isDrawingMode
                    ? 'pointer-events-auto cursor-grab active:cursor-grabbing group/stroke'
                    : 'pointer-events-none'
                }
              >
                {/* Generous invisible hit-path for effortless grabbing (28px thick) */}
                <path
                  d={pathData}
                  stroke="transparent"
                  strokeWidth={Math.max(28, stroke.size + 18)}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Subtle amber selection halo behind the stroke */}
                {isSelected && (
                  <path
                    d={pathData}
                    stroke="#f59e0b"
                    strokeWidth={stroke.size + 10}
                    strokeOpacity={0.45}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* The visible stroke */}
                <path
                  d={pathData}
                  stroke={stroke.color}
                  strokeWidth={stroke.size}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          {isDrawing && liveStrokePoints.length > 1 && (
            <path
              d={
                `M ${liveStrokePoints[0].x} ${liveStrokePoints[0].y} ` +
                liveStrokePoints.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
              }
              stroke={brushColor}
              strokeWidth={brushSize}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Selected Stroke(s) Floating Action Bar & Dashed Outline */}
        {selectedStrokesBounds && !isDrawingMode && (
          <>
            <div
              className="absolute border border-dashed border-amber-500/70 rounded pointer-events-none shadow-sm transition-none"
              style={{
                left: selectedStrokesBounds.minX - 10,
                top: selectedStrokesBounds.minY - 10,
                width: selectedStrokesBounds.maxX - selectedStrokesBounds.minX + 20,
                height: selectedStrokesBounds.maxY - selectedStrokesBounds.minY + 20,
                zIndex: 25,
              }}
            />

            <div
              className="absolute z-30 flex items-center gap-1.5 bg-[#171720]/95 backdrop-blur-md border border-amber-500/40 shadow-2xl px-2.5 py-1 rounded-full text-xs text-zinc-200 select-none"
              style={{
                left: Math.max(10, selectedStrokesBounds.minX - 10),
                top: Math.max(10, selectedStrokesBounds.minY - 44),
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                <Move size={12} />
                <span>Taşı (Sürükle)</span>
              </div>

              <div className="w-[1px] h-3 bg-[#333344] mx-0.5" />

              {(note.drawingStrokes?.length || 0) > 1 && (
                <button
                  onClick={handleSelectAllStrokes}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    selectedStrokeIds.length === (note.drawingStrokes?.length || 0)
                      ? 'bg-amber-500 text-black font-semibold'
                      : 'text-zinc-300 hover:text-white bg-[#252532] hover:bg-[#2e2e3e]'
                  }`}
                  title="Tüm çizimleri birlikte seç ve taşı"
                >
                  Tümünü Seç ({note.drawingStrokes?.length})
                </button>
              )}

              <div className="flex items-center gap-1 ml-1">
                {['#f59e0b', '#38bdf8', '#ef4444', '#10b981', '#ffffff', '#a1a1aa'].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleChangeSelectedStrokesColor(c)}
                    className="w-3.5 h-3.5 rounded-full border border-black/40 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    title="Rengi Değiştir"
                  />
                ))}
              </div>

              <div className="w-[1px] h-3 bg-[#333344] mx-0.5" />

              <button
                onClick={handleDeleteSelectedStrokes}
                className="p-1 text-zinc-400 hover:text-red-400 hover:bg-[#252532] rounded transition-colors"
                title="Çizimi Sil (Delete)"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}

        {note.canvasItems.map((item) => {
          const isSelected = selectedItemId === item.id;

          // ================= RENDER IMAGE CARD =================
          if (item.type === 'image') {
            return (
              <div
                key={item.id}
                onMouseDown={(e) => handleItemMouseDown(item, e)}
                style={{
                  transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
                  width: `${item.width}px`,
                  zIndex: item.zIndex,
                }}
                className={`absolute select-none group/item transition-shadow duration-100 ${
                  isSelected
                    ? 'ring-2 ring-amber-500 shadow-2xl shadow-black/80'
                    : 'hover:ring-1 hover:ring-zinc-600 shadow-xl'
                }`}
              >
                {/* Image Card Container */}
                <div className="bg-[#18181f] rounded-xl overflow-hidden border border-[#2b2b36]">
                  {/* Top Drag Handle Bar */}
                  <div className="bg-[#141419] px-2.5 py-1.5 flex items-center justify-between border-b border-[#24242e] cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Move size={11} className="text-zinc-500" />
                      <span className="text-[10px] font-mono tracking-tight text-zinc-400">
                        {item.width}px
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleBringToFront(item.id, e)}
                        className="p-1 text-zinc-400 hover:text-amber-400 rounded transition-colors"
                        title="En Öne Getir"
                      >
                        <Layers size={11} />
                      </button>
                      <button
                        onClick={(e) => handleDuplicateItem(item, e)}
                        className="p-1 text-zinc-400 hover:text-amber-400 rounded transition-colors"
                        title="Çoğalt"
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1 text-zinc-400 hover:text-red-400 rounded transition-colors"
                        title="Fotoğrafı Sil"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Image Display */}
                  <div className="relative bg-black/40 overflow-hidden flex items-center justify-center min-h-[120px]">
                    {item.src ? (
                      <img
                        src={item.src}
                        alt={item.caption || "Fotoğraf"}
                        referrerPolicy="no-referrer"
                        className="w-full h-auto object-contain block pointer-events-none select-none"
                      />
                    ) : (
                      <div className="p-8 text-center text-zinc-500 text-xs">
                        Görsel yüklenemedi
                      </div>
                    )}
                  </div>

                  {/* Text directly under the photo ("yazıları altına yazalım") */}
                  <div
                    className="p-2.5 bg-[#141419] border-t border-[#22222a]"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <textarea
                      value={item.caption || ''}
                      onChange={(e) => handleItemTextChange(item.id, 'caption', e.target.value)}
                      placeholder="Fotoğraf altına not veya açıklama yazın..."
                      rows={2}
                      className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Resize Handle on Bottom Right */}
                <div
                  onMouseDown={(e) => handleResizeStart(item, e)}
                  className={`absolute -right-2 -bottom-2 w-5 h-5 bg-amber-500 text-black rounded-full flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-125 transition-transform ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-70'
                  }`}
                  title="Boyutu Ayarlamak İçin Çekin"
                >
                  <ArrowUpRight size={11} className="rotate-90 stroke-[2.5]" />
                </div>
              </div>
            );
          }

          // ================= RENDER STICKY NOTE =================
          if (item.type === 'sticky') {
            const bgClass =
              item.color === 'slate'
                ? 'bg-[#1e2029] border-[#2e3140] text-zinc-200'
                : item.color === 'zinc'
                ? 'bg-[#18181b] border-[#27272a] text-zinc-200'
                : 'bg-[#291e0b] border-[#4a3411] text-amber-100'; // Amber signature

            return (
              <div
                key={item.id}
                onMouseDown={(e) => handleItemMouseDown(item, e)}
                style={{
                  transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
                  width: `${item.width}px`,
                  zIndex: item.zIndex,
                }}
                className={`absolute select-none group/item p-3 rounded-xl border shadow-xl ${bgClass} ${
                  isSelected ? 'ring-2 ring-amber-500' : 'hover:ring-1 hover:ring-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing pb-1 border-b border-black/20">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                    Not
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDuplicateItem(item, e)}
                      className="p-0.5 text-zinc-400 hover:text-amber-400 rounded"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-0.5 text-zinc-400 hover:text-red-400 rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                <textarea
                  value={item.text || ''}
                  onChange={(e) => handleItemTextChange(item.id, 'text', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  rows={4}
                  className="w-full bg-transparent text-xs text-inherit focus:outline-none resize-none leading-relaxed"
                  placeholder="Notunuzu yazın..."
                />

                {/* Resize Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart(item, e)}
                  className={`absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-amber-500 rounded-full cursor-nwse-resize ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-50'
                  }`}
                />
              </div>
            );
          }

          // ================= RENDER FREEFORM TEXT BOX =================
          if (item.type === 'text') {
            return (
              <div
                key={item.id}
                onMouseDown={(e) => handleItemMouseDown(item, e)}
                style={{
                  transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
                  width: `${item.width}px`,
                  zIndex: item.zIndex,
                }}
                className={`absolute select-none group/item p-3 rounded-xl bg-[#141419]/90 border border-[#2b2b36] shadow-xl ${
                  isSelected ? 'ring-2 ring-amber-500' : 'hover:border-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 cursor-grab active:cursor-grabbing pb-1 border-b border-[#24242e]">
                  <span className="text-[10px] font-mono text-zinc-500">Metin Bloğu</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDuplicateItem(item, e)}
                      className="p-0.5 text-zinc-400 hover:text-amber-400 rounded"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-0.5 text-zinc-400 hover:text-red-400 rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                <textarea
                  value={item.text || ''}
                  onChange={(e) => handleItemTextChange(item.id, 'text', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  rows={3}
                  className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
                  placeholder="Yazı yazın..."
                />

                <div
                  onMouseDown={(e) => handleResizeStart(item, e)}
                  className={`absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-amber-500 rounded-full cursor-nwse-resize ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-50'
                  }`}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
