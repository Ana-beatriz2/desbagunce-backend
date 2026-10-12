export enum ItemUnit {
  UNIT = 'unit',
  KG = 'kg',
}

export enum ItemStatus {
  IN_STOCK = 'in_stock',
  RUNNING_LOW = 'running_low',
  // Estimated depletion date has passed but nobody confirmed it ran out
  PROBABLY_OUT = 'probably_out',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum ItemEventType {
  CREATED = 'created',
  PURCHASED = 'purchased',
  QUANTITY_UPDATED = 'quantity_updated',
  DEPLETED = 'depleted',
  CONFIRMED_STILL_HAS = 'confirmed_still_has',
  EDITED = 'edited',
}
