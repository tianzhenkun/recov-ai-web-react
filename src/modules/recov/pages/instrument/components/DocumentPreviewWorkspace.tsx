import { Empty, Splitter, Tag, Typography } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import React from 'react';
import PdfPreview from '@/components/PdfPreview';
import { sanitizeInstrumentPreviewDocument } from '../previewSecurity';
import './DocumentPreviewWorkspace.css';

const { Text } = Typography;

type InstrumentDocumentWorkspaceShellProps = {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  orientation?: 'horizontal' | 'vertical';
  sidebar?: ReactNode;
  sidebarClassName?: string;
  sidebarDefaultSize?: number | string;
  sidebarMax?: number | string;
  sidebarMin?: number | string;
};

export type InstrumentDocumentNavTag = {
  key?: string;
  label: ReactNode;
  color?: string;
};

type InstrumentDocumentNavItemProps = {
  active?: boolean;
  disabled?: boolean;
  errorMessage?: ReactNode;
  onClick?: () => void;
  subtitle?: ReactNode;
  tags?: InstrumentDocumentNavTag[];
  title: ReactNode;
};

export const InstrumentDocumentNavItem = ({
  active,
  disabled,
  errorMessage,
  onClick,
  subtitle,
  tags = [],
  title,
}: InstrumentDocumentNavItemProps) => (
  <button
    type="button"
    aria-pressed={active}
    className={`instrument-doc-item${active ? ' instrument-doc-item-active' : ''}`}
    disabled={disabled}
    onClick={onClick}
  >
    <span className="instrument-doc-item-main">
      <Text strong ellipsis>
        {title}
      </Text>
      {subtitle ? (
        <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
          {subtitle}
        </Text>
      ) : null}
      {tags.length > 0 ? (
        <span className="instrument-doc-item-tags">
          {tags.map((tag) => (
            <Tag key={tag.key ?? String(tag.label)} color={tag.color}>
              {tag.label}
            </Tag>
          ))}
        </span>
      ) : null}
    </span>
    {errorMessage ? (
      <Text type="danger" className="instrument-doc-item-error">
        {errorMessage}
      </Text>
    ) : null}
  </button>
);

export const InstrumentDocumentWorkspaceShell = ({
  children,
  className,
  mainClassName,
  orientation = 'horizontal',
  sidebar,
  sidebarClassName,
  sidebarDefaultSize,
  sidebarMax,
  sidebarMin,
}: InstrumentDocumentWorkspaceShellProps) => {
  const shellClassName = `instrument-workspace-shell${
    sidebar ? '' : ' instrument-workspace-shell-single'
  }${className ? ` ${className}` : ''}`;
  const mainSection = (
    <section
      className={`instrument-doc-main${mainClassName ? ` ${mainClassName}` : ''}`}
    >
      {children}
    </section>
  );

  if (!sidebar) {
    return <div className={shellClassName}>{mainSection}</div>;
  }

  return (
    <div className={shellClassName}>
      <Splitter orientation={orientation}>
        <Splitter.Panel
          defaultSize={
            sidebarDefaultSize ?? (orientation === 'vertical' ? 220 : 280)
          }
          min={sidebarMin ?? (orientation === 'vertical' ? 160 : 240)}
          max={sidebarMax ?? (orientation === 'vertical' ? 360 : 420)}
        >
          <aside
            className={`instrument-doc-sidebar${
              sidebarClassName ? ` ${sidebarClassName}` : ''
            }`}
          >
            {sidebar}
          </aside>
        </Splitter.Panel>
        <Splitter.Panel>{mainSection}</Splitter.Panel>
      </Splitter>
    </div>
  );
};

type InstrumentDocumentPreviewStageProps = {
  className?: string;
  emptyDescription?: ReactNode;
  fileName?: string;
  html?: string;
  pdfHeight?: CSSProperties['height'];
  pdfOssId?: number | string;
  pdfUrl?: string;
};

export const InstrumentDocumentPreviewStage = ({
  className,
  emptyDescription = '暂无可预览文书',
  fileName,
  html,
  pdfHeight,
  pdfOssId,
  pdfUrl,
}: InstrumentDocumentPreviewStageProps) => (
  <div className={`instrument-doc-stage${className ? ` ${className}` : ''}`}>
    {pdfUrl ? (
      <PdfPreview
        className="instrument-preview-frame"
        fileName={fileName}
        height={pdfHeight ?? '100%'}
        ossId={pdfOssId}
        url={pdfUrl}
      />
    ) : html ? (
      <iframe
        title="文书预览"
        sandbox=""
        srcDoc={sanitizeInstrumentPreviewDocument(html)}
        className="instrument-preview-frame"
      />
    ) : (
      <div className="instrument-empty-stage">
        <Empty description={emptyDescription} />
      </div>
    )}
  </div>
);
