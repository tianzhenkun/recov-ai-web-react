import { Button, Form, InputNumber, Spin } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useMemo } from 'react';
import type { LitigationConfigVo } from '@/modules/recov/services/litigation';
import type { PersonaSimple } from '@/modules/recov/services/persona';
import {
  getLitigationSnapshot,
  isLitigationDirty,
  type LitigationConfigSnapshot,
} from './_shared';
import type { CustomerGroupOption } from './components/RuleConditionNode';
import RuleTreeEditor from './components/RuleTreeEditor';

export type LitigationConfigPanelProps = {
  form: LitigationConfigVo;
  onFormChange: (next: LitigationConfigVo) => void;
  savedSnapshot: LitigationConfigSnapshot | null;
  loading: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
  personaOptions: PersonaSimple[];
  customerGroupOptions: CustomerGroupOption[];
  messageApi: MessageInstance;
};

const LitigationConfigPanel = ({
  form,
  onFormChange,
  savedSnapshot,
  loading,
  saving,
  onSave,
  personaOptions,
  customerGroupOptions,
  messageApi,
}: LitigationConfigPanelProps) => {
  const dirty = useMemo(
    () => isLitigationDirty(savedSnapshot, getLitigationSnapshot(form)),
    [savedSnapshot, form],
  );

  const handleThresholdChange = (value: number | null) => {
    onFormChange({
      ...form,
      litigationThreshold: typeof value === 'number' ? value : 0,
    });
  };

  const handleFrequencyChange = (value: number | null) => {
    onFormChange({
      ...form,
      litigationFrequency: typeof value === 'number' ? value : 0,
    });
  };

  const handleRuleJsonChange = (json: string) => {
    onFormChange({ ...form, litigationRuleJson: json });
  };

  return (
    <Spin spinning={loading}>
      <div className="flex flex-col gap-6">
        <Form layout="vertical" className="max-w-4xl">
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <Form.Item label="同时起诉法院数量">
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                suffix="个法院"
                value={form.litigationThreshold}
                onChange={handleThresholdChange}
              />
            </Form.Item>

            <Form.Item label="单法院申请立案数限制">
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                suffix="个案件 / 每天"
                value={form.litigationFrequency}
                onChange={handleFrequencyChange}
              />
            </Form.Item>
          </div>
        </Form>

        <div>
          <div className="mb-3 text-sm font-semibold text-slate-900">
            起诉条件配置
          </div>

          <RuleTreeEditor
            value={form.litigationRuleJson || ''}
            onChange={handleRuleJsonChange}
            personaOptions={personaOptions}
            customerGroupOptions={customerGroupOptions}
            messageApi={messageApi}
          />
        </div>

        {dirty ? (
          <div className="flex justify-end">
            <Button type="primary" loading={saving} onClick={onSave}>
              保存配置
            </Button>
          </div>
        ) : null}
      </div>
    </Spin>
  );
};

export default LitigationConfigPanel;
