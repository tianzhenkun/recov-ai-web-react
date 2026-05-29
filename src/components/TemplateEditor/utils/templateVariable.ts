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
  options: { enableVariables?: boolean; enableLists?: boolean } = {},
) => {
  const source = String(content ?? '');
  const lines = source.split(/\r?\n/);
  const enableVariables = options.enableVariables ?? true;
  const enableLists = options.enableLists ?? false;
  const tokenRE = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const bulletLineRE = /^(\s*)[-*]\s+(.+)$/;
  const orderedLineRE = /^(\s*)(\d+)[.)]\s+(.+)$/;

  const renderLine = (line: string) => {
    if (!enableVariables) {
      return escapeHtml(line);
    }

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

  const parseListLine = (line: string) => {
    const bulletMatch = line.match(bulletLineRE);
    if (bulletMatch) {
      return {
        content: bulletMatch[2],
        depth: Math.floor(bulletMatch[1].replace(/\t/g, '  ').length / 2),
        start: '',
        tag: 'ul' as const,
      };
    }

    const orderedMatch = line.match(orderedLineRE);
    if (orderedMatch) {
      return {
        content: orderedMatch[3],
        depth: Math.floor(orderedMatch[1].replace(/\t/g, '  ').length / 2),
        start: orderedMatch[2],
        tag: 'ol' as const,
      };
    }

    return null;
  };

  const renderListBlock = (
    startIndex: number,
    depth: number,
    tag: 'ul' | 'ol',
    start = '',
  ): { html: string; nextIndex: number } => {
    const items: string[] = [];
    let currentIndex = startIndex;

    while (currentIndex < lines.length) {
      const parsed = parseListLine(lines[currentIndex]);
      if (!parsed || parsed.depth < depth) break;

      if (parsed.depth > depth) {
        if (items.length === 0) break;
        const nested = renderListBlock(
          currentIndex,
          parsed.depth,
          parsed.tag,
          parsed.start,
        );
        items[items.length - 1] += nested.html;
        currentIndex = nested.nextIndex;
        continue;
      }

      if (parsed.tag !== tag) break;

      items.push(`<li><p>${renderLine(parsed.content)}</p>`);
      currentIndex += 1;

      while (currentIndex < lines.length) {
        const nestedParsed = parseListLine(lines[currentIndex]);
        if (!nestedParsed || nestedParsed.depth <= depth) break;
        const nested = renderListBlock(
          currentIndex,
          nestedParsed.depth,
          nestedParsed.tag,
          nestedParsed.start,
        );
        items[items.length - 1] += nested.html;
        currentIndex = nested.nextIndex;
      }

      items[items.length - 1] += '</li>';
    }

    const startAttr =
      tag === 'ol' && start ? ` start="${escapeHtml(start)}"` : '';
    return {
      html: `<${tag}${startAttr}>${items.join('')}</${tag}>`,
      nextIndex: currentIndex,
    };
  };

  if (!enableLists) {
    return lines.map((line) => `<p>${renderLine(line)}</p>`).join('');
  }

  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const parsed = parseListLine(lines[index]);

    if (parsed) {
      const listBlock = renderListBlock(
        index,
        parsed.depth,
        parsed.tag,
        parsed.start,
      );
      blocks.push(listBlock.html);
      index = listBlock.nextIndex;
      continue;
    }

    blocks.push(`<p>${renderLine(lines[index])}</p>`);
    index += 1;
  }

  return blocks.join('');
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

const inlineNodeToText = (node: JSONContent): string => {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'variable')
    return toVariableToken(String(node.attrs?.name ?? ''));
  if (node.type === 'hardBreak') return '\n';
  if (!node.content?.length) return '';
  return node.content.map(inlineNodeToText).join('');
};

const paragraphToText = (node: JSONContent): string => {
  if (!node.content?.length) return '';
  return node.content.map(inlineNodeToText).join('');
};

const listItemToText = (
  node: JSONContent,
  marker: string,
  depth: number,
): string => {
  const indent = '  '.repeat(depth);
  const primaryBlocks: string[] = [];
  const nestedBlocks: string[] = [];

  for (const child of node.content ?? []) {
    if (child.type === 'paragraph') {
      primaryBlocks.push(paragraphToText(child));
      continue;
    }
    if (child.type === 'bulletList' || child.type === 'orderedList') {
      nestedBlocks.push(blockNodeToText(child, depth + 1));
      continue;
    }
    primaryBlocks.push(blockNodeToText(child, depth));
  }

  const primaryText = primaryBlocks.join('\n');
  const primaryLines = primaryText ? primaryText.split('\n') : [''];
  const firstLine = `${indent}${marker}${primaryLines[0] ?? ''}`;
  const remainingLines = primaryLines
    .slice(1)
    .map((line) => `${indent}  ${line}`);

  return [firstLine, ...remainingLines, ...nestedBlocks.filter(Boolean)].join(
    '\n',
  );
};

const blockNodeToText = (node: JSONContent, depth = 0): string => {
  if (node.type === 'paragraph') return paragraphToText(node);
  if (node.type === 'bulletList') {
    return (node.content ?? [])
      .map((item) => listItemToText(item, '- ', depth))
      .join('\n');
  }
  if (node.type === 'orderedList') {
    const start = Number(node.attrs?.start ?? 1);
    const firstIndex = Number.isFinite(start) ? start : 1;
    return (node.content ?? [])
      .map((item, itemIndex) =>
        listItemToText(item, `${firstIndex + itemIndex}. `, depth),
      )
      .join('\n');
  }
  if (node.type === 'listItem') return listItemToText(node, '- ', depth);
  return inlineNodeToText(node);
};

export const editorJsonToText = (json: JSONContent) => {
  if (!json.content?.length) return '';
  return json.content
    .map((node) => blockNodeToText(node))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
};
