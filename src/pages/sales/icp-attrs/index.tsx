import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  InputNumber,
  Modal,
  message,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FC } from 'react';
import { useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  createSalesIcpAttr,
  deleteSalesIcpAttrs,
  querySalesIcpAttrPage,
  type SalesIcpAttr,
  type SalesIcpAttrPayload,
  type SalesIcpAttrQuery,
  updateSalesIcpAttr,
} from '@/services/ruoyi/sales';

const { TextArea } = Input;

type AttrEditorState = {
  open: boolean;
  mode: 'create' | 'edit';
  data: SalesIcpAttrPayload;
};

const defaultAttrForm = (): SalesIcpAttrPayload => ({
  attrKey: '',
  attrName: '',
  attrDesc: '',
  required: false,
  scoreWeight: 10,
  sortOrder: 0,
});

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
};

const normalizeAttrPayload = (
  data: SalesIcpAttrPayload,
): SalesIcpAttrPayload => ({
  id: data.id,
  attrKey: data.attrKey.trim(),
  attrName: data.attrName.trim(),
  attrDesc: data.attrDesc.trim(),
  required: Boolean(data.required),
  scoreWeight: Number(data.scoreWeight) || 10,
  sortOrder: Number(data.sortOrder) || 0,
});

const SalesIcpAttrsPage: FC = () => {
  const queryClient = useQueryClient();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [query, setQuery] = useState<SalesIcpAttrQuery>({
    pageNum: 1,
    pageSize: 10,
  });
  const [attrKeyKeyword, setAttrKeyKeyword] = useState('');
  const [attrNameKeyword, setAttrNameKeyword] = useState('');
  const [editor, setEditor] = useState<AttrEditorState>();
  const [saving, setSaving] = useState(false);

  const pageQuery = useQuery({
    queryKey: ['sales-icp-attr-page', query],
    queryFn: () => querySalesIcpAttrPage(query),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sales-icp-attr-page'] }),
      queryClient.invalidateQueries({ queryKey: ['sales-icp-policy'] }),
    ]);
  };

  const openCreate = () => {
    setEditor({
      open: true,
      mode: 'create',
      data: defaultAttrForm(),
    });
  };

  const openEdit = (record: SalesIcpAttr) => {
    setEditor({
      open: true,
      mode: 'edit',
      data: {
        id: record.id,
        attrKey: record.attrKey,
        attrName: record.attrName,
        attrDesc: record.attrDesc,
        required: record.required,
        scoreWeight: record.scoreWeight,
        sortOrder: record.sortOrder,
      },
    });
  };

  const updateEditorData = (patch: Partial<SalesIcpAttrPayload>) => {
    setEditor((prev) =>
      prev
        ? {
            ...prev,
            data: {
              ...prev.data,
              ...patch,
            },
          }
        : prev,
    );
  };

  const submitEditor = async () => {
    if (!editor) return;
    const payload = normalizeAttrPayload(editor.data);
    if (!payload.attrKey || !payload.attrName || !payload.attrDesc) {
      messageApi.warning('请补全属性Key、名称和说明');
      return;
    }
    if ((payload.scoreWeight || 0) < 1 || (payload.scoreWeight || 0) > 100) {
      messageApi.warning('评分权重必须在 1 到 100 之间');
      return;
    }
    setSaving(true);
    try {
      if (editor.mode === 'edit') {
        await updateSalesIcpAttr(payload);
        messageApi.success('属性配置已更新');
      } else {
        await createSalesIcpAttr(payload);
        messageApi.success('属性配置已新增');
      }
      setEditor(undefined);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (record: SalesIcpAttr) => {
    modalApi.confirm({
      title: '删除内置属性',
      content: `删除「${record.attrName}」后，新任务和模板不能再选择该内置属性。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteSalesIcpAttrs([record.id]);
        await refresh();
        messageApi.success('属性配置已删除');
      },
    });
  };

  const applyQuery = () => {
    setQuery((prev) => ({
      ...prev,
      pageNum: 1,
      attrKey: attrKeyKeyword.trim() || undefined,
      attrName: attrNameKeyword.trim() || undefined,
    }));
  };

  const resetQuery = () => {
    setAttrKeyKeyword('');
    setAttrNameKeyword('');
    setQuery({ pageNum: 1, pageSize: query.pageSize || 10 });
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setQuery((prev) => ({
      ...prev,
      pageNum: pagination.current || 1,
      pageSize: pagination.pageSize || prev.pageSize || 10,
    }));
  };

  const columns: ColumnsType<SalesIcpAttr> = [
    {
      title: '属性Key',
      dataIndex: 'attrKey',
      width: 180,
      ellipsis: true,
    },
    {
      title: '属性名称',
      dataIndex: 'attrName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '说明',
      dataIndex: 'attrDesc',
      ellipsis: true,
    },
    {
      title: '启动必填',
      dataIndex: 'required',
      width: 96,
      render: (value: boolean) =>
        value ? <Tag color="blue">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '默认权重',
      dataIndex: 'scoreWeight',
      width: 96,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => openEdit(record),
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => confirmDelete(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer breadcrumbRender={false} title="ICP 属性配置">
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              allowClear
              value={attrKeyKeyword}
              placeholder="属性Key"
              style={{ width: 220 }}
              onChange={(event) => setAttrKeyKeyword(event.target.value)}
              onPressEnter={applyQuery}
            />
            <Input
              allowClear
              value={attrNameKeyword}
              placeholder="属性名称"
              style={{ width: 220 }}
              onChange={(event) => setAttrNameKeyword(event.target.value)}
              onPressEnter={applyQuery}
            />
            <Button type="primary" onClick={applyQuery}>
              查询
            </Button>
            <Button onClick={resetQuery}>重置</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增属性
            </Button>
          </div>
        </section>

        <Table<SalesIcpAttr>
          rowKey={(record) => String(record.id)}
          columns={columns}
          dataSource={pageQuery.data?.rows || []}
          loading={pageQuery.isFetching}
          onChange={handleTableChange}
          scroll={{ x: 1100 }}
          pagination={{
            current: query.pageNum,
            pageSize: query.pageSize,
            total: pageQuery.data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </div>

      <Modal
        title={editor?.mode === 'edit' ? '编辑 ICP 属性' : '新增 ICP 属性'}
        open={Boolean(editor?.open)}
        width={640}
        destroyOnHidden
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        onOk={() => void submitEditor()}
        onCancel={() => setEditor(undefined)}
      >
        {editor ? (
          <div className="grid grid-cols-1 gap-3">
            <Input
              value={editor.data.attrKey}
              placeholder="属性Key，例如 product_or_service"
              disabled={editor.mode === 'edit'}
              maxLength={64}
              onChange={(event) =>
                updateEditorData({ attrKey: event.target.value })
              }
            />
            <Input
              value={editor.data.attrName}
              placeholder="属性名称"
              maxLength={64}
              onChange={(event) =>
                updateEditorData({ attrName: event.target.value })
              }
            />
            <TextArea
              value={editor.data.attrDesc}
              placeholder="属性语义边界说明"
              autoSize={{ minRows: 3, maxRows: 6 }}
              onChange={(event) =>
                updateEditorData({ attrDesc: event.target.value })
              }
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex items-center justify-between rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-3 py-2">
                <span>启动必填</span>
                <Switch
                  checked={Boolean(editor.data.required)}
                  onChange={(required) => updateEditorData({ required })}
                />
              </div>
              <InputNumber
                min={1}
                max={100}
                precision={0}
                value={editor.data.scoreWeight}
                addonBefore="权重"
                style={{ width: '100%' }}
                onChange={(scoreWeight) =>
                  updateEditorData({ scoreWeight: Number(scoreWeight) || 10 })
                }
              />
              <InputNumber
                precision={0}
                value={editor.data.sortOrder}
                addonBefore="排序"
                style={{ width: '100%' }}
                onChange={(sortOrder) =>
                  updateEditorData({ sortOrder: Number(sortOrder) || 0 })
                }
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
};

export default SalesIcpAttrsPage;
