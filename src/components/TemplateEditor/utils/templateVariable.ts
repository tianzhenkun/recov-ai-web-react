import type { JSONContent } from '@tiptap/core';
import {
  buildVariableAttrs,
  buildVariableToken,
  normalizeVariableName,
} from '../extensions/Variable';
import type { TemplateVariable } from '../types';
import { convertHtmlVariableTokensToEditorNodes } from './htmlVariableTokens';

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

const CJK_TEXT_CHAR_SOURCE =
  '[\\u3400-\\u9fff\\uf900-\\ufaff\\u3000-\\u303f\\uff00-\\uffef]';
const VARIABLE_TOKEN_SOURCE = '\\{\\{\\s*[^{}]+?\\s*\\}\\}';
const CJK_BEFORE_VARIABLE_SPACE_RE = new RegExp(
  `(${CJK_TEXT_CHAR_SOURCE})[\\t \\u00a0\\u3000]+(${VARIABLE_TOKEN_SOURCE})`,
  'g',
);
const VARIABLE_BEFORE_CJK_SPACE_RE = new RegExp(
  `(${VARIABLE_TOKEN_SOURCE})[\\t \\u00a0\\u3000]+(${CJK_TEXT_CHAR_SOURCE})`,
  'g',
);

const normalizeCjkVariableTokenSpacingInText = (value: string) =>
  value
    .replace(CJK_BEFORE_VARIABLE_SPACE_RE, '$1$2')
    .replace(VARIABLE_BEFORE_CJK_SPACE_RE, '$1$2');

const normalizeTextOutsideTags = (
  html: string,
  normalizeText: (value: string) => string,
) => {
  let result = '';
  let textBuffer = '';
  let inTag = false;

  for (const char of html) {
    if (char === '<') {
      if (textBuffer) {
        result += normalizeText(textBuffer);
        textBuffer = '';
      }
      inTag = true;
      result += char;
      continue;
    }

    if (char === '>') {
      inTag = false;
      result += char;
      continue;
    }

    if (inTag) {
      result += char;
      continue;
    }

    textBuffer += char;
  }

  if (textBuffer) {
    result += normalizeText(textBuffer);
  }

  return result;
};

const normalizeCjkVariableTokenSpacingInHtml = (html: string) =>
  normalizeTextOutsideTags(html, normalizeCjkVariableTokenSpacingInText);

const SEAL_PLACEHOLDER_SELECTOR = '[data-seal-placeholder]';
const SUPPORTED_SEAL_PLACEHOLDER_SELECTOR = 'span[data-seal-placeholder]';

