import { EditOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Modal, message, Segmented, Table, Typography, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import { RecovPage } from '@/pages/recov/components/RecovListLayout';
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
  formatFeeRate,
  formatFeeTierDisplay,
  formatOverduePeriodDisplay,
  getCurrentRangeLabel,
  getFeeRate,
  getRowKey,
  PAGE_TITLE,
} from './_shared';
import FeeEditModal, { type FeeEditFormState } from './FeeEditModal';

const FeeConfigPage = () => {
  const { token } = theme.useToken();
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

  const amountRangeOptions = useMemo(
    () =>
      AMOUNT_RANGES.map((range) => ({
        label: (
          <span
            className="inline-flex min-w-[84px] justify-center px-2"
            style={{
              color:
                currentAmountRangeType === range.type
                  ? token.colorPrimary
                  : undefined,
              fontSize: token.fontSize,
              fontWeight: currentAmountRangeType === range.type ? 600 : 400,
            }}
          >
            {range.switchLabel}
          </span>
        ),
        tooltip: range.label,
        value: range.type,
      })),
    [currentAmountRangeType, token.colorPrimary, token.fontSize],
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
      periodName: formatOverduePeriodDisplay(row.periodName),
      feeTierName: formatFeeTierDisplay(row.feeTier, row.feeTierName),
      feeRate: rateConfig?.feeRate ?? 0,
      overduePeriod: row.overduePeriod,
      feeTier: row.feeTier,
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
        update.feeTier = editForm.feeTier;
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
      align: 'right' as const,
      render: (_: unknown, row: FeeTableRow) => (
        <Typography.Text
          strong={currentAmountRangeType === range.type}
          style={
            currentAmountRangeType === range.type
              ? { color: token.colorPrimary }
              : undefined
          }
          type={currentAmountRangeType === range.type ? undefined : 'secondary'}
        >
          {formatFeeRate(getFeeRate(row, range.type))}
        </Typography.Text>
      ),
    }));

    return [
      {
        title: '城市层级',
        dataIndex: 'feeTierName',
        width: 150,
        fixed: 'left',
        render: (_: string, row: FeeTableRow) => (
          <Typography.Text>
            {formatFeeTierDisplay(row.feeTier, row.feeTierName)}
          </Typography.Text>
        ),
      },
      {
        title: '逾期账龄',
        dataIndex: 'periodName',
        minWidth: 180,
        render: (periodName: string) => (
          <Typography.Text>
            {formatOverduePeriodDisplay(periodName)}
          </Typography.Text>
        ),
      },
      ...rangeColumns,
      {
        title: '操作',
        key: 'action',
        width: 88,
        fixed: 'right',
        align: 'left',
        render: (_: unknown, row: FeeTableRow) => (
          <TableActions
            maxVisible={1}
            actions={[
              {
                key: 'edit',
                label: '修改规则',
                icon: <EditOutlined />,
                onClick: () => openEditDialog(row),
              },
            ]}
          />
        ),
      },
    ];
  }, [currentAmountRangeType, token.colorPrimary]);

  return (
    <RecovPage breadcrumbRender={false} title={PAGE_TITLE}>
      {messageContextHolder}
      {modalContextHolder}

      <ProCard title="服务费费率矩阵">
        <div
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-solid px-3 py-2"
          style={{
            backgroundColor: token.colorFillAlter,
            borderColor: token.colorBorderSecondary,
          }}
        >
          <Typography.Text strong style={{ fontSize: token.fontSize }}>
            金额区间
          </Typography.Text>
          <div className="max-w-full overflow-x-auto">
            <Segmented
              shape="round"
              size="medium"
              value={currentAmountRangeType}
              options={amountRangeOptions}
              onChange={(value) => {
                const next = AMOUNT_RANGES.find(
                  (range) => range.type === value,
                );
                if (next) handleRangeSwitch(next);
              }}
            />
          </div>
        </div>
        <Table<FeeTableRow>
          rowKey={getRowKey}
          loading={loading}
          pagination={false}
          scroll={{ x: 900 }}
          size="middle"
          dataSource={tableData}
          columns={columns}
        />
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
    </RecovPage>
  );
};

export default FeeConfigPage;
