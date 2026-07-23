import { getRoomsFeed } from '../api/platformApi';
import { storage } from './storage';
import type { StreamData } from '../components/molecules/StreamCard';

/** IDs de salas en vivo según el feed actual de Platform. */
export async function fetchLiveRoomIds(categoryUuid?: string): Promise<Set<string>> {
  const token = await storage.getAccessToken();
  if (!token) return new Set();
  try {
    const opts =
      categoryUuid != null && categoryUuid.length > 0
        ? { interestCategoryUuid: categoryUuid }
        : undefined;
    const rooms = await getRoomsFeed(token, opts);
    return new Set(rooms.map((r) => r.uuid));
  } catch {
    return new Set();
  }
}

/**
 * Elige el índice del siguiente live en la lista del feed de swipe.
 * Prioriza slides posteriores al actual, luego anteriores.
 */
export function pickNextLiveStreamIndex(
  streams: StreamData[],
  endedStreamId: string,
  liveRoomIds: Set<string>,
  currentIndex: number
): number | null {
  const isLiveCandidate = (s: StreamData) =>
    s.id !== endedStreamId && liveRoomIds.has(s.id);

  for (let i = currentIndex + 1; i < streams.length; i++) {
    if (isLiveCandidate(streams[i])) return i;
  }
  for (let i = 0; i < currentIndex; i++) {
    if (isLiveCandidate(streams[i])) return i;
  }
  const any = streams.findIndex(isLiveCandidate);
  return any >= 0 ? any : null;
}
