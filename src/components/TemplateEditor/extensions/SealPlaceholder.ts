import { Node } from '@tiptap/core';

export interface SealPlaceholderAttrs {
  codes: string;
  placeholder: string;
  widthMm: string;
  heightMm: string;
  style: string;
}

const DEFAULT_SEAL_CODES = 'company_seal';
const DEFAULT_SEAL_PLACEHOLDER = 'seal_group';
const DEFAULT_SEAL_SIZE_MM = '36';

const parseStyleText = (style: string) => {
  const entries: [string, string][] = [];

  for (const declaration of style.split(';')) {
    const separatorIndex = declaration.indexOf(':');
    if (separatorIndex <= 0) continue;

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();
    if (!property || !value) continue;

    const existingIndex = entries.findIndex(([key]) => key === property);
    if (existingIndex >= 0) {
      entries[existingIndex] = [property, value];
      continue;
    }

    entries.push([property, value]);
  }

  return entries;
};

const upsertStyle = (
  entries: [string, string][],
  property: string,
  value: string,
  options: { override?: boolean } = {},
) => {
  const normalizedProperty = property.toLowerCase();
  const existingIndex = entries.findIndex(
    ([key]) => key === normalizedProperty,
  );

  if (existingIndex >= 0) {
    if (options.override) entries[existingIndex] = [normalizedProperty, value];
    return;
  }

  entries.push([normalizedProperty, value]);
};

export const buildSealPlaceholderStyle = (
  style: string,
  widthMm: string,
  heightMm: string,
) => {
  const entries = parseStyleText(style);

  upsertStyle(entries, 'display', 'inline-flex', { override: true });
  upsertStyle(entries, 'align-items', 'center', { override: true });
  upsertStyle(entries, 'justify-content', 'center', { override: true });
  upsertStyle(entries, 'gap', '6mm', { override: true });
  upsertStyle(entries, 'width', 'auto', { override: true });
  upsertStyle(entries, 'min-width', `${widthMm}mm`, { override: true });
  upsertStyle(entries, 'height', `${heightMm}mm`, { override: true });
  upsertStyle(entries, 'border', '1px dashed #d9d9d9');
  upsertStyle(entries, 'border-radius', '4px');
  upsertStyle(entries, 'vertical-align', 'middle');

  return entries.map(([property, value]) => `${property}:${value}`).join(';');
};

const getDatasetValue = (
  element: HTMLElement,
  key: keyof HTMLElement['dataset'],
) => {
  const value = element.dataset[key];
  return value === undefined || value === null || value === ''
    ? undefined
    : value;
};

export const SealPlaceholder = Node.create({
  name: 'sealPlaceholder',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      codes: {
        default: DEFAULT_SEAL_CODES,
      },
      placeholder: {
        default: DEFAULT_SEAL_PLACEHOLDER,
      },
      widthMm: {
        default: DEFAULT_SEAL_SIZE_MM,
      },
      heightMm: {
        default: DEFAULT_SEAL_SIZE_MM,
      },
      style: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-seal-placeholder]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }

          const codes =
            getDatasetValue(element, 'sealCodes') || DEFAULT_SEAL_CODES;
          const widthMm =
            getDatasetValue(element, 'widthMm') || DEFAULT_SEAL_SIZE_MM;
          const heightMm =
            getDatasetValue(element, 'heightMm') || DEFAULT_SEAL_SIZE_MM;

          return {
            codes,
            placeholder:
              getDatasetValue(element, 'sealPlaceholder') ||
              DEFAULT_SEAL_PLACEHOLDER,
            widthMm,
            heightMm,
            style: element.getAttribute('style') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const codes = String(HTMLAttributes.codes || DEFAULT_SEAL_CODES);
    const placeholder = String(
      HTMLAttributes.placeholder || DEFAULT_SEAL_PLACEHOLDER,
    );
    const widthMm = String(HTMLAttributes.widthMm || DEFAULT_SEAL_SIZE_MM);
    const heightMm = String(HTMLAttributes.heightMm || DEFAULT_SEAL_SIZE_MM);
    const className = [
      String(HTMLAttributes.class || '').trim(),
      'instrument-seal-placeholder',
    ]
      .filter(Boolean)
      .join(' ');
    const style = buildSealPlaceholderStyle(
      String(HTMLAttributes.style || '').trim(),
      widthMm,
      heightMm,
    );

    return [
      'span',
      {
        'data-seal-placeholder': placeholder,
        'data-seal-codes': codes,
        'data-width-mm': widthMm,
        'data-height-mm': heightMm,
        class: className,
        contenteditable: 'false',
        style,
      },
    ];
  },
});

export default SealPlaceholder;
