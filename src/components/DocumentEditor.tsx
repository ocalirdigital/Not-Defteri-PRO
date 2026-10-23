import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Quote,
  Code,
  Image as ImageIcon,
  LayoutGrid,
  Trash2,
  Clock,
  Highlighter,
  ChevronDown,
  Check,
  X,
  Type,
  Palette,
  Undo2,
  Redo2,
  ListOrdered,
  Mic,
  MicOff,
  AlertCircle
} from 'lucide-react';
import { Note, CanvasItem, Folder } from '../types';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export const HIGHLIGHT_PRESETS: Record<
  HighlightColor,
  {
    name: string;
    bg: string;
    text: string;
    swatchClass: string;
    iconClass: string;
    badgeBg: string;
    label: string;
  }
> = {
  yellow: {
    name: 'Sarı Vurgu',
    bg: '#fef08a',
    text: '#18181b',
    swatchClass: 'bg-amber-300 text-zinc-950 border border-amber-200',
    iconClass: 'text-amber-400',
    badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    label: 'Sarı'
  },
  green: {
    name: 'Yeşil Vurgu',
    bg: '#bbf7d0',
    text: '#064e3b',
    swatchClass: 'bg-emerald-300 text-emerald-950 border border-emerald-200',
    iconClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    label: 'Yeşil'
  },
  blue: {
    name: 'Mavi Vurgu',
    bg: '#bae6fd',
    text: '#0c4a6e',
    swatchClass: 'bg-sky-300 text-sky-950 border border-sky-200',
    iconClass: 'text-sky-400',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    label: 'Mavi'
  },
  pink: {
    name: 'Pembe Vurgu',
    bg: '#fecdd3',
    text: '#881337',
    swatchClass: 'bg-rose-300 text-rose-950 border border-rose-200',
    iconClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    label: 'Pembe'
  }
};

export const TEXT_COLOR_PRESETS = [
  { name: 'Sarı Yazı', color: '#fbbf24', swatchClass: 'bg-amber-400 text-zinc-950' },
  { name: 'Yeşil Yazı', color: '#34d399', swatchClass: 'bg-emerald-400 text-zinc-950' },
  { name: 'Mavi Yazı', color: '#38bdf8', swatchClass: 'bg-sky-400 text-zinc-950' },
  { name: 'Kırmızı Yazı', color: '#f87171', swatchClass: 'bg-rose-400 text-zinc-950' },
  { name: 'Normal Beyaz', color: '#f4f4f5', swatchClass: 'bg-zinc-200 text-zinc-950' },
];

/**
 * Converts legacy markdown highlight tags (`==sarı:...==` or plain text) into clean visual HTML
 */
export function convertContentToHtml(raw: string): string {
  if (!raw) return '<p><br></p>';

  // Check if content already contains HTML tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(raw);

  let processed = raw;

  // Replace legacy markdown highlight syntax
  processed = processed
    .replace(/==sarı:([^=]+)==/gi, '<mark style="background-color: #fef08a; color: #18181b; padding: 2px 5px; border-radius: 4px; font-weight: 500;">$1</mark>')
    .replace(/==yeşil:([^=]+)==/gi, '<mark style="background-color: #bbf7d0; color: #064e3b; padding: 2px 5px; border-radius: 4px; font-weight: 500;">$1</mark>')
    .replace(/==mavi:([^=]+)==/gi, '<mark style="background-color: #bae6fd; color: #0c4a6e; padding: 2px 5px; border-radius: 4px; font-weight: 500;">$1</mark>')
    .replace(/==([^=]+)==/gi, '<mark style="background-color: #fef08a; color: #18181b; padding: 2px 5px; border-radius: 4px; font-weight: 500;">$1</mark>');

  if (hasHtml) {
    return processed;
  }

  // If it's plain text with newlines, convert to semantic HTML paragraphs
  const lines = processed.split('\n');
  const htmlLines = lines.map((line) => {
    if (!line.trim()) return '<p><br></p>';

    // H1
    if (line.startsWith('# ')) {
      return `<h1>${line.slice(2)}</h1>`;
    }
    // H2
    if (line.startsWith('## ')) {
      return `<h2>${line.slice(3)}</h2>`;
    }
    // H3
    if (line.startsWith('### ')) {
      return `<h3>${line.slice(4)}</h3>`;
    }
    // Quote
    if (line.startsWith('> ')) {
      return `<blockquote>${line.slice(2)}</blockquote>`;
    }
    // Bullet
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return `<li>${line.slice(2)}</li>`;
    }

    return `<p>${line}</p>`;
  });

  return htmlLines.join('');
}

