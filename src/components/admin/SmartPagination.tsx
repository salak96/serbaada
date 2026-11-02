import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SmartPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
}

function getPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  const start = Math.max(2, currentPage - 2);
  const end = Math.min(totalPages - 1, currentPage + 2);

  for (let page = start; page <= end; page += 1) pages.add(page);

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) items.push('ellipsis');
    items.push(page);
  });

  return items;
}

export function SmartPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50],
  loading = false
}: SmartPaginationProps) {
  const hasItems = totalItems > 0;
  const totalPages = hasItems ? Math.ceil(totalItems / pageSize) : 0;
  const safePage = hasItems ? Math.min(Math.max(currentPage, 1), totalPages) : 0;
  const startItem = hasItems ? (safePage - 1) * pageSize + 1 : 0;
  const endItem = hasItems ? Math.min(safePage * pageSize, totalItems) : 0;
  const pageItems = hasItems ? getPageItems(safePage, totalPages) : [];

  const handlePageSizeChange = (size: number) => {
    onPageSizeChange(size);
    onPageChange(1);
  };

  return (
    <div className="w-full px-4 sm:px-5 py-4 bg-[#13243C] border-t border-[#243650] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#94A3B8]">
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
        <span>
          Menampilkan <strong className="text-[#F8FAFC]">{startItem}–{endItem}</strong> dari{' '}
          <strong className="text-[#F8FAFC]">{totalItems}</strong> data
        </span>
        <label className="flex items-center gap-1.5 whitespace-nowrap">
          Per halaman:
          <select
            value={pageSize}
            onChange={(event) => handlePageSizeChange(Number(event.target.value))}
            disabled={loading}
            className="bg-[#080F1F] border border-[#243650] rounded-lg px-2 py-1 text-[#F8FAFC] text-xs focus:outline-none focus:border-[#1677FF]"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={loading || !hasItems || safePage === 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#080F1F] hover:bg-[#1A263D] disabled:opacity-30 border border-[#243650] text-[#F8FAFC] font-bold transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {pageItems.map((item, index) => item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-[#94A3B8]">…</span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={loading}
              onClick={() => onPageChange(item)}
              className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-colors ${
                safePage === item
                  ? 'bg-[#1677FF] text-white shadow-sm'
                  : 'bg-[#080F1F] text-[#94A3B8] hover:text-white border border-[#243650]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <span className="sm:hidden px-2 font-bold text-[#F8FAFC]">{safePage} / {totalPages}</span>

        <button
          type="button"
          disabled={loading || !hasItems || safePage === totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#080F1F] hover:bg-[#1A263D] disabled:opacity-30 border border-[#243650] text-[#F8FAFC] font-bold transition-colors"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
