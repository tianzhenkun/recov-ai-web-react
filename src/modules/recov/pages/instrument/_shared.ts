const LEGACY_LITIGATION_METRIC_TITLE = '已经入法诉程序被告数';
const CURRENT_LITIGATION_METRIC_TITLE = '已进入法诉程序';

export const normalizeInstrumentMetricTitle = (
  title: unknown,
  fallback: string,
) => {
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  if (!normalizedTitle) return fallback;
  if (normalizedTitle === LEGACY_LITIGATION_METRIC_TITLE) {
    return CURRENT_LITIGATION_METRIC_TITLE;
  }
  return normalizedTitle;
};
