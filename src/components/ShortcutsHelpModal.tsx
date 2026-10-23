import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Keyboard,
  Search,
  FileText,
  LayoutGrid,
  Sparkles,
  Command,
  Maximize2,
  Minimize2,
  Eye,
  FolderOpen,
  MousePointer,
  HelpCircle
} from 'lucide-react';

export interface ShortcutItem {
  id: string;
  category: 'general' | 'window' | 'editor' | 'canvas';
  title: string;
  description: string;
  keys: string[];
  badge?: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // Genel Kısayollar
  {
    id: 'new-note',
    category: 'general',
    title: 'Yeni Not Oluştur',
    description: 'Hızlıca yeni bir çalışma sayfası veya not açar',
    keys: ['Ctrl', 'N'],
    badge: 'Sık Kullanılan'
  },
  {
    id: 'export-note',
    category: 'general',
    title: 'Dışa Aktar & Paylaş',
    description: 'Notu Markdown (.md) veya yazdırılabilir PDF olarak kaydeder',
    keys: ['Ctrl', 'P'],
    badge: 'Sık Kullanılan'
  },
  {
    id: 'search-notes',
    category: 'general',
    title: 'Notlarda Arama Yap',
    description: 'Başlık ve not içeriklerinde anında arama başlatır',
    keys: ['Ctrl', 'F']
  },
  {
    id: 'open-shortcuts',
    category: 'general',
    title: 'Klavye Kısayolları & Yardım',
    description: 'Bu yardım ve kısayol rehberi penceresini açar',
    keys: ['Ctrl', '/']
  },
  {
    id: 'close-modal',
    category: 'general',
    title: 'Pencere / Modalı Kapat',
    description: 'Açık olan modalı veya tam ekran modunu sonlandırır',
    keys: ['Esc']
  },

  // Pencere & Görünüm Kontrolleri
  {
    id: 'close-tab',
    category: 'window',
    title: 'Aktif Sekmeyi Kapat',
    description: 'Sol üstteki Kırmızı Daire (●) veya Ctrl+W ile sekmeyi kapatır',
    keys: ['Ctrl', 'W'],
    badge: 'Kırmızı Daire'
  },
  {
    id: 'toggle-focus',
    category: 'window',
    title: 'Odak Modu (Focus Mode)',
    description: 'Sol üstteki Sarı Daire (●) ile yan panelleri gizler, yazı alanını genişletir',
    keys: ['Ctrl', 'Shift', 'F'],
    badge: 'Sarı Daire'
  },
  {
    id: 'toggle-fullscreen',
    category: 'window',
    title: 'Uygulamayı Tam Ekran Yap',
    description: 'Sol üstteki Yeşil Daire (●) veya F11 ile tam ekran deneyimi sunar',
    keys: ['F11'],
    badge: 'Yeşil Daire'
  },
  {
    id: 'toggle-sidebar',
    category: 'window',
    title: 'Klasör Menüsünü Aç / Kapat',
    description: 'Sol klasör hiyerarşi panelini daraltır veya genişletir',
    keys: ['Ctrl', 'B']
  },

  // Metin & Belge Editörü
  {
    id: 'text-bold',
    category: 'editor',
    title: 'Kalın Metin Yap',
    description: 'Seçili metni **kalın** biçime dönüştürür',
    keys: ['Ctrl', 'B']
  },
  {
    id: 'text-italic',
    category: 'editor',
    title: 'İtalik Metin Yap',
    description: 'Seçili metni *italik* biçime dönüştürür',
    keys: ['Ctrl', 'I']
  },
  {
    id: 'heading-1',
    category: 'editor',
    title: 'Ana Başlık (H1)',
    description: 'Satır başına "# " ekleyerek büyük ana başlık oluşturur',
    keys: ['#', 'Boşluk']
  },
  {
    id: 'heading-2',
    category: 'editor',
    title: 'Alt Başlık (H2)',
    description: 'Satır başına "## " ekleyerek alt bölüm başlığı oluşturur',
    keys: ['##', 'Boşluk']
  },
  {
    id: 'task-list',
    category: 'editor',
    title: 'Kontrol Listesi / Görev',
    description: 'Satır başına "- [ ] " ekleyerek işaretlenebilir kutucuk açar',
    keys: ['-', '[', ']', 'Boşluk']
  },
  {
    id: 'text-highlight',
    category: 'editor',
    title: 'Metin Vurgula (Fosforlu Sarı / Yeşil / Mavi)',
    description: 'Seçili metne anında Sarı, Yeşil veya Mavi arka plan vurgusu uygular',
    keys: ['Ctrl', 'Shift', 'H'],
    badge: 'Fosforlu Vurgu'
  },
  {
    id: 'text-color-yellow',
    category: 'editor',
    title: 'Sarı Yazı Rengi',
    description: 'Seçili metnin yazı rengini doğrudan canlı sarıya dönüştürür',
    keys: ['Ctrl', 'Shift', 'Y'],
    badge: 'Yazı Rengi'
  },
  {
    id: 'paste-image',
    category: 'editor',
    title: 'Görsel / Ekran Görüntüsü Yapıştır',
    description: 'Panodan kopyalanmış herhangi bir resmi doğrudan nota ekler',
    keys: ['Ctrl', 'V'],
    badge: 'Otomatik'
  },
  {
    id: 'voice-dictation',
    category: 'editor',
    title: 'Sesle Not Yaz (Mikrofon ile Dikte)',
    description: 'Araç çubuğundaki mikrofon butonuna basıp konuşun; sesiniz anında metne dökülür',
    keys: ['🎤 Sesle Yaz'],
    badge: 'Yeni Özellik'
  },

