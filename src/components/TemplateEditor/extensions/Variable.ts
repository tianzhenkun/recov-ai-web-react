import { mergeAttributes, Node } from '@tiptap/core';

export interface VariableAttrs {
  name: string;
  label: string;
  token: string;
}

export function normalizeVariableName(value: string): string {
  return value.replace(/\{\{/g, '').replace(/\}\}/g, '').trim();
}

export function buildVariableToken(name: string): string {
  return `{{${normalizeVariableName(name)}}}`;
}

export function buildVariableAttrs(
  name: string,
  label?: string,
): VariableAttrs {
  const normalizedName = normalizeVariableName(name);

  return {
    name: normalizedName,
    label: label?.trim() || normalizedName,
    token: buildVariableToken(normalizedName),
  };
}

export const Variable = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: '',
      },
      label: {
        default: '',
      },
      token: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }
          const attrs = buildVariableAttrs(
            element.dataset.name ||
              element.dataset.token ||
              element.innerText ||
              '',
            element.dataset.label || '',
          );
          return attrs;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = buildVariableAttrs(
      String(HTMLAttributes.name || ''),
      String(HTMLAttributes.label || ''),
    );

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'variable',
        'data-name': attrs.name,
        'data-label': attrs.label,
        'data-token': attrs.token,
        class: 'tiptap-variable',
        contenteditable: 'false',
      }),
      attrs.label,
    ];
  },
});

export default Variable;
