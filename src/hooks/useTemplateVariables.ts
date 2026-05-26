import { useCallback, useEffect, useState } from 'react';
import type { TemplateVariable } from '@/components/TemplateEditor/types';
import {
  listTemplateVariables,
  normalizeTemplateVariables,
} from '@/services/ruoyi/templateVariable';

export const useTemplateVariables = () => {
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listTemplateVariables();
      setVariables(normalizeTemplateVariables(response.data ?? []));
    } catch (err) {
      setVariables([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { variables, loading, error, reload };
};