  // Serbest Tuval (Canvas)
  {
    id: 'canvas-pan',
    category: 'canvas',
    title: 'Sonsuz Tuvalde Gezin (Pan)',
    description: 'Boşluk tuşuna basılı tutarak fare ile tuvali dilediğiniz yöne kaydırın',
    keys: ['Space', '+', 'Sürükle'],
    badge: 'Uzay Modu'
  },
  {
    id: 'canvas-zoom',
    category: 'canvas',
    title: 'Yakınlaştır & Uzaklaştır (Zoom)',
    description: 'Fare tekerleği veya touchpad ile tuvali %25 ila %300 büyütüp küçültün',
    keys: ['Tekerlek / İki Parmak'],
    badge: 'Akıcı Zoom'
  },
  {
    id: 'canvas-draw',
    category: 'canvas',
    title: 'Serbest Çizim Modu',
    description: 'Fırça aracını seçerek tuval üzerine el yazısı veya kroki çizin',
    keys: ['Fırça Aracı']
  },
  {
    id: 'canvas-drag-card',
    category: 'canvas',
    title: 'Görsel ve Not Kartlarını Taşıma',
    description: 'Öğeyi sol tıkla basılı tutup tuvalin herhangi bir yerine taşıyın',
    keys: ['Sol Tık', 'Sürükle']
  },
  {
    id: 'canvas-resize-card',
    category: 'canvas',
    title: 'Kart Boyutlandırma',
    description: 'Kartın sağ alt köşesindeki tutamaktan çekerek yeniden boyutlandırın',
    keys: ['Köşe Tutamacı']
  },
  {
    id: 'folder-drag-drop',
    category: 'general',
    title: 'Klasöre Sürükle & Bırak',
    description: 'Not listesindeki bir notu sol menüdeki klasörün üzerine sürükleyerek taşıyın',
    keys: ['Not Kartı', '→', 'Klasör'],
    badge: 'Düzenleme'
  }
];

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'window' | 'editor' | 'canvas'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredShortcuts = useMemo(() => {
    return SHORTCUTS.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.category === activeCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#141418] border border-[#2b2b36] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242430] bg-[#18181f]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Keyboard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">
                  Klavye Kısayolları & Hızlı Kullanım
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full">
                  Pro Rehber
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Not Defteri Pro'yu masaüstü hızında kullanmanız için tüm kısayollar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#252530] rounded-lg transition-colors focus:outline-none"
            title="Kapat (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-[#242430] bg-[#121216] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f28]'
              }`}
            >
              Tümü ({SHORTCUTS.length})
            </button>
            <button
              onClick={() => setActiveCategory('general')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeCategory === 'general'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f28]'
              }`}
            >
              Genel
            </button>
            <button
              onClick={() => setActiveCategory('window')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeCategory === 'window'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f28]'
              }`}
            >
              Pencereler
            </button>
            <button
              onClick={() => setActiveCategory('editor')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeCategory === 'editor'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f28]'
              }`}
            >
              Metin & Markdown
            </button>
            <button
              onClick={() => setActiveCategory('canvas')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeCategory === 'canvas'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f28]'
              }`}
            >
              Serbest Tuval
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kısayollarda ara..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#1a1a22] text-zinc-200 placeholder-zinc-500 border border-[#2b2b38] rounded-lg focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 divide-y divide-[#1e1e28]">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center">
              <HelpCircle size={36} className="mx-auto text-zinc-600 mb-2" />
              <p className="text-sm font-medium text-zinc-400">
                "{searchQuery}" için kısayol bulunamadı.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                Filtreyi temizle
              </button>
            </div>
          ) : (
            filteredShortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-4 group hover:bg-[#1c1c24]/50 p-2 rounded-xl transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-amber-300 transition-colors">
                      {shortcut.title}
                    </span>
                    {shortcut.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700/80">
                        {shortcut.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                    {shortcut.description}
                  </p>
                </div>

                {/* Key Badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {shortcut.keys.map((key, idx) => {
                    if (key === '+' || key === '→') {
                      return (
                        <span key={idx} className="text-zinc-500 text-xs font-semibold px-0.5">
                          {key}
                        </span>
                      );
                    }
                    return (
                      <kbd
                        key={idx}
                        className="min-w-[24px] px-2 py-1 text-center text-xs font-mono font-semibold text-zinc-200 bg-[#22222c] border border-[#353545] rounded-md shadow-[0_2px_0_0_#15151c] group-hover:border-amber-500/40 group-hover:text-amber-200 transition-all"
                      >
                        {key}
                      </kbd>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer / Helpful Tip */}
        <div className="px-6 py-3.5 border-t border-[#242430] bg-[#121216] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong className="text-zinc-300">İpucu:</strong> Tuvalde <kbd className="px-1.5 py-0.5 bg-[#22222a] border border-[#353545] rounded text-[11px] text-amber-400 font-mono">Boşluk (Space)</kbd> tuşuna basılı tutarak fareyle uzay boşluğunda özgürce kayabilirsiniz!
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 text-xs font-medium text-zinc-200 bg-[#22222c] hover:bg-[#2c2c38] border border-[#353545] rounded-lg transition-colors"
          >
            Tamam, Anladım
          </button>
        </div>
      </div>
    </div>
  );
};
