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
}

export interface CartItem extends Product {
  quantity: number;
}
