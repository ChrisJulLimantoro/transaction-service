import { z } from 'zod';

export class CreateTypeRequest {
  id: string;
  name: string;
  code: string;
  category_id: string;
  percent_price_reduction: number;
  fixed_price_reduction: number;
  percent_broken_reduction: number;
  fixed_broken_reduction: number;

  constructor({
    id,
    name,
    code,
    category_id,
    percent_price_reduction,
    fixed_price_reduction,
    percent_broken_reduction,
    fixed_broken_reduction,
  }: CreateTypeRequest) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.category_id = category_id;
    this.percent_price_reduction = Number(percent_price_reduction);
    this.fixed_price_reduction = Number(fixed_price_reduction);
    this.percent_broken_reduction = Number(percent_broken_reduction);
    this.fixed_broken_reduction = Number(fixed_broken_reduction);
  }

  static schema() {
    return z.object({
      id: z.string().uuid(),
      name: z.string().min(3).max(255),
      code: z.string().max(15),
      category_id: z.string().uuid(),
      percent_price_reduction: z.number().min(0).max(100),
      fixed_price_reduction: z.number().min(0),
      percent_broken_reduction: z.number().min(0).max(100),
      fixed_broken_reduction: z.number().min(0),
    });
  }
}
