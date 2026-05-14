import { Button, Form, InputNumber, Spin } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useMemo } from 'react';
import type { LitigationConfigVo } from '@/services/ruoyi/litigation';
import type { PersonaSimple } from '@/services/ruoyi/persona';
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
      <div className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-4 w-1.5 rounded-full bg-indigo-500" />
            <h4 className="text-sm font-extrabold text-gray-800">
              立案和起诉配置
            </h4>
          </div>

          <Form layout="vertical">
            <Form.Item
              label="同时起诉法院数量"
              extra={<span className="text-[11px] text-gray-400">个/法院</span>}
            >
              <InputNumber
                style={{ width: '100%' }}
                size="large"
                min={0}
                value={form.litigationThreshold}
                onChange={handleThresholdChange}
              />
            </Form.Item>

            <Form.Item
              label="单法院申请立案数限制"
              extra={
                <span className="text-[11px] text-gray-400">
                  个/案件 / 每天
                </span>
              }
            >
              <InputNumber
                style={{ width: '100%' }}
                size="large"
                min={0}
                value={form.litigationFrequency}
                onChange={handleFrequencyChange}
              />
            </Form.Item>
          </Form>
        </div>

        <div className="flex flex-col gap-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-4 w-1.5 rounded-full bg-indigo-500" />
            <h4 className="text-sm font-extrabold text-gray-800">
              起诉条件配置
            </h4>
          </div>

          <RuleTreeEditor
            value={form.litigationRuleJson || ''}
            onChange={handleRuleJsonChange}
            personaOptions={personaOptions}
            customerGroupOptions={customerGroupOptions}
            messageApi={messageApi}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        {dirty ? (
          <Button
            type="primary"
            size="large"
            className="!rounded-xl !px-8 shadow-md shadow-indigo-200/50"
            loading={saving}
            onClick={onSave}
          >
            保存配置
          </Button>
        ) : null}
      </div>
    </Spin>
  );
};

export default LitigationConfigPanel;
