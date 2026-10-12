import { ValueTransformer } from 'typeorm';

// The pg driver returns `numeric` columns as strings to avoid precision loss;
// quantities here are small enough to be safely handled as JS numbers.
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
