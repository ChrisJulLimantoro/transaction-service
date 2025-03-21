import { z } from 'zod';

export class UpdateTypeRequest {
  name: string | null;
  code: string | null;
  percent_price_reduction: number;
  fixed_price_reduction: number;
  percent_broken_reduction: number;
  fixed_broken_reduction: number;

  constructor({
    name,
    code,
    percent_price_reduction,
    fixed_price_reduction,
    percent_broken_reduction,
    fixed_broken_reduction,
  }: UpdateTypeRequest) {
    this.name = name;
    this.code = code;
    this.percent_price_reduction = Number(percent_price_reduction);
    this.fixed_price_reduction = Number(fixed_price_reduction);
    this.percent_broken_reduction = Number(percent_broken_reduction);
    this.fixed_broken_reduction = Number(fixed_broken_reduction);
  }

  static schema() {
    return z.object({
      name: z.string().min(3).max(255).nullable().optional(),
      code: z.string().max(15).nullable().optional(),
      percent_price_reduction: z.number().min(0).max(100),
      fixed_price_reduction: z.number().min(0),
      percent_broken_reduction: z.number().min(0).max(100),
      fixed_broken_reduction: z.number().min(0),
    });
  }
}
