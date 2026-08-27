/**
 * Configuración con la que arranca un vivo. La arma el asistente de "Hacer un live"
 * (`useStartLiveWizard` + `PreLiveSetupOverlay`) y la consume `SellerStreamScreen`.
 */

export interface StreamConfig {
  title: string;
  description: string;
  interestCategoryUuids?: string[];
  scheduledAt?: number | null;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  moderatorUserIds?: string[];
  saleFormat?: 'individual' | 'auction_breaks' | 'surprise_boxes';
  explicitContent?: boolean;
  blockedWordsEnabled?: boolean;
  blockedWords?: string[];
  privacy?: 'public' | 'private';
  coverUrl?: string | null;
  introVideoUrl?: string | null;
}
