import { ruoyiRequest } from '@/api/main';
import type { TemplateVariable } from '@/components/TemplateEditor/types';

export type TemplateVariableOption = {
  key: string;
  label: string;
  category?: string | null;
  sortOrder?: number | null;
};

const BASE = '/system/recov/template';

export const listTemplateVariables = () =>
  ruoyiRequest<TemplateVariableOption[]>(`${BASE}/variables`, {
    method: 'get',
  });

export const normalizeTemplateVariables = (
  variables: TemplateVariableOption[] | undefined,
): TemplateVariable[] => {
  if (!Array.isArray(variables)) return [];
  const seen = new Set<string>();
  return variables
    .map((item) => {
      const value = String(item?.key ?? '').trim();
      const label = String(item?.label ?? '').trim();
      if (!value || !label || seen.has(value)) return null;
      seen.add(value);
      return {
        label,
        value,
        sortOrder: item.sortOrder ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .filter(
      (
        item,
      ): item is TemplateVariable & {
        sortOrder: number;
      } => item !== null,
    )
    .sort(
      (a, b) =>
        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) ||
        a.value.localeCompare(b.value),
    )
    .map(({ label, value }) => ({ label, value }));
};
