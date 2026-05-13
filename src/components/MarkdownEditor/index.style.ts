import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => ({
  container: {
    width: '100%',
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    overflow: 'hidden',
    background: token.colorBgContainer,
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    padding: '6px 10px',
    overflowX: 'auto',
    overflowY: 'hidden',
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  group: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  divider: {
    display: 'inline-block',
    width: 1,
    height: 18,
    marginInline: 6,
    background: token.colorBorderSecondary,
  },
  btn: {
    width: 32,
    height: 30,
    padding: 0,
    borderRadius: 8,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    fontWeight: 600,
    transition:
      'background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease',
    '&:hover': {
      background: token.colorFillTertiary,
      color: token.colorText,
    },
  },
  btnActive: {
    background: token.controlItemBgActive,
    color: token.colorPrimary,
    boxShadow: `inset 0 0 0 1px ${token.colorPrimaryBorder}`,
    '&:hover': {
      background: token.controlItemBgActive,
      color: token.colorPrimary,
    },
  },
  toolbarText: {
    fontSize: token.fontSizeSM,
    fontWeight: 600,
    lineHeight: 1,
  },
  content: {
    position: 'relative',
    '.tiptap-prose': {
      minHeight: 'var(--editor-min-height, 300px)',
      padding: '16px 20px',
      outline: 'none',
      fontFamily: token.fontFamily,
      fontSize: token.fontSize,
      lineHeight: 1.6,
      color: token.colorText,
    },
    '.tiptap-prose p': {
      margin: '0 0 12px',
      '&:last-child': {
        marginBottom: 0,
      },
    },
    '.tiptap-prose h1, .tiptap-prose h2, .tiptap-prose h3, .tiptap-prose h4, .tiptap-prose h5, .tiptap-prose h6':
      {
        margin: '16px 0 8px',
        fontWeight: 600,
        lineHeight: 1.4,
      },
    '.tiptap-prose h1': { fontSize: '1.8em' },
    '.tiptap-prose h2': { fontSize: '1.5em' },
    '.tiptap-prose h3': { fontSize: '1.25em' },
    '.tiptap-prose ul, .tiptap-prose ol': {
      margin: '8px 0',
      paddingLeft: 24,
    },
    '.tiptap-prose li': {
      margin: '4px 0',
    },
    '.tiptap-prose blockquote': {
      margin: '12px 0',
      padding: '8px 16px',
      borderLeft: `4px solid ${token.colorPrimary}`,
      background: token.colorFillTertiary,
      color: token.colorTextSecondary,
    },
    '.tiptap-prose code': {
      padding: '2px 6px',
      background: token.colorFillTertiary,
      borderRadius: 3,
      fontFamily: token.fontFamilyCode,
      fontSize: '0.9em',
    },
    '.tiptap-prose a': {
      color: token.colorPrimary,
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
    '.tiptap-prose table': {
      borderCollapse: 'collapse',
      tableLayout: 'fixed',
      width: '100%',
      margin: '12px 0',
    },
    '.tiptap-prose td, .tiptap-prose th': {
      border: `1px solid ${token.colorBorder}`,
      minWidth: '1em',
      padding: '8px 12px',
      verticalAlign: 'top',
      boxSizing: 'border-box',
    },
    '.tiptap-prose th': {
      background: token.colorFillSecondary,
      fontWeight: 600,
    },
  },
}));

export default useStyles;
