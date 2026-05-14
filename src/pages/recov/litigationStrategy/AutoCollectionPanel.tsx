import { Button, Form, InputNumber, Spin } from 'antd';
import { useEffect, useMemo } from 'react';
import type { AutoCollectionConfigVo } from '@/services/ruoyi/litigation';
import {
  type AutoCollectionConfigSnapshot,
  getAutoCollectionSnapshot,
  isAutoCollectionDirty,
} from './_shared';

export type AutoCollectionPanelProps = {
  form: AutoCollectionConfigVo;
  onFormChange: (next: AutoCollectionConfigVo) => void;
  savedSnapshot: AutoCollectionConfigSnapshot | null;
  loading: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
};

const AutoCollectionPanel = ({
  form,
  onFormChange,
  savedSnapshot,
  loading,
  saving,
  onSave,
}: AutoCollectionPanelProps) => {
  const [antdForm] = Form.useForm<AutoCollectionConfigVo>();

  useEffect(() => {
    antdForm.setFieldsValue(form);
  }, [antdForm, form]);

  const dirty = useMemo(
    () => isAutoCollectionDirty(savedSnapshot, getAutoCollectionSnapshot(form)),
    [savedSnapshot, form],
  );

  const handleValuesChange = (
    _: Partial<AutoCollectionConfigVo>,
    all: AutoCollectionConfigVo,
  ) => {
    onFormChange({
      collectionAmountLimit:
        typeof all.collectionAmountLimit === 'number'
          ? all.collectionAmountLimit
          : 0,
      returnPrincipalRate:
        typeof all.returnPrincipalRate === 'number'
          ? all.returnPrincipalRate
          : 0,
      recallDays: typeof all.recallDays === 'number' ? all.recallDays : 0,
    });
  };

  const handleSave = async () => {
    try {
      await antdForm.validateFields();
    } catch {
      return;
    }
    await onSave();
  };

  return (
    <Spin spinning={loading}>
      <div className="mb-6 flex items-center gap-2">
        <span className="h-4 w-1.5 rounded-full bg-emerald-500" />
        <h4 className="text-sm font-extrabold text-gray-800">自动撤诉策略</h4>
      </div>

      <Form
        form={antdForm}
        layout="vertical"
        initialValues={form}
        onValuesChange={handleValuesChange}
        className="max-w-2xl"
      >
        <Form.Item
          name="collectionAmountLimit"
          label={
            <>
              催收金额 <span className="ml-1 text-gray-500">≤</span>
            </>
          }
          rules={[{ required: true, message: '请输入催收金额上限' }]}
          extra={<span className="text-[11px] text-gray-400">元</span>}
        >
          <InputNumber
            style={{ width: '100%' }}
            size="large"
            min={0}
            precision={2}
          />
        </Form.Item>

        <Form.Item
          name="returnPrincipalRate"
          label={
            <>
              已归还本金 <span className="ml-1 text-gray-500">≥</span>
            </>
          }
          rules={[{ required: true, message: '请输入日回款本金比例' }]}
          extra={<span className="text-[11px] text-gray-400">%</span>}
        >
          <InputNumber
            style={{ width: '100%' }}
            size="large"
            min={0}
            max={100}
          />
        </Form.Item>

        <Form.Item
          name="recallDays"
          label={
            <>
              距开庭剩余天数 <span className="ml-1 text-gray-500">≤</span>
            </>
          }
          rules={[{ required: true, message: '请输入距打回账天数' }]}
          extra={
            <span className="text-[11px] text-gray-400">
              天，仍未达到则开庭提诉。
            </span>
          }
        >
          <InputNumber style={{ width: '100%' }} size="large" min={0} />
        </Form.Item>
      </Form>

      <div className="mt-8 flex justify-end">
        {dirty ? (
          <Button
            type="primary"
            size="large"
            className="!rounded-xl !px-8 shadow-md shadow-emerald-200/50"
            loading={saving}
            onClick={handleSave}
          >
            保存配置
          </Button>
        ) : null}
      </div>
    </Spin>
  );
};

export default AutoCollectionPanel;
