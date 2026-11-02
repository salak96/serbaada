import { ExternalLink, Link2, BookOpen } from 'lucide-react';

interface FormattedDescriptionProps {
  text: string;
  isDarkMode?: boolean;
}

export function FormattedDescription({ text, isDarkMode = false }: FormattedDescriptionProps) {
  if (!text) return null;

  const sanitizeDescription = (str: string): string => {
    if (!str) return '';
    return str
      .replace(/abellstore(\s*🙏)?/gi, '')
      .replace(/abellab(\s*reseller)?/gi, '')
      .replace(/prs\s*digital/gi, '')
      .replace(/geraikita/gi, '')
      .trim();
  };

  const sanitized = sanitizeDescription(text);

  // Split text by URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = sanitized.split(urlRegex);

  return (
    <div className={`space-y-2 text-xs sm:text-sm leading-relaxed break-words overflow-hidden max-w-full ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          let label = '🔗 Kunjungi Tautan';
          let icon = <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />;
          const lower = part.toLowerCase();
          if (lower.includes('docs.google.com') || lower.includes('document') || lower.includes('docs')) {
            label = '📖 Buka Panduan & Dokumentasi';
            icon = <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />;
          } else if (lower.includes('usage') || lower.includes('config') || lower.includes('redeem')) {
            label = '⚡️ Akses Portal & Redeem API';
            icon = <Link2 className="w-3.5 h-3.5 flex-shrink-0" />;
          }

          return (
            <div key={index} className="my-2.5">
              <a
                href={part}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs border max-w-full truncate ${
                  isDarkMode
                    ? 'bg-[#1677FF]/15 text-[#38BDF8] hover:bg-[#1677FF] hover:text-white border-[#1677FF]/40'
                    : 'bg-[#EFF6FF] text-[#2583F7] hover:bg-[#2583F7] hover:text-white border-[#BFDBFE]'
                }`}
                title={part}
              >
                {icon}
                <span className="truncate">{label}</span>
              </a>
            </div>
          );
        }

        // Normal text lines
        return (
          <p key={index} className="whitespace-pre-line break-words overflow-hidden max-w-full">
            {part}
          </p>
        );
      })}
    </div>
  );
}
