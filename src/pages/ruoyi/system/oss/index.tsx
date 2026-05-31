import {
  DeleteOutlined,
  DownloadOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Image, Modal, message, Space, Tag, Upload } from 'antd';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { addRuoyiDateRange } from '@/adapters/ruoyi/params';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { getConfigKey, updateConfigByKey } from '@/services/ruoyi/config';
import {
  deleteOss,
  downloadOss,
  listOss,
  type OssItem,
  type OssQuery,
  uploadOssFile,
} from '@/services/ruoyi/oss';

type OssSearchParams = {
  current?: number;
  pageSize?: number;
  fileName?: string;
  originalName?: string;
  fileSuffix?: string;
  service?: string;
  createTimeRange?: unknown;
};

type UploadMode = 'file' | 'image';

const imageSuffixes = ['.png', '.jpg', '.jpeg'];

const isImageSuffix = (fileSuffix?: string | string[]) => {
  const suffixes = Array.isArray(fileSuffix) ? fileSuffix : [fileSuffix];
  return suffixes.some((suffix) =>
    imageSuffixes.includes(String(suffix || '').toLowerCase()),
  );
};

const formatRangeTime = (value: unknown, boundary: 'start' | 'end') => {
  if (!value) return undefined;
  const isSupportedValue =
    typeof value === 'string' ||
    typeof value === 'number' ||
    value instanceof Date ||
    dayjs.isDayjs(value);

  if (!isSupportedValue) return undefined;

  const date = dayjs(value as string | number | Date | Dayjs);
  if (!date.isValid()) return undefined;
  return (
    boundary === 'start' ? date.startOf('day') : date.endOf('day')
  ).format('YYYY-MM-DD HH:mm:ss');
};

const toOrderQuery = (
  sorter: Record<string, 'ascend' | 'descend' | null | undefined>,
) => {
  const entries = Object.entries(sorter).filter(([, order]) => Boolean(order));
  if (entries.length === 0) {
    return {
      orderByColumn: 'createTime',
      isAsc: 'ascending',
    };
  }

  return {
    orderByColumn: entries.map(([key]) => key).join(','),
    isAsc: entries
      .map(([, order]) => (order === 'ascend' ? 'ascending' : 'descending'))
      .join(','),
  };
};

const toOssQuery = (
  params: OssSearchParams,
  sorter: Record<string, 'ascend' | 'descend' | null | undefined>,
): OssQuery => {
  const [beginTime, endTime] = Array.isArray(params.createTimeRange)
    ? params.createTimeRange
    : [];

  return addRuoyiDateRange(
    {
      pageNum: params.current || 1,
      pageSize: params.pageSize || 10,
      fileName: params.fileName,
      originalName: params.originalName,
      fileSuffix: params.fileSuffix,
      service: params.service,
      ...toOrderQuery(sorter),
    },
    [formatRangeTime(beginTime, 'start'), formatRangeTime(endTime, 'end')],
    'CreateTime',
  );
};

const getDownloadName = (record: OssItem) =>
  record.originalName || record.fileName || `oss_${record.ossId}`;

const getOssRowKey = (record: OssItem) => String(record.ossId);

const isImageFile = (file: RcFile) =>
  file.type.startsWith('image/') ||
  isImageSuffix(file.name.slice(file.name.lastIndexOf('.')));

const toUploadFile = (file: RcFile): UploadFile => ({
  uid: file.uid,
  name: file.name,
  status: 'done',
  originFileObj: file,
});

const OssPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<OssItem[]>([]);
  const [previewListResource, setPreviewListResource] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const selectedIds = selectedRows
    .map((item) => item.ossId)
    .filter(Boolean) as (number | string)[];

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const loadPreviewConfig = async () => {
    try {
      const response = await getConfigKey('sys.oss.previewListResource');
      setPreviewListResource(
        response.data === undefined ? true : response.data === 'true',
      );
    } catch {
      setPreviewListResource(true);
    }
  };

  const openUploadModal = (mode: UploadMode) => {
    setUploadMode(mode);
    setFileList([]);
    setUploadOpen(true);
  };

  const confirmDelete = (records: OssItem[]) => {
    const ids = records.map((item) => item.ossId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '文件',
      unit: '个',
      getName: (record) =>
        record.originalName || record.fileName || record.ossId,
      description: '删除后，该文件将无法继续下载或预览。',
      batchDescription: '删除后，这些文件将无法继续下载或预览。',
      onConfirm: async () => {
        await deleteOss(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const submitUpload = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      messageApi.warning('请选择要上传的文件');
      return;
    }

    setUploading(true);
    try {
      await uploadOssFile(file);
      messageApi.success('上传成功');
      setUploadOpen(false);
      setFileList([]);
      reloadTable();
    } finally {
      setUploading(false);
    }
  };

  const togglePreviewListResource = async () => {
    const nextPreview = !previewListResource;
    await updateConfigByKey('sys.oss.previewListResource', nextPreview);
    setPreviewListResource(nextPreview);
    messageApi.success(`${nextPreview ? '启用' : '停用'}成功`);
    actionRef.current?.reload?.();
  };

  const handleDownload = async (record: OssItem) => {
    if (!record.ossId) return;

    const rowKey = getOssRowKey(record);
    setDownloadingKeys((keys) => new Set(keys).add(rowKey));
    try {
      await downloadOss(record.ossId, getDownloadName(record));
      messageApi.success('下载已开始');
    } finally {
      setDownloadingKeys((keys) => {
        const nextKeys = new Set(keys);
        nextKeys.delete(rowKey);
        return nextKeys;
      });
    }
  };

  const columns: ProColumns<OssItem>[] = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      ellipsis: true,
    },
    {
      title: '原名',
      dataIndex: 'originalName',
      ellipsis: true,
    },
    {
      title: '文件后缀',
      dataIndex: 'fileSuffix',
      ellipsis: true,
      width: 112,
      render: (_, record) =>
        record.fileSuffix ? <Tag>{record.fileSuffix}</Tag> : '-',
    },
    {
      title: '文件展示',
      dataIndex: 'url',
      search: false,
      ellipsis: true,
      width: 220,
      render: (_, record) => {
        if (previewListResource && isImageSuffix(record.fileSuffix)) {
          return (
            <Image
              height={72}
              src={record.url}
              style={{ objectFit: 'cover', borderRadius: 6 }}
              width={72}
            />
          );
        }

        return record.url || '-';
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      search: false,
      sorter: true,
      width: 180,
    },
    {
      title: '创建时间',
      dataIndex: 'createTimeRange',
      valueType: 'dateRange',
      hideInTable: true,
    },
    {
      title: '上传人',
      dataIndex: 'createByName',
      search: false,
      ellipsis: true,
      width: 128,
    },
    {
      title: '服务商',
      dataIndex: 'service',
      sorter: true,
      ellipsis: true,
      width: 128,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 96,
      align: 'left',
      render: (_, record) => {
        const isDownloading = downloadingKeys.has(getOssRowKey(record));

        return (
          <TableActions
            actions={[
              {
                key: 'download',
                label: isDownloading ? '下载中' : '下载',
                icon: <DownloadOutlined />,
                loading: isDownloading,
                permissions: 'system:oss:download',
                onClick: () => handleDownload(record),
              },
              {
                key: 'delete',
                label: '删除',
                danger: true,
                icon: <DeleteOutlined />,
                permissions: 'system:oss:remove',
                onClick: () => confirmDelete([record]),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <PageContainer title="文件管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<OssItem, OssSearchParams>
        actionRef={actionRef}
        rowKey={getOssRowKey}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        columns={columns}
        request={async (params, sorter) => {
          await loadPreviewConfig();
          const query = toOssQuery(
            params,
            sorter as Record<string, 'ascend' | 'descend' | null | undefined>,
          );
          const response = await listOss(query);
          return {
            data: response.rows || [],
            total: response.total || 0,
            success: true,
          };
        }}
        rowSelection={{
          selectedRowKeys: selectedIds.map(String),
          onChange: (_, rows) => setSelectedRows(rows),
        }}
        toolBarRender={() => [
          <PermissionButton
            key="uploadFile"
            type="primary"
            icon={<UploadOutlined />}
            permissions="system:oss:upload"
            onClick={() => openUploadModal('file')}
          >
            上传文件
          </PermissionButton>,
          <PermissionButton
            key="uploadImage"
            icon={<UploadOutlined />}
            permissions="system:oss:upload"
            onClick={() => openUploadModal('image')}
          >
            上传图片
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:oss:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="preview"
            danger={previewListResource}
            icon={
              previewListResource ? <EyeInvisibleOutlined /> : <EyeOutlined />
            }
            permissions="system:oss:edit"
            onClick={togglePreviewListResource}
          >
            {previewListResource ? '禁用预览' : '启用预览'}
          </PermissionButton>,
          <PermissionButton
            key="config"
            icon={<SettingOutlined />}
            permissions="system:ossConfig:list"
            onClick={() => history.push('/sys-conf/oss-config/index')}
          >
            配置管理
          </PermissionButton>,
        ]}
      />
      <Modal
        destroyOnHidden
        okText="确定"
        open={uploadOpen}
        title={uploadMode === 'image' ? '上传图片' : '上传文件'}
        confirmLoading={uploading}
        onCancel={() => {
          setUploadOpen(false);
          setFileList([]);
        }}
        onOk={submitUpload}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Upload.Dragger
            maxCount={1}
            fileList={fileList}
            accept={uploadMode === 'image' ? 'image/*' : undefined}
            beforeUpload={(file) => {
              if (uploadMode === 'image' && !isImageFile(file)) {
                messageApi.error('请选择图片文件');
                return Upload.LIST_IGNORE;
              }
              setFileList([toUploadFile(file)]);
              return false;
            }}
            onRemove={() => {
              setFileList([]);
            }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域</p>
            <p className="ant-upload-hint">
              {uploadMode === 'image'
                ? '仅用于上传图片文件'
                : '一次上传一个文件'}
            </p>
          </Upload.Dragger>
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default OssPage;
