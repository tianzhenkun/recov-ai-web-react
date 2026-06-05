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
  Typography,
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
  addLawyerCourtFeeConfig,
  deleteLawyerCourtFeeConfig,
  getLawyerCourtCityOptions,
  getLawyerCourtFeePage,
  type LawyerCourtCityOption,
  type LawyerCourtFeeConfigItem,
  type LawyerCourtFeePayload,
  type LawyerCourtFeeQuery,
  updateLawyerCourtFeeConfig,
} from '@/services/ruoyi/lawyer-court-fee';

type QueryValues = {
  cityCode?: string;
  debtAmount?: number;
};

type FeeFormValues = {
  cityCode: string;
  debtAmountMin: number;
  debtAmountMax?: number | null;
  courtFeeMin: number;
  courtFeeMax: number;
  remark?: string;
};

type ModalState =
  | { open: false; mode: 'add'; record?: undefined }
  | { open: true; mode: 'add'; record?: undefined }
  | { open: true; mode: 'edit'; record: LawyerCourtFeeConfigItem };

const formatMoney = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatRange = (min?: number | null, max?: number | null) => {
  if (min === null || min === undefined) return '-';
  if (max === null || max === undefined) return `${formatMoney(min)}及以上`;
  return `${formatMoney(min)} - ${formatMoney(max)}`;
};

const normalizePayload = (
  values: FeeFormValues,
  id?: string | number,
): LawyerCourtFeePayload => ({
  id,
  cityCode: values.cityCode,
  debtAmountMin: Number(values.debtAmountMin),
  debtAmountMax:
    values.debtAmountMax === null || values.debtAmountMax === undefined
      ? null
      : Number(values.debtAmountMax),
  courtFeeMin: Number(values.courtFeeMin),
  courtFeeMax: Number(values.courtFeeMax),
  remark: values.remark?.trim() || null,
});