interface DocumentEditorProps {
  note: Note;
  folders?: Folder[];
  onMoveFolder?: (folderId: string) => void;
  onUpdateNote: (updated: Partial<Note>) => void;
  onSwitchToCanvas: () => void;
  onOpenImageUpload: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  note,
  folders,
  onMoveFolder,
  onUpdateNote,
  onSwitchToCanvas,
  onOpenImageUpload,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightMenuRef = useRef<HTMLDivElement>(null);
  const textColorMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showTextColorMenu, setShowTextColorMenu] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [activeHighlight, setActiveHighlight] = useState<HighlightColor>('yellow');
  const isInternalChangeRef = useRef(false);

  // Voice Dictation (Sesli Not Yazma / Mikrofon)
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  const isSpeechSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  // Handle note content updates triggered from editor
  const handleEditorChange = useCallback(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    isInternalChangeRef.current = true;
    setLastSavedContent(currentHtml);
    onUpdateNote({
      content: currentHtml,
      updatedAt: new Date().toISOString(),
    });
  }, [onUpdateNote]);

  // Helper to insert voice dictation text safely into the editor without relying solely on selection
  const insertDictationText = useCallback(
    (text: string) => {
      if (!text || !text.trim() || !editorRef.current) return;
      const el = editorRef.current;
      el.focus();

      const cleanText = text.trim() + ' ';
      let inserted = false;

      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
          inserted = document.execCommand('insertText', false, cleanText);
        }
      } catch {
        inserted = false;
      }

      if (!inserted) {
        // Fallback: Append cleanly to the document body
        const p = el.lastElementChild;
        if (p && p.tagName === 'P') {
          p.innerHTML = (p.innerHTML === '<br>' ? '' : p.innerHTML + ' ') + cleanText;
        } else {
          const newP = document.createElement('p');
          newP.innerHTML = cleanText;
          el.appendChild(newP);
        }
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch {}
      }

      handleEditorChange();
    },
    [handleEditorChange]
  );

  const startListening = useCallback(async () => {
    if (!isSpeechSupported) {
      setSpeechError(
        'Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Microsoft Edge veya Google Chrome kullanın.'
      );
      return;
    }

    // Wake up microphone and request explicit permission from Windows / Edge
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permErr: any) {
      console.warn('Microphone permission check:', permErr);
      setSpeechError(
        'Mikrofon izni verilmedi. Lütfen Windows ve tarayıcı ayarlarından mikrofona onay verin.'
      );
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'tr-TR';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalSpeech = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSpeech += transcript;
          } else {
            interim += transcript;
          }
        }

        setInterimText(interim);

        if (finalSpeech.trim()) {
          insertDictationText(finalSpeech);
          setInterimText('');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setSpeechError(
            'Mikrofon erişim izni engellendi. Tarayıcı ayarlarından mikrofona izin verin.'
          );
          stopListening();
        } else if (event.error === 'no-speech') {
          // Normal pause during speaking, keep active
        } else {
          setSpeechError(`Mikrofon bildirimi: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            // ignore
          }
        }
        setIsListening(false);
        setInterimText('');
      };

      shouldListenRef.current = true;
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setSpeechError('Mikrofon başlatılırken bir sorun oluştu. Lütfen mikrofonunuzun takılı olduğundan emin olun.');
      setIsListening(false);
      shouldListenRef.current = false;
    }
  }, [isSpeechSupported, insertDictationText, stopListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [note.id, stopListening]);

  // Dedicated helper to remove an image container from the editor and note state
  const handleDeleteImageFromEditor = useCallback(
    (container: HTMLElement) => {
      if (!container) return;
      const img = container.querySelector('img');
      const imgSrc = img?.getAttribute('src');

      // Check if next sibling is an empty paragraph created right after the image, remove it too
      const nextSibling = container.nextElementSibling;
      if (
        nextSibling &&
        nextSibling.tagName === 'P' &&
        (!nextSibling.textContent?.trim() || nextSibling.innerHTML === '<br>')
      ) {
        nextSibling.remove();
      }

      // Remove from DOM
      container.remove();

      if (editorRef.current) {
        const currentHtml = editorRef.current.innerHTML;
        isInternalChangeRef.current = true;
        setLastSavedContent(currentHtml);

        const updatedCanvasItems = imgSrc
          ? (note.canvasItems || []).filter((it) => it.src !== imgSrc)
          : note.canvasItems;

        onUpdateNote({
          content: currentHtml,
          canvasItems: updatedCanvasItems,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [note.canvasItems, onUpdateNote]
  );

  // Helper to ensure all image containers inside the contenteditable have the delete button and are centered
  const attachDeleteButtons = useCallback(() => {
    if (!editorRef.current) return;
    const containers = editorRef.current.querySelectorAll('.note-image-container');
    containers.forEach((rawContainer) => {
      const container = rawContainer as HTMLElement;
      // Guarantee proper flex centering on container
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.textAlign = 'center';
      container.style.margin = '1.5rem auto';
      container.style.width = '100%';
      container.className =
        'note-image-container my-6 select-none flex flex-col items-center justify-center text-center w-full relative group/img';

      const img = container.querySelector('img');
      if (!img) return;

      img.style.margin = '0 auto';
      img.style.display = 'block';
      img.style.borderRadius = '0.75rem';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '460px';

      // Ensure wrapper around img exists for positioning the delete button
      let wrapper = container.querySelector('.img-relative-wrapper') as HTMLElement | null;
      if (!wrapper) {
        wrapper = container.querySelector('.relative.inline-block') as HTMLElement | null;
      }
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'img-relative-wrapper relative inline-block max-w-full';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.maxWidth = '100%';
        img.parentNode?.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      } else {
        wrapper.classList.add('img-relative-wrapper');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.maxWidth = '100%';
      }

      // Check if button exists or create it
      let btn = container.querySelector('.delete-img-btn') as HTMLElement | null;
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-delete-img', 'true');
        btn.className =
          'delete-img-btn absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg opacity-90 group-hover/img:opacity-100 transition-all shadow-xl cursor-pointer border border-white/20 hover:scale-105 z-30 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md';
        btn.title = 'Fotoğrafı Kaldır';
        btn.innerHTML =
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg><span>Kaldır</span>';
        wrapper.appendChild(btn);
      } else {
        btn.className =
          'delete-img-btn absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg opacity-90 group-hover/img:opacity-100 transition-all shadow-xl cursor-pointer border border-white/20 hover:scale-105 z-30 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md';
      }

      // Direct event binding to guarantee instantaneous removal
      btn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDeleteImageFromEditor(container);
      };

      // Ensure caption is centered directly under the image
      const captionDiv = container.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (captionDiv) {
        captionDiv.style.textAlign = 'center';
        captionDiv.style.marginTop = '0.5rem';
        captionDiv.style.width = '100%';
      }
    });
  }, [handleDeleteImageFromEditor]);

  // Capture-phase native click and mousedown listeners on editorRef to guarantee delete button execution
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const handleNativeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target?.closest?.('[data-delete-img="true"], .delete-img-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const container = btn.closest('.note-image-container') as HTMLElement | null;
        if (container) {
          handleDeleteImageFromEditor(container);
        }
      }
    };

    const handleNativeMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target?.closest?.('[data-delete-img="true"], .delete-img-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('mousedown', handleNativeMouseDown, true);
    el.addEventListener('click', handleNativeClick, true);
    return () => {
      el.removeEventListener('mousedown', handleNativeMouseDown, true);
      el.removeEventListener('click', handleNativeClick, true);
    };
  }, [handleDeleteImageFromEditor]);

  // Sync editor content with note.content
  useEffect(() => {
    if (editorRef.current) {
      if (isInternalChangeRef.current) {
        isInternalChangeRef.current = false;
        attachDeleteButtons();
        return;
      }

      const formatted = convertContentToHtml(note.content || '');
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
        setLastSavedContent(note.content || '');
      }

      attachDeleteButtons();
    }
  }, [note.id, note.content, attachDeleteButtons]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        highlightMenuRef.current &&
        !highlightMenuRef.current.contains(e.target as Node)
      ) {
        setShowHighlightMenu(false);
      }
      if (
        textColorMenuRef.current &&
        !textColorMenuRef.current.contains(e.target as Node)
      ) {
        setShowTextColorMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Save selection before clicking buttons if needed
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      return sel.getRangeAt(0);
    }
    return null;
  };

  /**
   * Apply background highlight (Sarı, Yeşil, Mavi, Pembe)
   */
  const applyHighlight = (color: HighlightColor) => {
    setActiveHighlight(color);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      // If nothing selected, prompt or focus
      editorRef.current?.focus();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    const preset = HIGHLIGHT_PRESETS[color];

    // Create styled mark element
    const mark = document.createElement('mark');
    mark.style.backgroundColor = preset.bg;
    mark.style.color = preset.text;
    mark.style.padding = '2px 5px';
    mark.style.borderRadius = '4px';
    mark.style.fontWeight = '500';
    mark.style.boxShadow = '0 1px 2px rgba(0,0,0,0.15)';
    mark.dataset.highlight = color;

    try {
      mark.appendChild(range.extractContents());
      range.insertNode(mark);

      // Re-select contents
      const newRange = document.createRange();
      newRange.selectNodeContents(mark);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } catch {
      document.execCommand('backColor', false, preset.bg);
    }

    handleEditorChange();
  };

  /**
   * Apply direct text color (e.g. Sarı Yazı Rengi)
   */
  const applyTextColor = (hexColor: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      editorRef.current?.focus();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    const span = document.createElement('span');
    span.style.color = hexColor;
    if (hexColor !== '#f4f4f5') {
      span.style.fontWeight = '600';
    }

    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } catch {
      document.execCommand('foreColor', false, hexColor);
    }

    handleEditorChange();
  };

  /**
   * Remove highlight and color styling from selection
   */
  const removeFormatting = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    let node: Node | null = range.commonAncestorContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    // Traverse upwards to unwrap mark or color spans
    let cleaned = false;
    while (node && node !== editorRef.current) {
      const el = node as HTMLElement;
      if (
        el.tagName === 'MARK' ||
        (el.tagName === 'SPAN' && (el.style.color || el.style.backgroundColor))
      ) {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el);
        }
        parent?.removeChild(el);
        cleaned = true;
        break;
      }
      node = node.parentNode;
    }

    if (!cleaned) {
      document.execCommand('removeFormat', false);
    }

    handleEditorChange();
  };

  /**
   * Standard document exec commands (Bold, Italic, Strikethrough, etc.)
   */
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleEditorChange();
  };

  /**
   * Insert checklist / interactive task item
   */
  const insertChecklist = () => {
    editorRef.current?.focus();
    const taskHtml = `
      <div class="task-item flex items-center gap-2.5 my-1.5" contenteditable="false">
        <input type="checkbox" class="w-4 h-4 rounded border-[#3f3f4e] bg-[#1a1a24] accent-amber-500 cursor-pointer" />
        <span contenteditable="true" class="task-text text-zinc-200 outline-none flex-1">Yeni Görev</span>
      </div>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, taskHtml);
    handleEditorChange();
  };

  /**
   * Insert image inline into the document text at the cursor position (with <p><br></p> below for continued typing)
   */
  const insertImageAtCursor = useCallback(
    (src: string, caption = '') => {
      if (!editorRef.current) return;
      const el = editorRef.current;
      el.focus();

      const imgHtml = `
        <div class="note-image-container my-6 select-none flex flex-col items-center justify-center text-center w-full" contenteditable="false" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: 1.5rem auto; width: 100%;">
          <div class="relative inline-flex flex-col items-center max-w-full group/img" style="display: inline-flex; flex-direction: column; align-items: center; max-width: 100%;">
            <div class="img-relative-wrapper relative inline-block max-w-full" style="position: relative; display: inline-block; max-width: 100%;">
              <img src="${src}" class="rounded-xl max-w-full max-h-[460px] mx-auto shadow-2xl border border-[#2e2e3e] object-contain block hover:scale-[1.005] transition-transform" alt="${caption || 'Görsel'}" style="margin: 0 auto; display: block; border-radius: 0.75rem; max-width: 100%; max-height: 460px;" />
              <button
                type="button"
                data-delete-img="true"
                class="delete-img-btn absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg opacity-90 group-hover/img:opacity-100 transition-all shadow-xl cursor-pointer border border-white/20 hover:scale-105 z-30 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md"
                title="Fotoğrafı Kaldır"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                <span>Kaldır</span>
              </button>
            </div>
            <div contenteditable="true" class="text-center text-xs text-zinc-400 mt-2 px-2 py-0.5 outline-none hover:text-zinc-200 w-full" style="text-align: center; margin-top: 0.5rem; width: 100%;" placeholder="Fotoğraf açıklaması ekleyin...">${caption || 'Fotoğraf Açıklaması'}</div>
          </div>
        </div>
        <p><br></p>
      `;

      let inserted = false;
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
          inserted = document.execCommand('insertHTML', false, imgHtml);
        }
      } catch {
        inserted = false;
      }

      if (!inserted) {
        el.innerHTML = (el.innerHTML || '<p><br></p>') + imgHtml;
      }

      attachDeleteButtons();

      // Automatically move cursor to the blank paragraph immediately following the inserted photo
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        const lastP = el.lastElementChild;
        if (lastP) {
          range.selectNodeContents(lastP);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } catch {}

      handleEditorChange();

      // Ensure it is also registered in canvasItems for seamless dual-mode canvas viewing
      const existsInCanvas = (note.canvasItems || []).some(
        (it) => it.type === 'image' && it.src === src
      );
      if (!existsInCanvas) {
        const existingImages = (note.canvasItems || []).filter((it) => it.type === 'image');
        let targetX = 80;
        let targetY = 80;
        if (existingImages.length > 0) {
          const last = existingImages[existingImages.length - 1];
          targetX = last.x + (last.width || 360) + 30;
          targetY = last.y;
          if (targetX > 1200) {
            targetX = 80;
            targetY = last.y + 320;
          }
        }
        const maxZ = Math.max(0, ...(note.canvasItems || []).map((it) => it.zIndex));
        const newItem: CanvasItem = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'image',
          x: targetX,
          y: targetY,
          width: 360,
          zIndex: maxZ + 1,
          src,
          caption: caption || 'Eklenen Fotoğraf',
        };

        onUpdateNote({
          canvasItems: [...(note.canvasItems || []), newItem],
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [note.canvasItems, handleEditorChange, onUpdateNote]
  );

  /**
   * File input picker handler (triggered from toolbar ribbon button)
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          insertImageAtCursor(base64, file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  /**
   * Direct Drag & Drop image files onto Document Editor
   */
  const handleDropImage = (e: React.DragEvent) => {
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          insertImageAtCursor(base64, files[0].name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(files[0]);
    }
  };

  /**
   * Handle image pasting directly from clipboard - inserts inline right at cursor!
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
              insertImageAtCursor(
                base64,
                file.name?.replace(/\.[^/.]+$/, '') || 'Yapıştırılan Fotoğraf'
              );
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  // Canvas images that are not yet embedded in the document text flow
  const uninsertedCanvasImages = useMemo(() => {
    const images = (note.canvasItems || []).filter((it) => it.type === 'image' && it.src);
    const content = note.content || '';
    return images.filter((img) => !content.includes(img.src!));
  }, [note.canvasItems, note.content]);

  // Insert all uninserted canvas images directly into document content
  const handleInsertAllCanvasImages = () => {
    if (uninsertedCanvasImages.length === 0 || !editorRef.current) return;
    let appendedHtml = '';
    uninsertedCanvasImages.forEach((img) => {
      appendedHtml += `
        <div class="note-image-container my-6 select-none flex flex-col items-center justify-center text-center w-full" contenteditable="false" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: 1.5rem auto; width: 100%;">
          <div class="relative inline-flex flex-col items-center max-w-full group/img" style="display: inline-flex; flex-direction: column; align-items: center; max-width: 100%;">
            <div class="img-relative-wrapper relative inline-block max-w-full" style="position: relative; display: inline-block; max-width: 100%;">
              <img src="${img.src}" class="rounded-xl max-w-full max-h-[460px] mx-auto shadow-2xl border border-[#2e2e3e] object-contain block hover:scale-[1.005] transition-transform" alt="${img.caption || 'Görsel'}" style="margin: 0 auto; display: block; border-radius: 0.75rem; max-width: 100%; max-height: 460px;" />
              <button
                type="button"
                data-delete-img="true"
                class="delete-img-btn absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg opacity-90 group-hover/img:opacity-100 transition-all shadow-xl cursor-pointer border border-white/20 hover:scale-105 z-30 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md"
                title="Fotoğrafı Kaldır"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                <span>Kaldır</span>
              </button>
            </div>
            <div contenteditable="true" class="text-center text-xs text-zinc-400 mt-2 px-2 py-0.5 outline-none hover:text-zinc-200 w-full" style="text-align: center; margin-top: 0.5rem; width: 100%;" placeholder="Fotoğraf açıklaması ekleyin...">${img.caption || 'Fotoğraf Açıklaması'}</div>
          </div>
        </div>
        <p><br></p>
      `;
    });

    editorRef.current.innerHTML = (editorRef.current.innerHTML || '<p><br></p>') + appendedHtml;
    attachDeleteButtons();
    handleEditorChange();
  };

  // Handle image caption edit
  const handleUpdateImageCaption = (itemId: string, caption: string) => {
    onUpdateNote({
      canvasItems: note.canvasItems.map((item) =>
        item.id === itemId ? { ...item, caption } : item
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  // Remove image
  const handleRemoveImage = (itemId: string) => {
    onUpdateNote({
      canvasItems: (note.canvasItems || []).filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    });
  };

  // Delegated click handler on the contentEditable editor to handle image deletion
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest('[data-delete-img="true"], .delete-img-btn');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();

      const container = deleteBtn.closest('.note-image-container') as HTMLElement | null;
      if (container) {
        handleDeleteImageFromEditor(container);
      }
    }
  };

  // Word & character counts
  const plainText = useMemo(() => {
    return note.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }, [note.content]);

  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const charCount = plainText.length;
  const imageItems = note.canvasItems.filter((i) => i.type === 'image');

  // Highlight counts (strictly parses HTML <mark> tags - zero false positives on base64 images)
  const highlightCounts = useMemo(() => {
    if (!note.content || !note.content.includes('<mark')) {
      return { yellow: 0, green: 0, blue: 0 };
    }
    let yellow = 0;
    let green = 0;
    let blue = 0;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, 'text/html');
      const marks = doc.querySelectorAll('mark');
      marks.forEach((m) => {
        const bg = (m.getAttribute('style') || '').toLowerCase();
        if (bg.includes('#fef08a') || bg.includes('254, 240, 138') || bg.includes('#fbbf24')) {
          yellow++;
        } else if (bg.includes('#bbf7d0') || bg.includes('187, 247, 208') || bg.includes('#34d399')) {
          green++;
        } else if (bg.includes('#bae6fd') || bg.includes('186, 230, 253') || bg.includes('#38bdf8')) {
          blue++;
        }
      });
    } catch {
      // ignore
    }
    return { yellow, green, blue };
  }, [note.content]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121216] select-text overflow-hidden">
      {/* Top Formatting Ribbon - Responsive Groups, Zero Cutoff, Zero Scrollbar */}
      <div className="bg-[#16161b] border-b border-[#23232c] px-2 py-1 flex flex-wrap items-center gap-1.5 select-none shrink-0 z-30">
        {/* Group 1: Typography, Styles & Colors */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <div className="flex items-center bg-[#1c1c24] rounded-lg border border-[#2b2b36] p-0.5 shrink-0">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd('formatBlock', '<h1>');
              }}
              className="p-1 text-zinc-300 hover:text-amber-400 hover:bg-[#252532] rounded transition-colors"
              title="Büyük Başlık (H1)"
            >
              <Heading1 size={13} />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd('formatBlock', '<h2>');
              }}
              className="p-1 text-zinc-300 hover:text-amber-400 hover:bg-[#252532] rounded transition-colors"
              title="Alt Başlık (H2)"
            >
              <Heading2 size={13} />
            </button>
          </div>

          {/* Inline Styles: Bold, Italic, Strikethrough */}
          <div className="flex items-center bg-[#1c1c24] rounded-lg border border-[#2b2b36] p-0.5 shrink-0">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd('bold');
              }}
              className="p-1 text-zinc-300 hover:text-white hover:bg-[#252532] rounded transition-colors"
              title="Kalın (Ctrl+B)"
            >
              <Bold size={13} />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd('italic');
              }}
              className="p-1 text-zinc-300 hover:text-white hover:bg-[#252532] rounded transition-colors"
              title="İtalik (Ctrl+I)"
            >
              <Italic size={13} />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd('strikeThrough');
              }}
              className="p-1 text-zinc-300 hover:text-white hover:bg-[#252532] rounded transition-colors"
              title="Üstü Çizili"
            >
              <Strikethrough size={13} />
            </button>
          </div>

          {/* Vurgu (Highlighter) Açılır Menüsü */}
          <div className="relative shrink-0" ref={highlightMenuRef}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setShowHighlightMenu((prev) => !prev);
                setShowTextColorMenu(false);
              }}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg border transition-all text-xs ${
                showHighlightMenu
                  ? 'bg-[#282836] border-amber-500/50 text-amber-400'
                  : 'bg-[#1c1c24] border-[#2b2b36] text-zinc-300 hover:text-amber-400 hover:bg-[#252532]'
              }`}
              title="Vurgu Rengi Seç (Arka Plan)"
              aria-label="Vurgu Rengi"
            >
              <Highlighter size={13} className="text-amber-400" />
              <ChevronDown size={10} className="text-zinc-400" />
            </button>

            {showHighlightMenu && (
              <div className="absolute top-full right-0 mt-1 bg-[#171720] border border-[#2e2e3e] rounded-xl shadow-2xl p-2 z-50 w-44 max-h-80 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold tracking-wider text-zinc-400 px-2 py-0.5 uppercase border-b border-[#252534] mb-1.5 flex items-center justify-between">
                  <span>Vurgu Rengi</span>
                  <Highlighter size={11} className="text-amber-400" />
                </div>

                <div className="space-y-0.5">
                  {Object.entries(HIGHLIGHT_PRESETS).map(([key, config]) => (
                    <button
                      key={key}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyHighlight(key as HighlightColor);
                        setShowHighlightMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-zinc-200 hover:bg-[#222230] transition-colors"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: config.bg }}
                      />
                      <span className="flex-1 text-left font-medium">{config.name}</span>
                      {activeHighlight === key && <Check size={12} className="text-amber-400" />}
                    </button>
                  ))}
                </div>

                <div className="h-[1px] bg-[#252534] my-1" />

                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    removeFormatting();
                    setShowHighlightMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <X size={12} className="text-zinc-500" />
                  <span className="flex-1 text-left">Vurguyu Temizle</span>
                </button>
              </div>
            )}
          </div>

          {/* Yazı Rengi Açılır Menüsü */}
          <div className="relative shrink-0" ref={textColorMenuRef}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setShowTextColorMenu((prev) => !prev);
                setShowHighlightMenu(false);
              }}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg border transition-all text-xs ${
                showTextColorMenu
                  ? 'bg-[#282836] border-amber-500/50 text-amber-400'
                  : 'bg-[#1c1c24] border-[#2b2b36] text-zinc-300 hover:text-amber-400 hover:bg-[#252532]'
              }`}
              title="Metin Yazı Rengi"
              aria-label="Yazı Rengi"
            >
              <div className="flex flex-col items-center justify-center leading-none">
                <span className="font-bold text-[11px] text-zinc-100">A</span>
                <span className="w-2.5 h-[2px] bg-amber-400 rounded-full" />
              </div>
              <ChevronDown size={10} className="text-zinc-400" />
            </button>

            {showTextColorMenu && (
              <div className="absolute top-full right-0 mt-1 bg-[#171720] border border-[#2e2e3e] rounded-xl shadow-2xl p-2 z-50 w-44 max-h-80 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold tracking-wider text-zinc-400 px-2 py-0.5 uppercase border-b border-[#252534] mb-1.5 flex items-center justify-between">
                  <span>Yazı Rengi</span>
                  <Type size={11} className="text-zinc-300" />
                </div>

                <div className="space-y-0.5">
                  {TEXT_COLOR_PRESETS.map((item) => (
                    <button
                      key={item.color}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyTextColor(item.color);
                        setShowTextColorMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs hover:bg-[#222230] transition-colors"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 text-left font-medium" style={{ color: item.color }}>
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="h-[1px] bg-[#252534] my-1" />

                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyTextColor('#f4f4f5');
                    setShowTextColorMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#222230] transition-colors"
                >
                  <span className="w-3 h-3 rounded-full bg-zinc-200 shrink-0" />
                  <span className="flex-1 text-left">Varsayılan Beyaz</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Group 2: Lists, Structure & Voice Dictation */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-[#1c1c24] rounded-lg border border-[#2b2b36] p-0.5 shrink-0">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                insertChecklist();
              }}
              className="p-1 text-zinc-300 hover:text-amber-400 hover:bg-[#252532] rounded transition-colors"
              title="Kontrol Listesi / Görev Kutucuğu Ekle"
            >
              <CheckSquare size={13} />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd('insertUnorderedList');
              }}
              className="p-1 text-zinc-300 hover:text-white hover:bg-[#252532] rounded transition-colors"
              title="Madde İşaretli Liste"
            >
              <List size={13} />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd('formatBlock', '<blockquote>');
              }}
              className="p-1 text-zinc-300 hover:text-white hover:bg-[#252532] rounded transition-colors"
              title="Alıntı Kutusu"
            >
              <Quote size={13} />
            </button>
          </div>

          <div className="w-[1px] h-3.5 bg-[#282834] mx-0.5 shrink-0" />

          {/* Sesle Dikte / Mikrofon Butonu */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleListening();
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
              isListening
                ? 'bg-red-500/25 border-red-500/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse'
                : 'bg-[#1c1c24] border-[#2b2b36] text-zinc-300 hover:text-amber-400 hover:bg-[#252532]'
            }`}
            title={isListening ? 'Mikrofonu Kapat' : 'Sesle Not Yaz (Mikrofon ile Konuşarak Dikte)'}
          >
            {isListening ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <Mic size={13} className="text-red-400" />
                <span className="text-[11px] text-red-300 font-semibold">Dinleniyor...</span>
              </>
            ) : (
              <>
                <Mic size={13} className="text-amber-400" />
                <span className="text-[11px] hidden sm:inline text-zinc-300">Sesle Yaz</span>
              </>
            )}
          </button>

          {/* Fotoğraf Ekle Butonu - Metin içine inline görsel ekler */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#2b2b36] bg-[#1c1c24] text-zinc-300 hover:text-amber-400 hover:bg-[#252532] text-xs font-medium transition-all shrink-0"
            title="Yazı Arasına Fotoğraf Ekle (veya doğrudan Ctrl+V yapıştırın)"
          >
            <ImageIcon size={13} className="text-amber-400" />
            <span className="text-[11px] hidden sm:inline text-zinc-300">Fotoğraf Ekle</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {/* Sesle Dinleme Canlı Durum ve Transkripsiyon Çubuğu */}
      {isListening && (
        <div className="bg-gradient-to-r from-red-950/60 via-[#1e1b24] to-[#16161b] border-b border-red-500/40 px-3 py-2 flex items-center justify-between gap-3 text-xs text-zinc-200 animate-in slide-in-from-top-1 z-20 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-semibold text-red-400 text-[11px] uppercase tracking-wider">Mikrofon Açık</span>
            </div>
            <span className="text-amber-300 text-xs truncate font-medium">
              {interimText ? `"${interimText}..."` : 'Şimdi konuşun; söyledikleriniz doğrudan nota dökülecek...'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {interimText && (
              <button
                onClick={() => {
                  insertDictationText(interimText);
                  setInterimText('');
                }}
                className="px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-colors"
                title="Şu an duyulan kelimeleri hemen metne ekle"
              >
                Hemen Ekle
              </button>
            )}
            <button
              onClick={stopListening}
              className="px-2.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] font-medium transition-colors shrink-0"
            >
              Dikteyi Bitir
            </button>
          </div>
        </div>
      )}

      {/* Mikrofon Hata veya İzin Uyarısı */}
      {speechError && (
        <div className="bg-red-950/60 border-b border-red-600/40 px-3 py-1.5 flex items-center justify-between text-xs text-red-300 animate-in slide-in-from-top-1 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="text-red-400 hover:text-red-200 text-xs px-1.5 py-0.5"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Editor Main Scroll Area */}
      <div
        ref={scrollContainerRef}
        onClick={(e) => {
          if (e.target === scrollContainerRef.current) {
            editorRef.current?.focus();
          }
        }}
        className="flex-1 px-3 py-4 sm:px-6 md:px-10 w-full overflow-y-auto cursor-text"
      >
        <div className="max-w-3xl mx-auto pb-28">
          {/* Note Title Input */}
          <input
            type="text"
            value={note.title}
            onChange={(e) =>
              onUpdateNote({
                title: e.target.value,
                updatedAt: new Date().toISOString(),
              })
            }
            placeholder="Başlık..."
            className="w-full bg-transparent text-xl md:text-2xl font-bold text-zinc-100 placeholder:text-zinc-600 focus:outline-none mb-2 pb-1.5 border-b border-[#22222a] leading-tight caret-amber-400"
          />

          {/* Metadata Row: Date, Word Count, Highlight Stats */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-mono select-none flex-wrap">
            <Clock size={12} />
            <span>{new Date(note.updatedAt).toLocaleString('tr-TR')}</span>
            <span>·</span>
            <span>{wordCount} kelime</span>
            {folders && onMoveFolder && (
              <>
                <span>·</span>
                <div className="relative inline-flex items-center">
                  <select
                    value={note.folderId}
                    onChange={(e) => onMoveFolder(e.target.value)}
                    className="bg-[#181820] text-[11px] text-amber-400 font-sans px-2 py-0.5 rounded border border-[#2b2b38] focus:outline-none cursor-pointer hover:border-amber-500/50"
                    title="Notun Klasörünü Değiştir"
                  >
                    {folders
                      .filter((f) => f.id !== 'all' && f.id !== 'trash')
                      .map((f) => (
                        <option key={f.id} value={f.id} className="bg-[#16161d] text-zinc-200">
                          📁 {f.name}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}
            {imageItems.length > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-400 font-sans">{imageItems.length} Fotoğraf</span>
              </>
            )}

            {/* Active Highlight Badges */}
            {(highlightCounts.yellow > 0 ||
              highlightCounts.green > 0 ||
              highlightCounts.blue > 0) && (
              <>
                <span>·</span>
                <div className="inline-flex items-center gap-1.5 font-sans">
                  {highlightCounts.yellow > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {highlightCounts.yellow} sarı
                    </span>
                  )}
                  {highlightCounts.green > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {highlightCounts.green} yeşil
                    </span>
                  )}
                  {highlightCounts.blue > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-sky-300 bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.2 rounded font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      {highlightCounts.blue} mavi
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* TRUE WYSIWYG RICH-TEXT CONTENTEDITABLE CONTAINER */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onClick={handleEditorClick}
            onInput={handleEditorChange}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              // Ctrl+Shift+H: Sarı Vurgu (Yellow Background)
              if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                applyHighlight('yellow');
              }
              // Ctrl+Shift+Y: Sarı Yazı Rengi (Direct Yellow Text)
              else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                applyTextColor('#fbbf24');
              }
              // Ctrl+B: Bold
              else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                execCmd('bold');
              }
              // Ctrl+I: Italic
              else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                execCmd('italic');
              }
              // Tab: Indent
              else if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                handleEditorChange();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropImage}
            data-placeholder="Notlarınızı buraya yazın veya doğrudan fotoğraf yapıştırın (Ctrl+V)..."
            className="w-full text-base text-zinc-200 focus:outline-none leading-relaxed font-sans min-h-[360px] empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600 empty:before:pointer-events-none prose-invert [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-zinc-100 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-zinc-200 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-zinc-300 [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-500/70 [&_blockquote]:bg-[#16161e]/60 [&_blockquote]:pl-3.5 [&_blockquote]:py-1.5 [&_blockquote]:my-2.5 [&_blockquote]:rounded-r [&_blockquote]:italic [&_blockquote]:text-zinc-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_code]:bg-[#202028] [&_code]:text-amber-300 [&_code]:font-mono [&_code]:text-xs [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:border [&_code]:border-[#2e2e3a]"
          />

          {/* Photos that exist on Canvas but are not yet embedded into the text flow */}
          {uninsertedCanvasImages.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#23232c] space-y-3 select-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-amber-400" />
                  Tuvalde Ekli Olan Fotoğraflar ({uninsertedCanvasImages.length})
                </span>
                <button
                  type="button"
                  onClick={handleInsertAllCanvasImages}
                  className="px-2.5 py-1 text-xs font-semibold text-black bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors shadow-sm"
                  title="Bu fotoğrafları doğrudan yukarıdaki metnin altına ekle"
                >
                  Tümünü Metnin Altına Ekle
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Bu fotoğraflar tuvalde yer alıyor. Metninizin içine dahil etmek için fotoğrafa veya yukarıdaki butona tıklayın:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {uninsertedCanvasImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => insertImageAtCursor(img.src!, img.caption)}
                    className="relative group bg-[#16161c] rounded-xl border border-[#2b2b36] hover:border-amber-500/70 overflow-hidden shadow-lg cursor-pointer transition-all hover:scale-[1.02]"
                    title="Bu fotoğrafı metin içine ekle"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(img.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-zinc-300 hover:text-white transition-all shadow-md z-10 opacity-0 group-hover:opacity-100 border border-white/10"
                      title="Bu fotoğrafı sil"
                    >
                      <Trash2 size={13} />
                    </button>
                    <div className="aspect-video w-full bg-[#0e0e12] flex items-center justify-center overflow-hidden">
                      <img
                        src={img.src}
                        alt={img.caption || 'Fotoğraf'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2 bg-[#17171e] border-t border-[#23232c] flex items-center justify-between text-xs">
                      <span className="text-zinc-300 truncate text-[11px] font-medium">{img.caption || 'Fotoğraf'}</span>
                      <span className="text-amber-400 font-semibold text-[10px] shrink-0 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">+ Ekle</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Status Bar */}
      <footer className="h-7 bg-[#101014] border-t border-[#1e1e24] px-4 flex items-center justify-between text-[11px] text-zinc-500 select-none shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span>{wordCount} kelime</span>
          <span>·</span>
          <span>{charCount} karakter</span>
          {(highlightCounts.yellow > 0 ||
            highlightCounts.green > 0 ||
            highlightCounts.blue > 0) && (
            <>
              <span>·</span>
              <span className="text-zinc-400 font-sans hidden sm:inline">
                {highlightCounts.yellow + highlightCounts.green + highlightCounts.blue} vurgulanan kısım
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Otomatik Kaydedildi</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        </div>
      </footer>
    </div>
  );
};
