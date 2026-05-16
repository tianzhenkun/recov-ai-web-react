import { WarningFilled } from '@ant-design/icons';
import { Button, InputNumber, Modal } from 'antd';
import { useEffect, useState } from 'react';

export type FeeEditFormState = {
  configId: number;
  periodName: string;
  tierName: string;
  feeRate: number;
  overduePeriod: string;
  cityTier: string;
};

export type FeeEditModalProps = {
  open: boolean;
  loading: boolean;
  currentRangeLabel: string;
  initial: FeeEditFormState | null;
  onCancel: () => void;
  onSave: (feeRate: number) => void;
};

const FeeEditModal = ({
  open,
  loading,
  currentRangeLabel,
  initial,
  onCancel,
  onSave,
}: FeeEditModalProps) => {
  const [feeRate, setFeeRate] = useState(0);

  useEffect(() => {
    if (open && initial) {
      setFeeRate(initial.feeRate);
    }
  }, [open, initial]);

  const handleOk = () => {
    if (feeRate < 0 || feeRate > 100) return;
    onSave(feeRate);
  };

  if (!initial) {
    return (
      <Modal
        title="修改费率规则"
        open={open}
        width={480}
        destroyOnHidden
        mask={{ closable: false }}
        onCancel={onCancel}
        footer={null}
      />
    );
  }

  return (
    <Modal
      title="修改费率规则"
      open={open}
      width={480}
      destroyOnHidden
      mask={{ closable: false }}
      onCancel={onCancel}
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleOk}>
            保存规则
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-3 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">逾期账龄</span>
            <span className="font-medium text-gray-900">
              {initial.periodName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">对应城市层级</span>
            <span className="font-medium text-indigo-600">
              {initial.tierName}
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="fee-rate-input"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            服务费比例配置
          </label>
          <div>
            <div className="text-xs text-gray-500">{currentRangeLabel}</div>
            <div>
              <InputNumber
                id="fee-rate-input"
                className="!w-full"
                min={0}
                max={100}
                precision={1}
                step={0.5}
                value={feeRate}
                onChange={(value) =>
                  setFeeRate(typeof value === 'number' ? value : 0)
                }
              />
              <span className="text-lg font-medium text-gray-700">%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <WarningFilled className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            修改费率规则将影响后续产生的服务费结算，历史已生成的账单将保持不变。
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default FeeEditModal;
