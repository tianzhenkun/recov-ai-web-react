type RenderVariableHtml = (raw: string) => string;

const TOKEN_REGEXP = /\{\{\s*([^{}]+?)\s*\}\}/g;

const renderTextWithVariables = (
  text: string,
  renderVariableHtml: RenderVariableHtml,
) => {
  let cursor = 0;
  let html = '';
  TOKEN_REGEXP.lastIndex = 0;

  for (
    let match = TOKEN_REGEXP.exec(text);
    match;
    match = TOKEN_REGEXP.exec(text)
  ) {
    html += text.slice(cursor, match.index);
    html += renderVariableHtml(match[1]);
    cursor = match.index + match[0].length;
  }

  html += text.slice(cursor);
  return html;
};

const renderTextParts = (
  text: string,
  renderVariableHtml: RenderVariableHtml,
) => {
  const parts: Array<{ type: 'text' | 'variable'; value: string }> = [];
  let cursor = 0;
  TOKEN_REGEXP.lastIndex = 0;

  for (
    let match = TOKEN_REGEXP.exec(text);
    match;
    match = TOKEN_REGEXP.exec(text)
  ) {
    if (match.index > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, match.index) });
    }
    parts.push({ type: 'variable', value: renderVariableHtml(match[1]) });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', value: text.slice(cursor) });
  }

  return parts;
};

const hasVariableToken = (text: string) => {
  TOKEN_REGEXP.lastIndex = 0;
  return TOKEN_REGEXP.test(text);
};

const parseHtmlFragment = (html: string) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
};

const replaceTextNodeTokens = (
  root: HTMLElement,
  renderVariableHtml: RenderVariableHtml,
) => {
  const ownerDocument = root.ownerDocument;
  const nodeFilter = ownerDocument.defaultView?.NodeFilter?.SHOW_TEXT ?? 4;
  const walker = ownerDocument.createTreeWalker(root, nodeFilter);
  const nodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  for (const node of nodes) {
    const value = node.nodeValue ?? '';
    if (!hasVariableToken(value)) continue;

    const fragment = ownerDocument.createDocumentFragment();
    for (const part of renderTextParts(value, renderVariableHtml)) {
      if (part.type === 'text') {
        fragment.appendChild(ownerDocument.createTextNode(part.value));
        continue;
      }

      const template = ownerDocument.createElement('template');
      template.innerHTML = part.value;
      fragment.appendChild(template.content);
    }

    node.parentNode?.replaceChild(fragment, node);
  }
};

const replaceTokensOutsideTags = (
  html: string,
  renderVariableHtml: RenderVariableHtml,
) => {
  let result = '';
  let textBuffer = '';
  let inTag = false;

  for (const char of html) {
    if (char === '<') {
      if (textBuffer) {
        result += renderTextWithVariables(textBuffer, renderVariableHtml);
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
    result += renderTextWithVariables(textBuffer, renderVariableHtml);
  }

  return result;
};

export const convertHtmlVariableTokensToEditorNodes = (
  html: string,
  renderVariableHtml: RenderVariableHtml,
  options: { enabled?: boolean } = {},
) => {
  const source = String(html ?? '');
  if (options.enabled === false) return source;

  const fragment = parseHtmlFragment(source);
  if (!fragment) {
    return replaceTokensOutsideTags(source, renderVariableHtml);
  }

  replaceTextNodeTokens(fragment, renderVariableHtml);
  return fragment.innerHTML;
};
