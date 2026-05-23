import { Node } from '@tiptap/core';

export interface SealPlaceholderAttrs {
  code: string;
  placeholder: string;
  widthMm: string;
  heightMm: string;
  style: string;
}

const DEFAULT_SEAL_CODE = 'company_seal';
const DEFAULT_SEAL_SIZE_MM = '36';

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
      code: {
        default: DEFAULT_SEAL_CODE,
      },
      placeholder: {
        default: DEFAULT_SEAL_CODE,
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

          const code =
            getDatasetValue(element, 'sealCode') ||
            getDatasetValue(element, 'sealPlaceholder') ||
            DEFAULT_SEAL_CODE;
          const widthMm =
            getDatasetValue(element, 'widthMm') || DEFAULT_SEAL_SIZE_MM;
          const heightMm =
            getDatasetValue(element, 'heightMm') || DEFAULT_SEAL_SIZE_MM;

          return {
            code,
            placeholder: getDatasetValue(element, 'sealPlaceholder') || code,
            widthMm,
            heightMm,
            style: element.getAttribute('style') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const code = String(HTMLAttributes.code || DEFAULT_SEAL_CODE);
    const placeholder = String(HTMLAttributes.placeholder || code);
    const widthMm = String(HTMLAttributes.widthMm || DEFAULT_SEAL_SIZE_MM);
    const heightMm = String(HTMLAttributes.heightMm || DEFAULT_SEAL_SIZE_MM);
    const className = [
      String(HTMLAttributes.class || '').trim(),
      'instrument-seal-placeholder',
    ]
      .filter(Boolean)
      .join(' ');
    const style =
      String(HTMLAttributes.style || '').trim() ||
      `display:inline-block;width:${widthMm}mm;height:${heightMm}mm;border:1px dashed #d9d9d9;`;

    return [
      'span',
      {
        'data-seal-placeholder': placeholder,
        'data-seal-code': code,
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
