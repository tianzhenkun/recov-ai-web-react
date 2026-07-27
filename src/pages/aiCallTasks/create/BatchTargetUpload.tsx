import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { Button, Upload } from 'antd';
import React from 'react';

type BatchTargetUploadProps = {
  file?: File;
  downloading: boolean;
  onDownload: () => void;
  onFileChange: (file?: File) => void;
};

const BatchTargetUpload = ({
  file,
  downloading,
  onDownload,
  onFileChange,
}: BatchTargetUploadProps) => {
  const fileList: UploadFile[] = file
    ? [{ uid: 'selected-target-list', name: file.name, status: 'done' }]
    : [];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          icon={<DownloadOutlined />}
          loading={downloading}
          onClick={onDownload}
        >
          下载名单模板
        </Button>
      </div>
      <Upload.Dragger
        accept=".xlsx,.xls,.csv"
        beforeUpload={() => false}
        fileList={fileList}
        maxCount={1}
        multiple={false}
        onChange={({ fileList: nextFiles }) => {
          const selected = nextFiles.at(-1)?.originFileObj;
          onFileChange(selected);
        }}
        onRemove={() => {
          onFileChange(undefined);
          return true;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p>上传完整外呼名单</p>
        <p className="text-gray-500">
          支持 xlsx、xls、csv；手机号必填，客户名称选填
        </p>
      </Upload.Dragger>
    </div>
  );
};

export default BatchTargetUpload;
