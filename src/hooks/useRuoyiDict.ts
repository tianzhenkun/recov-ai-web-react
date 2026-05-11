import { useEffect, useMemo, useState } from 'react';
import { type DictDataItem, getDicts } from '@/services/ruoyi/dict';

export type RuoyiDictOption = {
  label: string;
  value: string;
  raw: DictDataItem;
};

export const toDictOptions = (items: DictDataItem[] = []) =>
  items.map((item) => ({
    label: item.dictLabel || item.dictValue || '',
    value: String(item.dictValue ?? ''),
    raw: item,
  }));

export const useRuoyiDict = (
  dictType: string,
  fallback: RuoyiDictOption[] = [],
) => {
  const [items, setItems] = useState<DictDataItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dictType) return;
    let mounted = true;

    setLoading(true);
    getDicts(dictType)
      .then((response) => {
        if (mounted) {
          setItems(response.data || []);
        }
      })
      .catch(() => {
        if (mounted) {
          setItems([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [dictType]);

  const options = useMemo(() => {
    const dictOptions = toDictOptions(items);
    return dictOptions.length > 0 ? dictOptions : fallback;
  }, [items, fallback]);

  return { loading, options, items };
};