const LEADING_CSS_RULES_RE =
  /^\s*(?:(?:@[a-z-]+|[.#]?[a-z][\w-]*(?:[.#][\w-]+)?(?:\s*,\s*[.#]?[a-z][\w-]*(?:[.#][\w-]+)?)*)\s*\{[^{}]*\}\s*)+/i;

const stripLeadingCssRulesText = (html: string) =>
  html.replace(LEADING_CSS_RULES_RE, '');

const SUPPORTED_BLOCK_ALIGNMENTS = new Set([
  'left',
  'center',
  'right',
  'justify',
]);

const LEGACY_BLOCK_ALIGNMENT_SELECTOR = 'p,h1,h2,h3';
const SUPPORTED_BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3']);

type SupportedBlockStyle = {
  textAlign?: string;
  textIndent?: string;
};

const normalizeTextAlign = (value: string | null | undefined) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return SUPPORTED_BLOCK_ALIGNMENTS.has(normalized) ? normalized : undefined;
};

const normalizeTextIndent = (value: string | null | undefined) => {
  const trimmed = String(value ?? '').trim();
  if (
    /^-?(?:\d+|\d*\.\d+)(?:px|em|rem|pt|pc|mm|cm|in|ch|ex|%)$/i.test(trimmed)
  ) {
    return trimmed;
  }
  return undefined;
};

const parseSupportedCssDeclarations = (declarations: string) => {
  const style: SupportedBlockStyle = {};

  for (const declaration of declarations.split(';')) {
    const separatorIndex = declaration.indexOf(':');
    if (separatorIndex <= 0) continue;

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();

    if (property === 'text-align') {
      const textAlign = normalizeTextAlign(value);
      if (textAlign) style.textAlign = textAlign;
      continue;
    }

    if (property === 'text-indent') {
      const textIndent = normalizeTextIndent(value);
      if (textIndent) style.textIndent = textIndent;
    }
  }

  return style;
};

const hasSupportedBlockStyle = (style: SupportedBlockStyle) =>
  Boolean(style.textAlign || style.textIndent);

const parseSupportedCssRules = (styleText: string) => {
  const rules: Array<{ selectors: string[]; style: SupportedBlockStyle }> = [];
  const ruleRE = /([^{}]+)\{([^{}]*)\}/g;

  for (
    let match = ruleRE.exec(styleText);
    match;
    match = ruleRE.exec(styleText)
  ) {
    const selectorText = match[1].trim();
    if (!selectorText || selectorText.startsWith('@')) continue;

    const style = parseSupportedCssDeclarations(match[2]);
    if (!hasSupportedBlockStyle(style)) continue;

    rules.push({
      selectors: selectorText
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean),
      style,
    });
  }

  return rules;
};

const mergeSupportedBlockStyle = (
  element: HTMLElement,
  style: SupportedBlockStyle,
) => {
  if (style.textAlign && !element.style.textAlign) {
    element.style.textAlign = style.textAlign;
  }

  if (style.textIndent && !element.style.textIndent) {
    element.style.textIndent = style.textIndent;
  }
};

const applySupportedBlockStyle = (
  element: HTMLElement,
  style: SupportedBlockStyle,
) => {
  if (SUPPORTED_BLOCK_TAGS.has(element.tagName)) {
    mergeSupportedBlockStyle(element, style);
    return;
  }

  for (const child of element.querySelectorAll<HTMLElement>(
    LEGACY_BLOCK_ALIGNMENT_SELECTOR,
  )) {
    mergeSupportedBlockStyle(child, style);
  }
};

const getElementsBySupportedSelector = (
  container: HTMLElement,
  selector: string,
) => {
  const normalizedSelector = selector.trim();
  const tagSelector = normalizedSelector.toLowerCase();
  if (['p', 'h1', 'h2', 'h3'].includes(tagSelector)) {
    return Array.from(
      container.querySelectorAll<HTMLElement>(normalizedSelector),
    );
  }

  const classMatch = normalizedSelector.match(/^\.([A-Za-z0-9_-]+)$/);
  if (classMatch) {
    return Array.from(container.getElementsByClassName(classMatch[1])).filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
  }

  const tagClassMatch = normalizedSelector.match(
    /^(?:div|p|h1|h2|h3)\.([A-Za-z0-9_-]+)$/i,
  );
  if (tagClassMatch) {
    return Array.from(
      container.getElementsByClassName(tagClassMatch[1]),
    ).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element.tagName.toLowerCase() ===
          normalizedSelector.split('.')[0].toLowerCase(),
    );
  }

  return [];
};

const applySupportedCssRules = (
  container: HTMLElement,
  styleTexts: string[],
) => {
  for (const styleText of styleTexts) {
    for (const rule of parseSupportedCssRules(styleText)) {
      for (const selector of rule.selectors) {
        for (const element of getElementsBySupportedSelector(
          container,
          selector,
        )) {
          applySupportedBlockStyle(element, rule.style);
        }
      }
    }
  }
};

const parseHtmlForEditor = (html: string) => {
  if (typeof document === 'undefined') return null;

  const container = document.createElement('div');
  const styleTexts: string[] = [];
  const hasDocumentShell = /(?:<!doctype\b|<html\b|<head\b|<body\b)/i.test(
    html,
  );

  if (hasDocumentShell && typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    for (const styleElement of parsed.querySelectorAll('style')) {
      styleTexts.push(styleElement.textContent ?? '');
    }
    container.innerHTML = stripLeadingCssRulesText(
      parsed.body?.innerHTML ?? '',
    );
    return { container, styleTexts };
  }

  container.innerHTML = stripLeadingCssRulesText(html);
  for (const styleElement of container.querySelectorAll('style')) {
    styleTexts.push(styleElement.textContent ?? '');
    styleElement.remove();
  }

  return { container, styleTexts };
};

const containsSealPlaceholder = (html: string) => {
  const parsed = parseHtmlForEditor(html);
  if (!parsed) return /<span\b[^>]*\bdata-seal-placeholder\b/i.test(html);
  return Boolean(
    parsed.container.querySelector(SUPPORTED_SEAL_PLACEHOLDER_SELECTOR),
  );
};

const removeUnsupportedSealPlaceholders = (html: string) => {
  const parsed = parseHtmlForEditor(html);
  if (!parsed) return html;

  parsed.container
    .querySelectorAll(SEAL_PLACEHOLDER_SELECTOR)
    .forEach((node) => {
      if (node.tagName.toLowerCase() !== 'span') {
        node.remove();
      }
    });

  return parsed.container.innerHTML;
};

const readSealPlaceholderMeta = (element: Element) => ({
  codes: element.getAttribute('data-seal-codes') ?? '',
  heightMm: element.getAttribute('data-height-mm') ?? '',
  placeholder: element.getAttribute('data-seal-placeholder') ?? '',
  widthMm: element.getAttribute('data-width-mm') ?? '',
});

