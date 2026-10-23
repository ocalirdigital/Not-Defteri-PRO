import React from 'react';
import { X, FileDown, Copy, Printer, Check, FileText } from 'lucide-react';
import { Note } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  note,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !note) return null;

  const getFormattedContent = () => {
    return note.content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h1>/gi, '\n\n')
      .replace(/<\/h2>/gi, '\n\n')
      .replace(/<\/h3>/gi, '\n\n')
      .replace(/<h1[^>]*>/gi, '# ')
      .replace(/<h2[^>]*>/gi, '## ')
      .replace(/<h3[^>]*>/gi, '### ')
      .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
      .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  const handleDownloadMarkdown = () => {
    let mdContent = `# ${note.title}\n\n${getFormattedContent()}\n\n`;

    if (note.canvasItems.length > 0) {
      mdContent += `\n## Tuval Notları ve Görseller\n\n`;
      note.canvasItems.forEach((item, index) => {
        if (item.type === 'image') {
          mdContent += `### Görsel ${index + 1}\n- Açıklama: ${item.caption || 'Yok'}\n\n`;
        } else {
          mdContent += `- ${item.text || ''}\n`;
        }
      });
    }

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_-]/g, '_') || 'not'}.md`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(`${note.title}\n\n${getFormattedContent()}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#18181f] border border-[#2b2b36] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 border-b border-[#24242e] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <FileDown size={15} className="text-amber-500" />
            Notu Dışa Aktar
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          <p className="text-xs text-zinc-400 mb-3">
            <span className="text-zinc-200 font-semibold">{note.title}</span> başlıklı notunuzu dışarıya aktarın:
          </p>

          <button
            onClick={handleDownloadMarkdown}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#202028] hover:bg-[#282834] text-xs text-zinc-200 border border-[#2e2e3a] transition-colors"
          >
            <FileText size={16} className="text-amber-400" />
            <div className="text-left">
              <div className="font-medium">Markdown (.md) Olarak İndir</div>
              <div className="text-[11px] text-zinc-500">Not defteri formatı</div>
            </div>
          </button>

          <button
            onClick={handleCopyText}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#202028] hover:bg-[#282834] text-xs text-zinc-200 border border-[#2e2e3a] transition-colors"
          >
            {copied ? (
              <Check size={16} className="text-amber-400" />
            ) : (
              <Copy size={16} className="text-amber-400" />
            )}
            <div className="text-left">
              <div className="font-medium">
                {copied ? 'Panoya Kopyalandı!' : 'Metni Kopyala'}
              </div>
              <div className="text-[11px] text-zinc-500">Panoya tüm metni kopyalar</div>
            </div>
          </button>

          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#202028] hover:bg-[#282834] text-xs text-zinc-200 border border-[#2e2e3a] transition-colors"
          >
            <Printer size={16} className="text-amber-400" />
            <div className="text-left">
              <div className="font-medium">Yazdır / PDF Olarak Kaydet</div>
              <div className="text-[11px] text-zinc-500">Tarayıcı yazdırma penceresi</div>
            </div>
          </button>
        </div>

        <div className="px-4 py-3 bg-[#131317] border-t border-[#24242e] text-[11px] text-zinc-500 flex justify-between items-center">
          <span>Kısayol: Ctrl + P</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
