export const PACKAGE_TIER_OPTIONS = [
  {
    id: 'light' as const,
    labelKey: 'addProduct.tierLight',
    rangeKey: 'addProduct.tierLightRange',
    hintKey: 'addProduct.tierLightHint',
    defaultKg: 0.25,
  },
  {
    id: 'medium' as const,
    labelKey: 'addProduct.tierMedium',
    rangeKey: 'addProduct.tierMediumRange',
    hintKey: 'addProduct.tierMediumHint',
    defaultKg: 2.5,
  },
  {
    id: 'heavy' as const,
    labelKey: 'addProduct.tierHeavy',
    rangeKey: 'addProduct.tierHeavyRange',
    hintKey: 'addProduct.tierHeavyHint',
    defaultKg: 10,
  },
] as const;

export type PackageTierId = (typeof PACKAGE_TIER_OPTIONS)[number]['id'] | 'custom';

export const SALE_FORMAT_OPTIONS = [
  { id: 'individual' as const, labelKey: 'addProduct.saleFormatIndividual', hintKey: 'addProduct.saleFormatIndividualHint' },
  { id: 'lot' as const, labelKey: 'addProduct.saleFormatLot', hintKey: 'addProduct.saleFormatLotHint' },
] as const;

export type SaleFormatId = (typeof SALE_FORMAT_OPTIONS)[number]['id'];

export const PRODUCT_CONDITIONS = [
  { id: 'new' as const, labelKey: 'addProduct.conditionNew' },
  { id: 'lightly_used' as const, labelKey: 'addProduct.conditionLightUse' },
  { id: 'used' as const, labelKey: 'addProduct.conditionUsed' },
] as const;

export type ProductConditionId = (typeof PRODUCT_CONDITIONS)[number]['id'];
