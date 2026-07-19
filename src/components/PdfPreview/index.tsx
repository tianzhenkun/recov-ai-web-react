import {
  ExportOutlined,
  LeftOutlined,
  RightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { Alert, Button, Empty, Space, Spin, Tooltip, Typography } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { getToken } from '@/adapters/ruoyi/token';
import { getOssBlob } from '@/shared/services/oss';
import { normalizeSafePdfUrl, shouldAttachPdfAuthorization } from './security';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './index.css';

const { Text } = Typography;

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export type PdfPreviewProps = {
  url?: string;
  ossId?: number | string;
  fileName?: string;
  className?: string;
  style?: CSSProperties;
  height?: CSSProperties['height'];
  emptyDescription?: ReactNode;
  errorDescription?: ReactNode;
  maxPageWidth?: number;
  showToolbar?: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const PdfPreview = ({
  url,
  ossId,
  fileName,
  className,
  style,
  height = '70vh',
  emptyDescription = '暂无可预览 PDF',
  errorDescription = 'PDF 加载失败，请点击“新窗口打开”查看原始文件。',
  maxPageWidth = 920,
  showToolbar = true,
}: PdfPreviewProps) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [fileBlob, setFileBlob] = useState<Blob | undefined>();
  const safeUrl =
    typeof window === 'undefined'
      ? undefined
      : normalizeSafePdfUrl(url, window.location.origin);

  const normalizedOssId =
    ossId === undefined || ossId === null || ossId === '' ? '' : String(ossId);
  const file = useMemo(
    () =>
      fileBlob ||
      (!normalizedOssId && safeUrl
        ? {
            url: safeUrl,
          }
        : undefined),
    [fileBlob, normalizedOssId, safeUrl],
  );
  const documentOptions = useMemo(() => {
    if (normalizedOssId) return undefined;

    const token = getToken();
    if (
      !token ||
      typeof window === 'undefined' ||
      !shouldAttachPdfAuthorization(safeUrl, window.location.origin)
    ) {
      return undefined;
    }

    return {
      httpHeaders: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    };
  }, [normalizedOssId, safeUrl]);
  const pageWidth = Math.round(
    clamp((containerWidth || maxPageWidth) - 48, 320, maxPageWidth) * scale,
  );

  useEffect(() => {
    setFileBlob(undefined);
    setPageNumber(1);
    setNumPages(0);
    setScale(1);
    setLoadError(false);
    setLoading(Boolean(safeUrl || normalizedOssId));
  }, [normalizedOssId, safeUrl]);

  useEffect(() => {
    if (!normalizedOssId) return undefined;

    let active = true;

    getOssBlob(normalizedOssId)
      .then((blob) => {
        if (!active) return;
        setFileBlob(blob);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, [normalizedOssId]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return undefined;

    const refreshWidth = () => setContainerWidth(element.clientWidth);
    refreshWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', refreshWidth);
      return () => window.removeEventListener('resize', refreshWidth);
    }

    const observer = new ResizeObserver(refreshWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const openInNewWindow = () => {
    if (!safeUrl) return;
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };

  const rootStyle = useMemo<CSSProperties>(
    () => ({
      ...style,
      height,
    }),
    [height, style],
  );

  if (!safeUrl && !normalizedOssId) {
    return (
      <div className={`pdf-preview ${className || ''}`} style={rootStyle}>
        <Empty description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={`pdf-preview ${className || ''}`} style={rootStyle}>
      {showToolbar ? (
        <div className="pdf-preview-toolbar">
          <Space size={6} wrap>
            <Tooltip title="上一页">
              <Button
                aria-label="上一页"
                disabled={pageNumber <= 1}
                icon={<LeftOutlined />}
                size="small"
                onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
              />
            </Tooltip>
            <Text className="pdf-preview-page-indicator">
              {numPages ? `${pageNumber} / ${numPages}` : '- / -'}
            </Text>
            <Tooltip title="下一页">
              <Button
                aria-label="下一页"
                disabled={!numPages || pageNumber >= numPages}
                icon={<RightOutlined />}
                size="small"
                onClick={() =>
                  setPageNumber((value) => Math.min(numPages, value + 1))
                }
              />
            </Tooltip>
          </Space>
          <Space size={6} wrap>
            <Tooltip title="缩小">
              <Button
                aria-label="缩小"
                disabled={scale <= 0.6}
                icon={<ZoomOutOutlined />}
                size="small"
                onClick={() =>
                  setScale((value) => clamp(value - 0.1, 0.6, 1.8))
                }
              />
            </Tooltip>
            <Text className="pdf-preview-scale">
              {Math.round(scale * 100)}%
            </Text>
            <Tooltip title="放大">
              <Button
                aria-label="放大"
                disabled={scale >= 1.8}
                icon={<ZoomInOutlined />}
                size="small"
                onClick={() =>
                  setScale((value) => clamp(value + 0.1, 0.6, 1.8))
                }
              />
            </Tooltip>
            <Tooltip title="新窗口打开">
              <Button
                aria-label="新窗口打开"
                icon={<ExportOutlined />}
                size="small"
                onClick={openInNewWindow}
              />
            </Tooltip>
          </Space>
        </div>
      ) : null}

      {loadError ? (
        <Alert
          showIcon
          className="pdf-preview-alert"
          title={errorDescription}
          type="error"
          action={
            <Button size="small" type="primary" onClick={openInNewWindow}>
              新窗口打开
            </Button>
          }
        />
      ) : null}

      <div ref={stageRef} className="pdf-preview-stage">
        <Spin
          spinning={loading}
          description={fileName ? `正在加载 ${fileName}` : '正在加载 PDF'}
        >
          <Document
            file={file}
            options={documentOptions}
            loading={null}
            noData={<Empty description={emptyDescription} />}
            error={null}
            onLoadSuccess={(document) => {
              setNumPages(document.numPages);
              setPageNumber(1);
              setLoading(false);
              setLoadError(false);
            }}
            onLoadError={() => {
              setLoading(false);
              setLoadError(true);
            }}
          >
            <Page
              key={`${pageNumber}-${pageWidth}`}
              pageNumber={pageNumber}
              renderMode="canvas"
              width={pageWidth}
              loading={null}
              error={null}
              onRenderSuccess={() => setLoading(false)}
            />
          </Document>
        </Spin>
      </div>
    </div>
  );
};

export default PdfPreview;
