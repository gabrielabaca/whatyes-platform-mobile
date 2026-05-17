import { useCallback, useEffect, useState } from 'react';
import { getUserPublicProfile, type UserPublicProfile } from '../api/profileApi';
import { storage } from '../utils/storage';
import { useAuth } from './useAuth';

export function useUserProfile(userId?: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = userId ?? user?.uuid ?? null;

  const load = useCallback(async () => {
    if (!resolvedId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        throw new Error('No autenticado');
      }
      const data = await getUserPublicProfile(resolvedId, token);
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return { profile, loading, error, reload: load, resolvedId };
}
