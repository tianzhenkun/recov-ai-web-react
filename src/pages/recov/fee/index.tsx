import { ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Modal, message, Spin, Switch, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AmountRangeType,
  batchUpdateFeeRates,
  type FeeMatrixResponse,
  type FeeRateConfig,
  type FeeRateUpdate,
  getFeeMatrix,
} from '@/services/ruoyi/fee';
import {
  AMOUNT_RANGES,
  type FeeTableRow,
  flattenFeeMatrix,
  getCurrentRangeLabel,
  getFeeRate,
  getRowKey,
  PAGE_SUB_TITLE,
  PAGE_TITLE,
} from './_shared';
import FeeEditModal, { type FeeEditFormState } from './FeeEditModal';

const FeeConfigPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [matrixData, setMatrixData] = useState<FeeMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<FeeEditFormState | null>(null);

  const currentAmountRangeType = useMemo(
    () => (matrixData?.currentAmountRangeType as AmountRangeType) || 'LT_30M',
    [matrixData],
  );

  const tableData = useMemo(
    () => flattenFeeMatrix(matrixData?.matrix ?? []),
    [matrixData],
  );

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFeeMatrix();
      setMatrixData(res.data ?? null);
    } catch {
      messageApi.error('获取费率矩阵失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void fetchMatrix();
  }, [fetchMatrix]);

  const handleRangeSwitch = (range: {
    type: AmountRangeType;
    label: string;
  }) => {
    if (currentAmountRangeType === range.type) return;

    modalApi.confirm({
      title: '切换确认',
      content: `确定要将当前金额区间切换为「${range.label}」吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          await batchUpdateFeeRates({ amountRangeType: range.type });
          messageApi.success(`已切换至「${range.label}」`);
          await fetchMatrix();
        } catch {
          messageApi.error('切换金额区间失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const openEditDialog = (row: FeeTableRow) => {
    const rateConfig = row.rates[currentAmountRangeType] as
      | FeeRateConfig
      | undefined;

    setEditForm({
      configId: rateConfig?.configId ?? 0,
      periodName: row.periodName,
      tierName: row.tierName,
      feeRate: rateConfig?.feeRate ?? 0,
      overduePeriod: row.overduePeriod,
      cityTier: row.cityTier,
    });
    setEditOpen(true);
  };

  const handleSaveRule = async (feeRate: number) => {
    if (!editForm) return;
    if (feeRate < 0 || feeRate > 100) {
      messageApi.warning('费率值应在 0-100% 之间');
      return;
    }

    setSaveLoading(true);
    try {
      const update: FeeRateUpdate = {
        configId: editForm.configId,
        feeRate,
      };

      if (editForm.configId === 0) {
        update.overduePeriod = editForm.overduePeriod;
        update.cityTier = editForm.cityTier;
        update.amountRangeType = currentAmountRangeType;
      }

      await batchUpdateFeeRates({ updates: [update] });
      messageApi.success('保存成功');
      setEditOpen(false);
      setEditForm(null);
      await fetchMatrix();
    } catch {
      messageApi.error('保存费率规则失败');
    } finally {
      setSaveLoading(false);
    }
  };

  const columns: ColumnsType<FeeTableRow> = useMemo(() => {
    const rangeColumns = AMOUNT_RANGES.map((range) => ({
      title: range.label,
      key: range.type,
      width: 140,
      align: 'center' as const,
      render: (_: unknown, row: FeeTableRow) => (
        <span
          className={
            currentAmountRangeType === range.type
              ? 'text-lg font-semibold text-indigo-600'
              : 'text-lg font-semibold text-gray-300'
          }
        >
          {getFeeRate(row, range.type)}%
        </span>
      ),
    }));

    return [
      {
        title: '对应城市层级',
        dataIndex: 'tierName',
        width: 120,
        fixed: 'left',
        align: 'center',
        render: (tierName: string) => (
          <span className="inline-flex items-center justify-center gap-2 font-medium">
            <TeamOutlined className="text-indigo-500" />
            {tierName}
          </span>
        ),
      },
      {
        title: '逾期账龄',
        dataIndex: 'periodName',
        minWidth: 150,
        align: 'center',
        render: (periodName: string) => (
          <span className="inline-flex items-center gap-2">
            <ClockCircleOutlined className="text-gray-400" />
            {periodName}
          </span>
        ),
      },
      ...rangeColumns,
      {
        title: '操作',
        key: 'action',
        width: 100,
        fixed: 'right',
        align: 'center',
        render: (_: unknown, row: FeeTableRow) => (
          <Button type="link" onClick={() => openEditDialog(row)}>
            修改规则
          </Button>
        ),
      },
    ];
  }, [currentAmountRangeType]);

  return (
    <PageContainer
      breadcrumbRender={false}
      title={PAGE_TITLE}
      subTitle={PAGE_SUB_TITLE}
    >
      {messageContextHolder}
      {modalContextHolder}

      <ProCard className="!rounded-2xl">
        <Spin spinning={loading}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700">逾期账龄</span>
            <div className="flex flex-wrap items-center gap-8">
              {AMOUNT_RANGES.map((range) => (
                <div
                  key={range.type}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Switch
                    checked={currentAmountRangeType === range.type}
                    onChange={(checked) => {
                      if (checked) handleRangeSwitch(range);
                    }}
                    aria-label={range.label}
                  />
                  <span
                    className={
                      currentAmountRangeType === range.type
                        ? 'text-sm font-medium text-indigo-600'
                        : 'text-sm text-gray-400'
                    }
                  >
                    {range.label}
                  </span>
                </div>
              ))}
              <span className="w-12 text-sm text-gray-500">操作</span>
            </div>
          </div>

          <Table<FeeTableRow>
            rowKey={getRowKey}
            bordered
            pagination={false}
            scroll={{ x: 900 }}
            dataSource={tableData}
            columns={columns}
          />
        </Spin>
      </ProCard>

      <FeeEditModal
        open={editOpen}
        loading={saveLoading}
        currentRangeLabel={getCurrentRangeLabel(currentAmountRangeType)}
        initial={editForm}
        onCancel={() => {
          setEditOpen(false);
          setEditForm(null);
        }}
        onSave={handleSaveRule}
      />
    </PageContainer>
  );
};

export default FeeConfigPage;
