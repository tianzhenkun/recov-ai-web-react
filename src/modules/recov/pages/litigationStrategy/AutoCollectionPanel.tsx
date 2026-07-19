import { Button, Form, InputNumber, Spin } from 'antd';
import { useEffect, useMemo } from 'react';
import type { AutoCollectionConfigVo } from '@/modules/recov/services/litigation';
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
      <Form
        form={antdForm}
        layout="vertical"
        initialValues={form}
        onValuesChange={handleValuesChange}
        className="max-w-4xl"
      >
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
          <Form.Item
            name="collectionAmountLimit"
            label="单笔金额≤"
            rules={[{ required: true, message: '请输入单笔金额上限' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              suffix="元"
            />
          </Form.Item>

          <Form.Item
            name="returnPrincipalRate"
            label="已归还本金 ≥"
            rules={[{ required: true, message: '请输入日回款本金比例' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              suffix="%"
            />
          </Form.Item>

          <Form.Item
            name="recallDays"
            label="距开庭剩余天数仍未匹配到开庭律师"
            rules={[{ required: true, message: '请输入距开庭剩余天数' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} suffix="天" />
          </Form.Item>
        </div>
      </Form>

      {dirty ? (
        <div className="mt-2 flex justify-end">
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存配置
          </Button>
        </div>
      ) : null}
    </Spin>
  );
};

export default AutoCollectionPanel;
