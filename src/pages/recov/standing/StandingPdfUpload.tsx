import { FilePdfOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Button, Space, Spin, Upload } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useEffect, useRef, useState } from 'react';
import { listOssByIds, uploadOssFile } from '@/services/ruoyi/oss';

type StandingPdfUploadProps = {
  value?: string | number;
  onChange?: (ossId: string) => void;
  messageApi: MessageInstance;
};

const MAX_SIZE_MB = 20;

const isPdfFile = (file: File) => {
  const name = file.name.toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf');
};

const StandingPdfUpload = ({
  value,
  onChange,
  messageApi,
}: StandingPdfUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>();
  const requestedOssIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const id = value == null || value === '' ? '' : String(value);
    if (!id) {
      setFileName(undefined);
      requestedOssIdRef.current = undefined;
      return;
    }
    if (requestedOssIdRef.current === id) return;
    requestedOssIdRef.current = id;

    let cancelled = false;
    (async () => {
      try {
        const res = await listOssByIds(id);
        if (cancelled) return;
        const first = res.data?.[0];
        setFileName(first?.originalName || first?.fileName || `PDF-${id}`);
      } catch {
        if (!cancelled) messageApi.error('获取 PDF 文件信息失败');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [value, messageApi]);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!isPdfFile(file as File)) {
      messageApi.warning('仅支持上传 PDF 文件');
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
      messageApi.warning(`PDF 文件大小不能超过 ${MAX_SIZE_MB}MB`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest: UploadProps['customRequest'] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    setUploading(true);
    try {
      const target = file as File;
      const res = await uploadOssFile(target);
      const ossId = res.data?.ossId;
      if (ossId == null) {
        throw new Error('上传响应缺少 ossId');
      }
      const nextId = String(ossId);
      requestedOssIdRef.current = nextId;
      setFileName(target.name);
      onChange?.(nextId);
      messageApi.success('上传成功');
      onSuccess?.({}, new XMLHttpRequest());
    } catch (err) {
      onError?.(err as Error);
      messageApi.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Space direction="vertical" size={8} className="w-full">
      <Upload
        accept="application/pdf,.pdf"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        disabled={uploading}
      >
        {fileName ? (
          <Button icon={<FilePdfOutlined />} loading={uploading}>
            替换 PDF
          </Button>
        ) : (
          <Button icon={<PlusOutlined />} loading={uploading}>
            上传 PDF
          </Button>
        )}
      </Upload>
      {fileName ? (
        <div className="flex max-w-full items-center gap-2 rounded-md border border-solid border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          <FilePdfOutlined className="text-red-500" />
          <span className="truncate" title={fileName}>
            {fileName}
          </span>
        </div>
      ) : (
        <div className="text-xs text-zinc-500">
          仅支持 PDF，大小不超过 {MAX_SIZE_MB}MB
        </div>
      )}
      <Spin spinning={uploading} size="small" />
    </Space>
  );
};

export default StandingPdfUpload;
