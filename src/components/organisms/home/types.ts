import type { InterestCategoryItem } from '../../../api/types';

/**
 * Modelo de vista previa de transmisión para la Home (comprador).
 * Parte de los campos son placeholders hasta que la API de rooms los exponga.
 */
export interface LiveStreamPreviewModel {
  id: string;
  /** Nombre para mostrar del streamer (prioriza datos del creador desde service-users). */
  sellerName: string;
  /** Título de la sala / transmisión (nombre de room o stream). */
  title: string;
  viewerCount: number;
  thumbnail?: string;
  /** Placeholder UI hasta metadata en PlatformRoom */
  rating?: number | null;
  /** Primera categoría o etiqueta sintética al filtrar por chip */
  categoryLabel?: string | null;
  /** Categorías de la sala (GET /rooms → interest_categories) */
  interestCategories?: InterestCategoryItem[];
  sellerAvatarUrl?: string | null;
  /** UUID del creador / vendedor de la sala. */
  sellerUserId?: string;
  /** Iniciales para avatar sin foto (derivadas del creador cuando existe). */
  sellerInitials?: string;
  /** Epoch segundos (GET /rooms) para ordenar por recientes. */
  createdAt?: number;
  /** URL de la imagen de portada de la sala (cover_url del room). Distinto de thumbnail que puede ser el avatar. */
  coverUrl?: string | null;
}

/** Chip sintético "Todas" en el explorador de categorías */
export const ALL_CATEGORIES_ID = '__all__';

export type HomeBottomTab = 'home' | 'explore' | 'create' | 'activity' | 'account' | 'compras';
