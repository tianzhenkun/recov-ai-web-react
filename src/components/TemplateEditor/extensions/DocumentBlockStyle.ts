import { Extension } from '@tiptap/core';

const SUPPORTED_BLOCK_TYPES = ['paragraph', 'heading'];

const normalizeTextIndent = (value: string | null | undefined) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;

  if (
    /^-?(?:\d+|\d*\.\d+)(?:px|em|rem|pt|pc|mm|cm|in|ch|ex|%)$/i.test(trimmed)
  ) {
    return trimmed;
  }

  return null;
};

export const DocumentBlockStyle = Extension.create({
  name: 'documentBlockStyle',

  addGlobalAttributes() {
    return [
      {
        types: SUPPORTED_BLOCK_TYPES,
        attributes: {
          textIndent: {
            default: null,
            parseHTML: (element) =>
              normalizeTextIndent(element.style.textIndent),
            renderHTML: (attributes) => {
              const textIndent = normalizeTextIndent(attributes.textIndent);
              if (!textIndent) return {};
              return {
                style: `text-indent: ${textIndent}`,
              };
            },
          },
        },
      },
    ];
  },
});

export default DocumentBlockStyle;