const LawyerCourtFeePanel = () => {
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [queryForm] = Form.useForm<QueryValues>();
  const [feeForm] = Form.useForm<FeeFormValues>();

  const [loading, setLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<LawyerCourtFeeConfigItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cityOptions, setCityOptions] = useState<LawyerCourtCityOption[]>([]);
  const [query, setQuery] = useState<LawyerCourtFeeQuery>({
    pageNum: 1,
    pageSize: 10,
  });
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: 'add',
  });

  const citySelectOptions = useMemo(
    () =>
      cityOptions.map((item) => ({
        label: `${item.cityName}（${item.debtCount ?? 0}）`,
        value: item.cityCode,
      })),
    [cityOptions],
  );

  const loadCityOptions = useCallback(async () => {
    setCityLoading(true);
    try {
      const res = await getLawyerCourtCityOptions();
      setCityOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCityOptions([]);
      messageApi.error('获取城市列表失败');
    } finally {
      setCityLoading(false);
    }
  }, [messageApi]);

  const loadFeeConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLawyerCourtFeePage(query);
      setRows(res.rows ?? []);
      setTotal(res.total ?? 0);
    } catch {
      messageApi.error('获取代开庭策略失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi, query]);

  useEffect(() => {
    void loadCityOptions();
  }, [loadCityOptions]);

  useEffect(() => {
    void loadFeeConfigs();
  }, [loadFeeConfigs]);

  const openAddModal = () => {
    feeForm.setFieldsValue({
      cityCode: undefined,
      debtAmountMin: 0,
      debtAmountMax: undefined,
      courtFeeMin: 0,
      courtFeeMax: 0,
      remark: undefined,
    });
    setModalState({ open: true, mode: 'add' });
  };

  const openEditModal = (record: LawyerCourtFeeConfigItem) => {
    feeForm.setFieldsValue({
      cityCode: record.cityCode,
      debtAmountMin: Number(record.debtAmountMin ?? 0),
      debtAmountMax:
        record.debtAmountMax === null || record.debtAmountMax === undefined
          ? undefined
          : Number(record.debtAmountMax),
      courtFeeMin: Number(record.courtFeeMin ?? 0),
      courtFeeMax: Number(record.courtFeeMax ?? 0),
      remark: record.remark || undefined,
    });
    setModalState({ open: true, mode: 'edit', record });
  };

  const closeModal = () => {
    setModalState({ open: false, mode: 'add' });
    feeForm.resetFields();
  };

  const saveConfig = async () => {
    const values = await feeForm.validateFields();
    const record = modalState.mode === 'edit' ? modalState.record : undefined;
    const payload = normalizePayload(values, record?.id);
    setSaving(true);
    try {
      if (record) {
        await updateLawyerCourtFeeConfig(payload);
      } else {
        await addLawyerCourtFeeConfig(payload);
      }
      messageApi.success('保存成功');
      closeModal();
      await loadFeeConfigs();
      await loadCityOptions();
    } catch {
      messageApi.error('保存代开庭策略失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: LawyerCourtFeeConfigItem) => {
    modalApi.confirm({
      title: '删除代开庭策略',
      content: `确认删除“${record.cityName} / ${record.debtAmountRangeText || formatRange(record.debtAmountMin, record.debtAmountMax)}”这条配置吗？删除后该城市该金额范围将不再匹配代开庭费用。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteLawyerCourtFeeConfig(record.id);
          messageApi.success('删除成功');
          await loadFeeConfigs();
        } catch {
          messageApi.error('删除代开庭策略失败');
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

  const refresh = async () => {
    await Promise.all([loadFeeConfigs(), loadCityOptions()]);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setQuery((prev) => ({
      ...prev,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    }));
  };

  const columns: ColumnsType<LawyerCourtFeeConfigItem> = useMemo(
    () => [
      {
        title: '城市',
        dataIndex: 'cityName',
        width: 150,
        fixed: 'left',
        render: renderRecovSingleLineText,
      },
      {
        title: '债权金额范围(元)',
        dataIndex: 'debtAmountRangeText',
        minWidth: 190,
        render: (_: unknown, record) => (
          <Typography.Text strong>
            {record.debtAmountRangeText ||
              formatRange(record.debtAmountMin, record.debtAmountMax)}
          </Typography.Text>
        ),
      },
      {
        title: '代开庭费用范围(元)',
        dataIndex: 'courtFeeRangeText',
        minWidth: 190,
        render: (_: unknown, record) => (
          <Typography.Text style={{ color: token.colorPrimary }} strong>
            {record.courtFeeRangeText ||
              formatRange(record.courtFeeMin, record.courtFeeMax)}
          </Typography.Text>
        ),
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
                danger: true,
                icon: <DeleteOutlined />,
                onClick: () => handleDelete(record),
              },
            ]}
          />
        ),
      },
    ],
    [token.colorPrimary],
  );

  return (
    <div className="flex flex-col gap-4">
      {messageContextHolder}
      {modalContextHolder}

      <Form form={queryForm} layout="inline" onFinish={handleSearch}>
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Space size={8} wrap>
            <Form.Item name="cityCode">
              <Select
                allowClear
                loading={cityLoading}
                placeholder="城市"
                options={citySelectOptions}
                style={RECOV_FILTER_CONTROL_STYLE}
              />
            </Form.Item>
            <Form.Item name="debtAmount">
              <InputNumber
                min={0}
                precision={2}
                placeholder="债权金额"
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
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
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

      <Table<LawyerCourtFeeConfigItem>
        rowKey={(record) => String(record.id)}
        loading={loading}
        dataSource={rows}
        columns={columns}
        size="middle"
        scroll={{ x: 860 }}
        pagination={{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={modalState.mode === 'edit' ? '编辑代开庭策略' : '新增代开庭策略'}
        open={modalState.open}
        width={640}
        confirmLoading={saving}
        destroyOnHidden
        mask={{ closable: false }}
        okText="保存"
        cancelText="取消"
        onOk={saveConfig}
        onCancel={closeModal}
      >
        <Form
          form={feeForm}
          layout="vertical"
          requiredMark={false}
          style={{ marginTop: token.marginSM }}
        >
          <Form.Item
            label="城市"
            name="cityCode"
            rules={[{ required: true, message: '请选择城市' }]}
          >
            <Select
              showSearch
              loading={cityLoading}
              placeholder="请选择城市"
              optionFilterProp="label"
              options={citySelectOptions}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item
              label="债权最低金额"
              name="debtAmountMin"
              rules={[{ required: true, message: '请输入债权最低金额' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                addonAfter="元"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              label="债权最高金额"
              name="debtAmountMax"
              dependencies={['debtAmountMin']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (value === null || value === undefined || value === '') {
                      return Promise.resolve();
                    }
                    const min = Number(getFieldValue('debtAmountMin') ?? 0);
                    if (Number(value) < min) {
                      return Promise.reject(
                        new Error('最高金额不能小于最低金额'),
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber
                min={0}
                precision={2}
                addonAfter="元"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item
              label="代开庭最低费用"
              name="courtFeeMin"
              rules={[{ required: true, message: '请输入代开庭最低费用' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                addonAfter="元"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              label="代开庭最高费用"
              name="courtFeeMax"
              dependencies={['courtFeeMin']}
              rules={[
                { required: true, message: '请输入代开庭最高费用' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (value === null || value === undefined || value === '') {
                      return Promise.resolve();
                    }
                    const min = Number(getFieldValue('courtFeeMin') ?? 0);
                    if (Number(value) < min) {
                      return Promise.reject(
                        new Error('最高费用不能小于最低费用'),
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber
                min={0}
                precision={2}
                addonAfter="元"
                style={{ width: '100%' }}
              />
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
    </div>
  );
};

export default LawyerCourtFeePanel;