const isSameSealPlaceholderMeta = (
  left: ReturnType<typeof readSealPlaceholderMeta>,
  right: ReturnType<typeof readSealPlaceholderMeta>,
) =>
  left.codes === right.codes &&
  left.heightMm === right.heightMm &&
  left.placeholder === right.placeholder &&
  left.widthMm === right.widthMm;

const extractSealPlaceholderHtml = (html: string) => {
  const parsed = parseHtmlForEditor(html);
  if (!parsed) {
    const matched = html.match(
      /<span\b[^>]*\bdata-seal-placeholder\b[^>]*><\/span>/i,
    );
    return matched?.[0] ?? '';
  }

  const seal = parsed.container.querySelector<HTMLElement>(
    SEAL_PLACEHOLDER_SELECTOR,
  );
  if (!seal) return '';

  const parent = seal.parentElement;
  if (
    parent &&
    parent.tagName.toLowerCase() === 'p' &&
    parent.querySelectorAll(SEAL_PLACEHOLDER_SELECTOR).length === 1 &&
    !parent.textContent?.trim()
  ) {
    return parent.outerHTML;
  }

  return seal.outerHTML;
};

export const ensureSealPlaceholderHtml = (
  candidateHtml: string,
  sourceHtml: string,
) => {
  const candidate = removeUnsupportedSealPlaceholders(
    String(candidateHtml ?? ''),
  );
  const sourceSealHtml = extractSealPlaceholderHtml(String(sourceHtml ?? ''));
  if (!sourceSealHtml) return candidate;

  const sourceParsed = parseHtmlForEditor(String(sourceHtml ?? ''));
  const sourceSeal = sourceParsed?.container.querySelector(
    SEAL_PLACEHOLDER_SELECTOR,
  );
  const candidateParsed = parseHtmlForEditor(candidate);

  if (!sourceSeal || !candidateParsed) {
    if (containsSealPlaceholder(candidate)) return candidate;
    return `${candidate}${sourceSealHtml}`;
  }

  const sourceMeta = readSealPlaceholderMeta(sourceSeal);
  const candidateSeals = Array.from(
    candidateParsed.container.querySelectorAll(
      SUPPORTED_SEAL_PLACEHOLDER_SELECTOR,
    ),
  );

  if (
    candidateSeals.length === 1 &&
    isSameSealPlaceholderMeta(
      readSealPlaceholderMeta(candidateSeals[0]),
      sourceMeta,
    )
  ) {
    return candidate;
  }

  candidateParsed.container
    .querySelectorAll(SEAL_PLACEHOLDER_SELECTOR)
    .forEach((node) => {
      node.remove();
    });

  return `${candidateParsed.container.innerHTML}${sourceSealHtml}`;
};

const normalizeLegacyBlockAlignmentAttributes = (html: string) => {
  const parsed = parseHtmlForEditor(html);
  if (!parsed) return html;

  applySupportedCssRules(parsed.container, parsed.styleTexts);

  for (const element of parsed.container.querySelectorAll<HTMLElement>(
    LEGACY_BLOCK_ALIGNMENT_SELECTOR,
  )) {
    const align = normalizeTextAlign(element.getAttribute('align'));

    if (align && !element.style.textAlign) {
      element.style.textAlign = align;
    }

    element.removeAttribute('align');
  }

  return parsed.container.innerHTML;
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

export const htmlToEditorHtml = (
  content: string,
  variables: TemplateVariable[] = [],
  options: { enableVariables?: boolean } = {},
) => {
  const html = String(content || '<p></p>');
  const normalizedBlockStyle = normalizeCjkVariableTokenSpacingInHtml(
    normalizeLegacyBlockAlignmentAttributes(html),
  );
  const normalized = normalizedBlockStyle.replace(
    /<span\b([^>]*data-type=(["'])variable\2[^>]*)>[\s\S]*?<\/span>/gi,
    (full, attrs) => {
      const label = getAttr(attrs, 'data-label');
      if (!label) return full;
      return `<span${attrs}>${escapeHtml(label)}</span>`;
    },
  );
  return convertHtmlVariableTokensToEditorNodes(
    normalized,
    (raw) => variableToHtml(raw, variables),
    { enabled: options.enableVariables !== false },
  );
};

export const serializeHtmlWithVariableTokens = (content: string) => {
  return normalizeCjkVariableTokenSpacingInHtml(
    String(content ?? '').replace(
      /<span\b([^>]*data-type=(["'])variable\2[^>]*)>[\s\S]*?<\/span>/gi,
      (full, attrs) => {
        const name =
          getAttr(attrs, 'data-name') || getAttr(attrs, 'data-token');
        if (!name) return full;
        return escapeHtml(toVariableToken(name));
      },
    ),
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
