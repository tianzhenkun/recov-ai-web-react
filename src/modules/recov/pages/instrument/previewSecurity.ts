import DOMPurify from 'dompurify';

const FORBIDDEN_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
  'base',
  'svg',
  'math',
];

const UNSAFE_STYLE_VALUE =
  /(?:url\s*\(|expression\s*\(|@import|javascript\s*:|data\s*:|file\s*:|behavior\s*:|-moz-binding)/i;

const getCurrentOrigin = () =>
  typeof window === 'undefined' ? undefined : window.location.origin;

const isSafeEmbeddedUrl = (value: string, attributeName: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (attributeName === 'href' && trimmed.startsWith('#')) return true;
  if (
    attributeName === 'src' &&
    /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z\d+/=\s]+$/i.test(trimmed)
  ) {
    return true;
  }

  const origin = getCurrentOrigin();
  if (!origin) return false;
  try {
    decodeURI(trimmed);
    const target = new URL(trimmed, origin);
    return (
      ['http:', 'https:'].includes(target.protocol) &&
      target.origin === new URL(origin).origin
    );
  } catch {
    return false;
  }
};

const hardenSanitizedFragment = (sanitized: string) => {
  if (typeof DOMParser === 'undefined') return sanitized;
  const document = new DOMParser().parseFromString(sanitized, 'text/html');

  document.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const style = element.getAttribute('style') || '';
    if (UNSAFE_STYLE_VALUE.test(style)) element.removeAttribute('style');
  });

  document.querySelectorAll<HTMLElement>('[href], [src]').forEach((element) => {
    ['href', 'src'].forEach((attributeName) => {
      const value = element.getAttribute(attributeName);
      if (value && !isSafeEmbeddedUrl(value, attributeName)) {
        element.removeAttribute(attributeName);
      }
    });
  });

  return document.body.innerHTML;
};

export const sanitizeInstrumentPreviewHtml = (html: string) => {
  const sanitized = String(
    DOMPurify.sanitize(html || '', {
      ALLOW_DATA_ATTR: true,
      FORBID_ATTR: ['srcset'],
      FORBID_TAGS: [...FORBIDDEN_TAGS, 'style'],
      USE_PROFILES: { html: true },
    }),
  );
  return hardenSanitizedFragment(sanitized);
};

export const INSTRUMENT_PREVIEW_VIEWER_STYLE = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html { background: #f3f4f6 !important; }
  body { margin: 0 !important; padding: 30px 0 44px !important; background: #f3f4f6 !important; color: #1f2937; font-family: Arial, "Microsoft YaHei", "Noto Sans CJK SC", "PingFang SC", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .instrument-pdf-page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 22mm 24mm; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 18px 42px rgba(15, 23, 42, .10); box-sizing: border-box; }
  @media print { html, body { padding: 0 !important; background: #fff !important; } .instrument-pdf-page { margin: 0; border: 0; box-shadow: none; } }
  @media screen and (max-width: 860px) { body { padding: 18px 0 32px !important; } .instrument-pdf-page { width: calc(100vw - 32px); min-height: auto; padding: 40px 44px 56px; } }
  h1, h2, h3 { margin: 0 0 18px; color: #111827; line-height: 1.45; }
  p { margin: 0 0 12px; line-height: 1.9; }
  [data-seal-placeholder], .instrument-seal-placeholder { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 6mm; width: auto; min-width: 36mm; height: 36mm; border: 1px dashed #cbd5e1; border-radius: 4px; background: repeating-linear-gradient(45deg, #f8fafc 0, #f8fafc 8px, #f1f5f9 8px, #f1f5f9 16px); color: #94a3b8; font-size: 12px; line-height: 1.4; vertical-align: middle; }
  [data-seal-placeholder]::after, .instrument-seal-placeholder::after { content: "签章位"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; letter-spacing: 0; pointer-events: none; }
  .instrument-seal-image { display: inline-block; width: 36mm; height: 36mm; object-fit: contain; }
  img { max-width: 100%; }
  .tiptap-variable { color: #1677ff; background: #e6f4ff; border: 1px solid #91caff; border-radius: 4px; padding: 0 4px; }
`;

export const buildInstrumentPreviewDocument = (html: string) => {
  const content = sanitizeInstrumentPreviewHtml(html) || '<p></p>';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style data-instrument-preview-viewer>${INSTRUMENT_PREVIEW_VIEWER_STYLE}</style>
</head>
<body>
  <main class="instrument-pdf-page">${content}</main>
</body>
</html>`;
};

export const sanitizeInstrumentPreviewDocument = (html: string) => {
  const sanitized = String(
    DOMPurify.sanitize(html || '', {
      ALLOW_DATA_ATTR: true,
      FORBID_ATTR: ['srcset'],
      FORBID_TAGS: FORBIDDEN_TAGS,
      USE_PROFILES: { html: true },
      WHOLE_DOCUMENT: true,
    }),
  );
  if (typeof DOMParser === 'undefined') return sanitized;

  const document = new DOMParser().parseFromString(sanitized, 'text/html');
  document.querySelectorAll('style').forEach((style) => {
    if (!style.hasAttribute('data-instrument-preview-viewer')) {
      style.remove();
      return;
    }
    style.textContent = INSTRUMENT_PREVIEW_VIEWER_STYLE;
  });
  document.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const style = element.getAttribute('style') || '';
    if (UNSAFE_STYLE_VALUE.test(style)) element.removeAttribute('style');
  });
  document.querySelectorAll<HTMLElement>('[href], [src]').forEach((element) => {
    ['href', 'src'].forEach((attributeName) => {
      const value = element.getAttribute(attributeName);
      if (value && !isSafeEmbeddedUrl(value, attributeName)) {
        element.removeAttribute(attributeName);
      }
    });
  });

  return `<!doctype html>${document.documentElement.outerHTML}`;
};
