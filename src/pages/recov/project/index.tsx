import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
  Table,
  Tag,
  theme,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  RECOV_FILTER_CONTROL_STYLE,
  renderRecovSingleLineText,
} from '@/pages/recov/components/RecovFilterControls';
import {
  RecovListPage,
  RecovListStack,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import {
  addProject,
  batchAddProjects,
  deleteProject,
  type FeeTier,
  getProjectPage,
  type ProjectPayload,
  type ProjectQuery,
  type ProjectStatus,
  type RecovProjectItem,
  updateProject,
} from '@/services/ruoyi/project';

const FEE_TIER_OPTIONS: { label: string; value: FeeTier }[] = [
  { label: '一级', value: 'TIER_1' },
  { label: '二级', value: 'TIER_2' },
  { label: '三级', value: 'TIER_3' },
  { label: '其他', value: 'TIER_OTHER' },
];

const STATUS_OPTIONS: { label: string; value: ProjectStatus }[] = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
];

type QueryValues = {
  projectName?: string;
  feeTier?: FeeTier;
  status?: ProjectStatus;
};

type ProjectFormValues = {
  projectName: string;
  feeTier: FeeTier;
  status?: ProjectStatus;
  sortOrder?: number;
  remark?: string;
};

type BatchFormValues = {
  items: ProjectFormValues[];
};

type ModalState =
  | { open: false; mode: 'add'; record?: undefined }
  | { open: true; mode: 'add'; record?: undefined }
  | { open: true; mode: 'edit'; record: RecovProjectItem };

const normalizeProjectPayload = (
  values: ProjectFormValues,
  id?: number | string,
): ProjectPayload => ({
  id,
  projectName: values.projectName.trim(),
  feeTier: values.feeTier,
  status: values.status ?? 1,
  sortOrder: values.sortOrder ?? 0,
  remark: values.remark?.trim() || null,
});

const getFeeTierName = (record: RecovProjectItem) =>
  record.feeTierName ||
  FEE_TIER_OPTIONS.find((item) => item.value === record.feeTier)?.label ||
  record.feeTier;

const getStatusTag = (status?: ProjectStatus) =>
  status === 0 ? <Tag>停用</Tag> : <Tag color="success">启用</Tag>;

