import { Sparkles } from 'lucide-react';
import { Product } from '../types/product';
import { ProductCard } from './ProductCard';

interface CategorySectionProps {
  category: string;
  products: Product[];
  cartProductIds: Set<string | number>;
  onAddToCart: (product: Product) => void;
  onRemove: (productId: string | number) => void;
  onOpenDetail?: (product: Product) => void;
}

export function CategorySection({
  category,
  products,
  cartProductIds,
  onAddToCart,
  onRemove,
  onOpenDetail
}: CategorySectionProps) {
  return (
    <section className="mb-10 sm:mb-14">
      {/* Section Header with badge and accent line */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-[#111A2B] border border-[#BFDBFE] dark:border-[#26364D] flex items-center justify-center text-[#2583F7] dark:text-[#38BDF8] shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
              {category}
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#111A2B] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#26364D]">
              {products.length} produk
            </span>
          </div>
        </div>

        <div className="hidden sm:block flex-1 h-[2px] bg-gradient-to-r from-[#2583F7]/40 via-[#E2E8F0] dark:via-[#26364D] to-transparent rounded-full ml-4" />
      </div>

      {/* Product Grid: 5 columns on desktop, 4 on laptop, 2-3 on tablet/mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            isInCart={cartProductIds.has(product.id)}
            onAddToCart={onAddToCart}
            onRemove={onRemove}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </section>
  );
}
