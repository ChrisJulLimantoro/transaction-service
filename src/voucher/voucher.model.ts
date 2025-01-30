export class VoucherResponse {
  voucher_owned_id: string;
  voucher_id: string;
  voucher_name: string;
  discount_amount: number;
  max_discount: number;
  minimum_purchase: number; // Match with `min_purchase` in the model
  poin_price: number;
  description?: string;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  store: StoreResponse;
  created_at: Date;
  updated_at: Date;
}

export class StoreResponse {
  store_id: string;
  store_name: string;
  longitude: number;
  latitude: number;
  created_at: Date;
  image_url?: string;
}

export class VoucherRequest {
  voucher_name: string;
  discount_amount: number;
  max_discount: number;
  minimum_purchase: number; // Match with `min_purchase` in the model
  poin_price: number;
  description?: string;
  start_date: string; // As ISO string
  end_date: string; // As ISO string
  is_active: boolean;
  store_id: string;
}
