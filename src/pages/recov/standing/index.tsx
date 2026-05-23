import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import type { TablePaginationConfig } from 'antd';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { downloadOss, listOssByIds } from '@/services/ruoyi/oss';
import {
  delStanding,
  listStanding,
  type StandingQuery,
  type StandingVO,
  updateStandingStatus,
} from '@/services/ruoyi/standing';
import {
  attachStandingFile,
  getStandingTypeName,
  STANDING_TYPES,
} from './_shared';
import StandingFormDrawer from './StandingFormDrawer';

type DrawerState = {
  open: boolean;
  mode: 'add' | 'edit';
  editingId?: number | string;
};

type SearchForm = {
  standingCode?: string;
  standingName?: string;
  debtNumber?: number | null;
  status?: string;
};

const statusOptions = [
  { label: '启用', value: '1' },
  { label: '停用', value: '0' },
];

const formatRange = (record: StandingVO) => {
  if (record.startNum == null && record.endNum == null) return '全部资产';
  return `${record.startNum ?? '-'} - ${record.endNum ?? '-'}`;
};

const SmartStandingPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [form] = Form.useForm<SearchForm>();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StandingVO[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [switchingId, setSwitchingId] = useState<number | string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    mode: 'add',
  });

  const confirmDelete = useDeleteConfirm({ modal: modalApi, messageApi });

  const loadData = useCallback(
    async (
      nextPage = pagination.current,
      nextPageSize = pagination.pageSize,
    ) => {
      setLoading(true);
      try {
        const values = form.getFieldsValue();
        const query: StandingQuery = {
          pageNum: nextPage,
          pageSize: nextPageSize,
          standingCode: values.standingCode,
          standingName: values.standingName,
          debtNumber: values.debtNumber ?? undefined,
          status: values.status,
        };
        const res = await listStanding(query);
        const sourceRows = (res.rows ?? []) as StandingVO[];
        const ossIds = sourceRows
          .map((item) => item.standingOssId)
          .filter((id) => id != null && id !== '')
          .map(String);
        let nextRows = sourceRows;
        if (ossIds.length > 0) {
          try {
            const ossRes = await listOssByIds(
              Array.from(new Set(ossIds)).join(','),
            );
            const ossMap = new Map<string, { url?: string; name?: string }>();
            (ossRes.data ?? []).forEach((oss) => {
              if (oss.ossId != null) {
                ossMap.set(String(oss.ossId), {
                  url: oss.url,
                  name: oss.originalName || oss.fileName,
                });
              }
            });
            nextRows = attachStandingFile(sourceRows, ossMap);
          } catch {
            messageApi.error('获取 PDF 文件信息失败');
          }
        }
        setRows(nextRows);
        setTotal(Number(res.total ?? sourceRows.length));
        setPagination({ current: nextPage, pageSize: nextPageSize });
      } catch {
        messageApi.error('获取主体资格材料失败');
      } finally {
        setLoading(false);
      }
    },
    [form, messageApi, pagination.current, pagination.pageSize],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const standingCode = params.get('standingCode') || undefined;
    const debtNumber = params.get('debtNumber');
    if (standingCode || debtNumber) {
      form.setFieldsValue({
        standingCode,
        debtNumber: debtNumber ? Number(debtNumber) : undefined,
      });
    }
    void loadData(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleSearch = () => {
    void loadData(1, pagination.pageSize);
  };

  const handleReset = () => {
    form.resetFields();
    void loadData(1, pagination.pageSize);
  };

  const handleTableChange = (next: TablePaginationConfig) => {
    void loadData(next.current ?? 1, next.pageSize ?? pagination.pageSize);
  };

  const handleAdd = () => {
    setDrawerState({ open: true, mode: 'add' });
  };

  const handleEdit = (record: StandingVO) => {
    setDrawerState({ open: true, mode: 'edit', editingId: record.id });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const handleDrawerSaved = () => {
    void loadData();
  };

  const handleDelete = (record: StandingVO) => {
    confirmDelete<StandingVO>({
      records: [record],
      entityName: '主体资格材料',
      getName: (rec) => rec.standingName,
      description: '删除后不可恢复，请谨慎操作。',
      onConfirm: async () => {
        await delStanding([record.id]);
      },
      onSuccess: () => {
        void loadData();
      },
    });
  };

  const handleToggleStatus = (record: StandingVO, nextStatus: '0' | '1') => {
    const actionText = nextStatus === '1' ? '启用' : '停用';
    modalApi.confirm({
      title: `${actionText}主体资格材料`,
      content:
        nextStatus === '1'
          ? `确定要启用「${record.standingName}」吗？启用后将参与资产编号匹配。`
          : `确定要停用「${record.standingName}」吗？停用后不会参与资产编号匹配。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        setSwitchingId(record.id);
        try {
          await updateStandingStatus(record.id, nextStatus);
          messageApi.success(`${actionText}成功`);
          await loadData();
        } catch {
          messageApi.error('状态切换失败');
        } finally {
          setSwitchingId(null);
        }
      },
    });
  };

  const handlePreview = (record: StandingVO) => {
    if (!record.fileUrl) {
      messageApi.warning('文件地址不存在');
      return;
    }
    window.open(record.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (record: StandingVO) => {
    try {
      await downloadOss(
        record.standingOssId,
        record.fileName || record.standingName,
      );
    } catch (err) {
      messageApi.error((err as Error)?.message || '下载失败');
    }
  };

  const columns: ColumnsType<StandingVO> = useMemo(
    () => [
      {
        title: '材料类型',
        dataIndex: 'standingCode',
        width: 210,
        render: (code: string) => (
          <Tag color="blue" className="!mr-0">
            {getStandingTypeName(code)}
          </Tag>
        ),
      },
      {
        title: '材料名称',
        dataIndex: 'standingName',
        ellipsis: true,
      },
      {
        title: 'PDF 文件',
        dataIndex: 'standingOssId',
        width: 220,
        render: (_: unknown, record) => (
          <Space size={6} className="max-w-full">
            <FilePdfOutlined className="text-red-500" />
            <span className="max-w-[150px] truncate" title={record.fileName}>
              {record.fileName || `OSS ${record.standingOssId}`}
            </span>
          </Space>
        ),
      },
      {
        title: '资产编号范围',
        width: 150,
        render: (_: unknown, record) =>
          record.startNum == null && record.endNum == null ? (
            <Tag color="green" className="!mr-0">
              全部资产
            </Tag>
          ) : (
            <span className="font-mono text-zinc-700">
              {formatRange(record)}
            </span>
          ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        render: (status: string, record) => (
          <Switch
            size="small"
            checked={status === '1'}
            loading={switchingId === record.id}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(checked) =>
              handleToggleStatus(record, checked ? '1' : '0')
            }
          />
        ),
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        width: 180,
        render: (value?: string) =>
          value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
      },
      {
        title: '操作',
        fixed: 'right',
        width: 160,
        render: (_: unknown, record) => (
          <TableActions
            maxVisible={3}
            actions={[
              {
                key: 'preview',
                label: '预览',
                icon: <EyeOutlined />,
                disabled: !record.fileUrl,
                onClick: () => handlePreview(record),
              },
              {
                key: 'download',
                label: '下载',
                icon: <DownloadOutlined />,
                onClick: () => void handleDownload(record),
              },
              {
                key: 'edit',
                label: '编辑',
                icon: <EditOutlined />,
                onClick: () => handleEdit(record),
              },
              {
                key: 'delete',
                label: '删除',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => handleDelete(record),
              },
            ]}
          />
        ),
      },
    ],
    [switchingId],
  );

  return (
    <PageContainer
      title="原告主体资格材料管理"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => void loadData()}
        >
          刷新
        </Button>,
        <Button
          key="add"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新增材料
        </Button>,
      ]}
    >
      {messageContextHolder}
      {modalContextHolder}
      <ProCard className="mb-4">
        <Form<SearchForm>
          form={form}
          layout="inline"
          className="gap-y-3"
          onFinish={handleSearch}
        >
          <Form.Item name="standingCode" label="材料类型">
            <Select
              allowClear
              placeholder="全部类型"
              style={{ width: 210 }}
              options={STANDING_TYPES.map((item) => ({
                label: item.label,
                value: item.code,
              }))}
            />
          </Form.Item>
          <Form.Item name="standingName" label="材料名称">
            <Input
              allowClear
              placeholder="请输入材料名称"
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item name="debtNumber" label="资产编号">
            <InputNumber
              controls={false}
              precision={0}
              min={1}
              placeholder="覆盖该编号"
              style={{ width: 150 }}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 120 }}
              options={statusOptions}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
              >
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </ProCard>

      <ProCard>
        <Table<StandingVO>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1120 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (count) => `共 ${count} 条`,
          }}
          onChange={handleTableChange}
        />
      </ProCard>

      <StandingFormDrawer
        open={drawerState.open}
        mode={drawerState.mode}
        editingId={drawerState.editingId}
        allUsedRanges={[]}
        onClose={closeDrawer}
        onSaved={handleDrawerSaved}
        messageApi={messageApi}
      />
    </PageContainer>
  );
};

export default SmartStandingPage;
