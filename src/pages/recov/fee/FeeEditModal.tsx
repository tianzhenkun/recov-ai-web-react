import { Alert, Button, InputNumber, Modal, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';

export type FeeEditFormState = {
  configId: number;
  periodName: string;
  feeTierName: string;
  feeRate: number;
  overduePeriod: string;
  feeTier: string;
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
  const { token } = theme.useToken();
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
        width={520}
        destroyOnHidden
        mask={{ closable: false }}
        onCancel={onCancel}
        footer={null}
      />
    );
  }

  const summaryItems = [
    { label: '逾期账龄', value: initial.periodName },
    { label: '计费层级', value: initial.feeTierName },
  ];

  return (
    <Modal
      title="修改费率规则"
      open={open}
      width={520}
      destroyOnHidden
      mask={{ closable: false }}
      onCancel={onCancel}
      styles={{
        body: { paddingTop: token.paddingSM },
        footer: { marginTop: token.marginLG },
      }}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: token.marginXS,
          }}
        >
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleOk}>
            保存规则
          </Button>
        </div>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: token.marginLG,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: token.marginSM,
            padding: token.padding,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
            background: token.colorFillAlter,
          }}
        >
          {summaryItems.map((item) => (
            <div
              key={item.label}
              style={{
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: token.marginXXS,
              }}
            >
              <Typography.Text type="secondary">{item.label}</Typography.Text>
              <Typography.Text
                strong
                style={{ color: token.colorText, wordBreak: 'break-word' }}
              >
                {item.value}
              </Typography.Text>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: token.marginXS,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: token.marginSM,
            }}
          >
            <label htmlFor="fee-rate-input">
              <Typography.Text strong>服务费比例配置</Typography.Text>
            </label>
            <Typography.Text
              style={{
                flexShrink: 0,
                padding: `2px ${token.paddingXS}px`,
                border: `1px solid ${token.colorPrimaryBorder}`,
                borderRadius: token.borderRadiusSM,
                color: token.colorPrimaryText,
                background: token.colorPrimaryBg,
                fontSize: token.fontSizeSM,
              }}
            >
              {currentRangeLabel}
            </Typography.Text>
          </div>

          <InputNumber
            id="fee-rate-input"
            style={{ width: '100%' }}
            min={0}
            max={100}
            precision={1}
            step={0.5}
            size="large"
            addonAfter="%"
            value={feeRate}
            onChange={(value) =>
              setFeeRate(typeof value === 'number' ? value : 0)
            }
          />
        </div>

        <Alert
          showIcon
          type="warning"
          message="修改费率规则将影响后续产生的服务费结算，历史已生成的账单将保持不变。"
        />
      </div>
    </Modal>
  );
};

export default FeeEditModal;
