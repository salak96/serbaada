export interface ProductVariant {
  id: string;
  name: string;
  account_type: 'private' | 'share';
  duration: string;
  selling_price: number;
  cost_price?: number;
  stock: number;
  is_active?: number;
}

export interface Product {
  id: string | number;
  name: string;
  oldPrice: number;
  price: number;
  discount: number;
  image: string;
  category: string;
  availability?: 'in_stock' | 'out_of_stock';
  stock?: number;
  description?: string;
  requires_email?: boolean;
  provider?: 'Prs Digital' | 'Abellab Reseller' | 'Produk Manual' | string;
  isWholesale?: boolean;
  wholesaleMin?: number;
  wholesalePrice?: number;
  recipientEmail?: string;
  recipientId?: string;
  variants?: ProductVariant[];
}

export interface CartItem extends Product {
  quantity: number;
  variantId?: string;
  variantName?: string;
  variantAccountType?: string;
  variantDuration?: string;
}