const ProjectMaintenancePage = () => {
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [queryForm] = Form.useForm<QueryValues>();
  const [projectForm] = Form.useForm<ProjectFormValues>();
  const [batchForm] = Form.useForm<BatchFormValues>();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [rows, setRows] = useState<RecovProjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<ProjectQuery>({
    pageNum: 1,
    pageSize: 10,
  });
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: 'add',
  });
  const [batchOpen, setBatchOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProjectPage(query);
      setRows(res.rows ?? []);
      setTotal(res.total ?? 0);
    } catch {
      messageApi.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi, query]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const openAddModal = () => {
    projectForm.setFieldsValue({
      status: 1,
      sortOrder: 0,
      feeTier: 'TIER_1',
    });
    setModalState({ open: true, mode: 'add' });
  };

  const openEditModal = (record: RecovProjectItem) => {
    projectForm.setFieldsValue({
      projectName: record.projectName,
      feeTier: record.feeTier as FeeTier,
      status: record.status ?? 1,
      sortOrder: record.sortOrder ?? 0,
      remark: record.remark || undefined,
    });
    setModalState({ open: true, mode: 'edit', record });
  };

  const closeProjectModal = () => {
    setModalState({ open: false, mode: 'add' });
    projectForm.resetFields();
  };

  const refreshFirstPage = async () => {
    setQuery((prev) => ({ ...prev, pageNum: 1 }));
  };

  const saveProject = async () => {
    const values = await projectForm.validateFields();
    const record = modalState.mode === 'edit' ? modalState.record : undefined;
    const payload = normalizeProjectPayload(values, record?.id);

    const submit = async () => {
      setSaving(true);
      try {
        if (record) {
          await updateProject(payload);
        } else {
          await addProject(payload);
        }
        messageApi.success('保存成功');
        closeProjectModal();
        await loadProjects();
      } catch {
        messageApi.error('保存项目失败');
      } finally {
        setSaving(false);
      }
    };

    if (record?.referenced && record.feeTier !== payload.feeTier) {
      modalApi.confirm({
        title: '修改计费层级',
        content:
          '修改计费层级后，仅影响后续新录入回款的服务费计算，已生成的回款明细不重算。',
        okText: '确认修改',
        cancelText: '取消',
        onOk: submit,
      });
      return;
    }

    await submit();
  };

  const openBatchModal = () => {
    batchForm.setFieldsValue({
      items: [{ projectName: '', feeTier: 'TIER_1', status: 1, sortOrder: 0 }],
    });
    setBatchOpen(true);
  };

  const closeBatchModal = () => {
    setBatchOpen(false);
    batchForm.resetFields();
  };

  const saveBatchProjects = async () => {
    const values = await batchForm.validateFields();
    const items = values.items.map((item) => normalizeProjectPayload(item));
    setBatchSaving(true);
    try {
      await batchAddProjects({ items });
      messageApi.success('批量新增成功');
      closeBatchModal();
      await refreshFirstPage();
      await loadProjects();
    } catch {
      messageApi.error('批量新增项目失败');
    } finally {
      setBatchSaving(false);
    }
  };

  const handleDelete = (record: RecovProjectItem) => {
    if (record.referenced) {
      messageApi.warning('该项目已被债务引用，不能删除');
      return;
    }
    modalApi.confirm({
      title: '删除项目',
      content: `确认删除项目“${record.projectName}”吗？删除后该项目将不能再用于资产包导入。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteProject(record.id);
          messageApi.success('删除成功');
          await loadProjects();
        } catch {
          messageApi.error('删除项目失败');
        }
      },
    });
  };

  const handleSearch = (values: QueryValues) => {
    setQuery((prev) => ({
      ...prev,
      ...values,
      pageNum: 1,
    }));
  };

  const handleReset = () => {
    queryForm.resetFields();
    setQuery({
      pageNum: 1,
      pageSize: query.pageSize,
    });
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setQuery((prev) => ({
      ...prev,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    }));
  };

  const columns: ColumnsType<RecovProjectItem> = useMemo(
    () => [
      {
        title: '项目名称',
        dataIndex: 'projectName',
        width: 220,
        fixed: 'left',
        render: renderRecovSingleLineText,
      },
      {
        title: '计费层级',
        dataIndex: 'feeTier',
        width: 120,
        render: (_: unknown, record) => (
          <Tag color="processing">{getFeeTierName(record)}</Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 96,
        render: getStatusTag,
      },
      {
        title: '引用债务数',
        dataIndex: 'debtCount',
        width: 120,
        align: 'right',
        render: (value) => value ?? 0,
      },
      {
        title: '排序',
        dataIndex: 'sortOrder',
        width: 88,
        align: 'right',
        render: (value) => value ?? 0,
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        width: 180,
        render: (value: string) => value || '-',
      },
      {
        title: '操作',
        key: 'actions',
        width: 112,
        fixed: 'right',
        render: (_: unknown, record) => (
          <TableActions
            maxVisible={2}
            actions={[
              {
                key: 'edit',
                label: '编辑',
                icon: <EditOutlined />,
                onClick: () => openEditModal(record),
              },
              {
                key: 'delete',
                label: '删除',
                danger: !record.referenced,
                icon: <DeleteOutlined />,
                onClick: () => handleDelete(record),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const editingReferenced =
    modalState.mode === 'edit' && Boolean(modalState.record.referenced);

  return (
    <RecovListPage breadcrumbRender={false} title="项目维护">
      {messageContextHolder}
      {modalContextHolder}
      <RecovListStack>
        <RecovTableCard>
          <Form form={queryForm} layout="inline" onFinish={handleSearch}>
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <Space size={8} wrap>
                <Form.Item name="projectName">
                  <Input
                    allowClear
                    placeholder="项目名称"
                    style={RECOV_FILTER_CONTROL_STYLE}
                  />
                </Form.Item>
                <Form.Item name="feeTier">
                  <Select
                    allowClear
                    placeholder="计费层级"
                    options={FEE_TIER_OPTIONS}
                    style={RECOV_FILTER_CONTROL_STYLE}
                  />
                </Form.Item>
                <Form.Item name="status">
                  <Select
                    allowClear
                    placeholder="状态"
                    options={STATUS_OPTIONS}
                    style={RECOV_FILTER_CONTROL_STYLE}
                  />
                </Form.Item>
                <Form.Item>
                  <Space size={8}>
                    <Button type="primary" htmlType="submit">
                      查询
                    </Button>
                    <Button onClick={handleReset}>重置</Button>
                  </Space>
                </Form.Item>
              </Space>
              <Space size={8} wrap>
                <Button icon={<ReloadOutlined />} onClick={loadProjects}>
                  刷新
                </Button>
                <Button icon={<PlusOutlined />} onClick={openBatchModal}>
                  批量新增
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openAddModal}
                >
                  新增
                </Button>
              </Space>
            </div>
          </Form>
        </RecovTableCard>

        <RecovTableCard>
          <Table<RecovProjectItem>
            rowKey={(record) => String(record.id)}
            loading={loading}
            dataSource={rows}
            columns={columns}
            size="middle"
            scroll={{ x: 1050 }}
            pagination={{
              current: query.pageNum,
              pageSize: query.pageSize,
              total,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 条`,
            }}
            onChange={handleTableChange}
          />
        </RecovTableCard>
      </RecovListStack>

      <Modal
        title={modalState.mode === 'edit' ? '编辑项目' : '新增项目'}
        open={modalState.open}
        width={560}
        confirmLoading={saving}
        destroyOnHidden
        mask={{ closable: false }}
        okText="保存"
        cancelText="取消"
        onOk={saveProject}
        onCancel={closeProjectModal}
      >
        <Form
          form={projectForm}
          layout="vertical"
          requiredMark={false}
          style={{ marginTop: token.marginSM }}
        >
          <Form.Item
            label="项目名称"
            name="projectName"
            rules={[
              { required: true, whitespace: true, message: '请输入项目名称' },
              { max: 255, message: '项目名称不能超过255个字符' },
            ]}
          >
            <Input disabled={editingReferenced} />
          </Form.Item>
          <Form.Item
            label="计费层级"
            name="feeTier"
            rules={[{ required: true, message: '请选择计费层级' }]}
          >
            <Select options={FEE_TIER_OPTIONS} />
          </Form.Item>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item label="状态" name="status">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item label="排序" name="sortOrder">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item
            label="备注"
            name="remark"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量新增项目"
        open={batchOpen}
        width={760}
        confirmLoading={batchSaving}
        destroyOnHidden
        mask={{ closable: false }}
        okText="保存"
        cancelText="取消"
        onOk={saveBatchProjects}
        onCancel={closeBatchModal}
      >
        <Form
          form={batchForm}
          layout="vertical"
          requiredMark={false}
          style={{ marginTop: token.marginSM }}
        >
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className="grid grid-cols-[minmax(0,1fr)_160px_96px_40px] items-start gap-2"
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, 'projectName']}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: '请输入项目名称',
                        },
                        { max: 255, message: '项目名称不能超过255个字符' },
                      ]}
                    >
                      <Input placeholder="项目名称" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'feeTier']}
                      rules={[{ required: true, message: '请选择计费层级' }]}
                    >
                      <Select options={FEE_TIER_OPTIONS} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'sortOrder']}>
                      <InputNumber
                        min={0}
                        precision={0}
                        placeholder="排序"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    <Button
                      aria-label="删除行"
                      icon={<DeleteOutlined />}
                      disabled={fields.length <= 1}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                ))}
                <Button
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      projectName: '',
                      feeTier: 'TIER_1',
                      status: 1,
                      sortOrder: 0,
                    })
                  }
                >
                  新增一行
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </RecovListPage>
  );
};

export default ProjectMaintenancePage;
