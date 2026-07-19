import { useEffect, useState } from 'react';
import { API_URL, httpClient } from '../providers/httpClient';

// Data fetching lives here, not in the Dashboard component (rules.md §7)
export const useDashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    httpClient(`${API_URL}/dashboard/stats`)
      .then(({ json }) => {
        if (!cancelled && json.success) setStats(json.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { stats, isLoading, error };
};
