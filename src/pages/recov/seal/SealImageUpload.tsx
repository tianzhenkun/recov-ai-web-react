import { PictureOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Image, Spin, Upload } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useEffect, useRef, useState } from 'react';
import { listOssByIds, uploadOssFile } from '@/services/ruoyi/oss';

type SealImageUploadProps = {
  value?: string | number;
  onChange?: (ossId: string) => void;
  messageApi: MessageInstance;
  size?: number;
  /** 是否在图片下方显示与 Vue image-upload 一致的提示语 */
  showTip?: boolean;
};

const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE_MB = 6;

const SealImageUpload = ({
  value,
  onChange,
  messageApi,
  size = 120,
  showTip = true,
}: SealImageUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const requestedOssIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const id = value == null || value === '' ? '' : String(value);
    if (!id) {
      setPreviewUrl(undefined);
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
        if (first?.url) {
          setPreviewUrl(first.url);
        }
      } catch {
        if (!cancelled) {
          messageApi.error('获取印章图片预览失败');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [value, messageApi]);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!ACCEPT_TYPES.includes(file.type)) {
      messageApi.warning('仅支持 png / jpg / jpeg 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
      messageApi.warning(`图片大小不能超过 ${MAX_SIZE_MB}MB`);
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
      const res = await uploadOssFile(file as File);
      const ossId = res.data?.ossId;
      const url = res.data?.url;
      if (ossId == null) {
        throw new Error('上传响应缺少 ossId');
      }
      const nextId = String(ossId);
      requestedOssIdRef.current = nextId;
      if (url) setPreviewUrl(url);
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
    <div className="inline-flex flex-col gap-2">
      <Upload
        accept=".png,.jpg,.jpeg"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        disabled={uploading}
      >
        {previewUrl ? (
          <div
            className="group relative inline-block cursor-pointer overflow-hidden rounded-md border border-gray-200"
            style={{ width: size, height: size }}
          >
            <Spin spinning={uploading} size="small">
              <Image
                src={previewUrl}
                alt="印章图片"
                width={size}
                height={size}
                preview={false}
                style={{ objectFit: 'contain', background: '#f5f5f5' }}
              />
            </Spin>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-black/55 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            >
              <PictureOutlined className="mr-1" />
              更换图片
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500"
            style={{ width: size, height: size }}
          >
            <Spin spinning={uploading} size="small">
              <div className="flex flex-col items-center justify-center gap-1">
                <PlusOutlined style={{ fontSize: 20 }} />
                <span className="text-xs">上传</span>
              </div>
            </Spin>
          </button>
        )}
      </Upload>
      {showTip ? (
        <div className="text-xs text-gray-500">
          请上传 大小不超过{' '}
          <span className="text-red-500">{MAX_SIZE_MB}MB</span> 格式为{' '}
          <span className="text-red-500">png/jpg/jpeg</span> 的文件
        </div>
      ) : null}
    </div>
  );
};

export default SealImageUpload;
