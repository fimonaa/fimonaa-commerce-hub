export type SalesChannelCode = 'shopify' | 'myntra' | 'ajio' | 'nykaa';

export type InternalOrderStatus =
  | 'imported'
  | 'validated'
  | 'reserved'
  | 'processing'
  | 'fulfilled'
  | 'cancelled'
  | 'returned'
  | 'exception';

export interface ProductRecord {
  externalId: string;
  sku: string;
  title: string;
  size?: string;
  color?: string;
  barcode?: string;
}

export interface OrderRecord {
  externalOrderId: string;
  channel: SalesChannelCode;
  currency: string;
  status: string;
  items: Array<{
    externalLineItemId: string;
    sku: string;
    quantity: number;
    unitPrice?: number;
  }>;
}
