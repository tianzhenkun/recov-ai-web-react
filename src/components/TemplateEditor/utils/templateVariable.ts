import type { JSONContent } from '@tiptap/core';
import {
  buildVariableAttrs,
  buildVariableToken,
  normalizeVariableName,
} from '../extensions/Variable';
import type { TemplateVariable } from '../types';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getAttr = (attrs: string, name: string) => {
  const match = attrs.match(new RegExp(`${name}=(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? '';
};

export const toVariableToken = (value: string) => buildVariableToken(value);

export const createVariableResolver = (variables: TemplateVariable[] = []) => {
  const byValue = new Map<string, TemplateVariable>();
  const byLabel = new Map<string, TemplateVariable>();

  for (const item of variables) {
    const value = normalizeVariableName(String(item.value ?? ''));
    const label = String(item.label ?? '').trim();
    if (!value) continue;
    byValue.set(value, { label: label || value, value });
    if (label) byLabel.set(normalizeVariableName(label), { label, value });
  }

  return (raw: string, fallbackLabel?: string) => {
    const normalized = normalizeVariableName(raw);
    const matched = byValue.get(normalized) ?? byLabel.get(normalized);
    return buildVariableAttrs(
      matched?.value ?? normalized,
      fallbackLabel ?? matched?.label ?? normalized,
    );
  };
};

export const variableToHtml = (
  raw: string,
  variables: TemplateVariable[] = [],
  fallbackLabel?: string,
) => {
  const attrs = createVariableResolver(variables)(raw, fallbackLabel);

  return `<span data-type="variable" data-name="${escapeHtml(attrs.name)}" data-label="${escapeHtml(attrs.label)}" data-token="${escapeHtml(
    attrs.token,
  )}" class="tiptap-variable" contenteditable="false">${escapeHtml(attrs.label)}</span>`;
};

export const textToEditorHtml = (
  content: string,
  variables: TemplateVariable[] = [],
) => {
  const source = String(content ?? '');
  const lines = source.split(/\r?\n/);
  const tokenRE = /\{\{\s*([^{}]+?)\s*\}\}/g;

  const renderLine = (line: string) => {
    let cursor = 0;
    let html = '';
    tokenRE.lastIndex = 0;

    for (let match = tokenRE.exec(line); match; match = tokenRE.exec(line)) {
      html += escapeHtml(line.slice(cursor, match.index));
      html += variableToHtml(match[1], variables);
      cursor = match.index + match[0].length;
    }

    html += escapeHtml(line.slice(cursor));
    return html;
  };

  return lines.map((line) => `<p>${renderLine(line)}</p>`).join('');
};

export const htmlToEditorHtml = (content: string) => {
  const html = String(content || '<p></p>');
  return html.replace(
    /<span\b([^>]*data-type=(["'])variable\2[^>]*)>[\s\S]*?<\/span>/gi,
    (full, attrs) => {
      const label = getAttr(attrs, 'data-label');
      if (!label) return full;
      return `<span${attrs}>${escapeHtml(label)}</span>`;
    },
  );
};

export const serializeHtmlWithVariableTokens = (content: string) => {
  return String(content ?? '').replace(
    /<span\b([^>]*data-type=(["'])variable\2[^>]*)>[\s\S]*?<\/span>/gi,
    (full, attrs) => {
      const name = getAttr(attrs, 'data-name') || getAttr(attrs, 'data-token');
      if (!name) return full;
      return `<span${attrs}>${escapeHtml(toVariableToken(name))}</span>`;
    },
  );
};

const nodeToText = (node: JSONContent): string => {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'variable')
    return toVariableToken(String(node.attrs?.name ?? ''));
  if (node.type === 'hardBreak') return '\n';
  if (!node.content?.length) return '';
  return node.content.map(nodeToText).join('');
};

export const editorJsonToText = (json: JSONContent) => {
  if (!json.content?.length) return '';
  return json.content
    .map(nodeToText)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
};
