import { Button, Descriptions } from 'antd';
import React from 'react';

type TaskConfirmationProps = {
  taskName: string;
  targetCount: number;
  phoneNumber?: string;
  customerName?: string;
  promptName: string;
  sceneCode: string;
  voiceName: string;
  ruleName: string;
  ruleSummary: string;
  executionTime: string;
  creating: boolean;
  onConfirm: () => void;
};

const TaskConfirmation = ({
  taskName,
  targetCount,
  phoneNumber,
  customerName,
  promptName,
  sceneCode,
  voiceName,
  ruleName,
  ruleSummary,
  executionTime,
  creating,
  onConfirm,
}: TaskConfirmationProps) => (
  <div>
    <h3 className="mt-0 text-base font-semibold">人工确认摘要</h3>
    <Descriptions
      bordered
      column={{ xs: 1, sm: 2 }}
      items={[
        { key: 'taskName', label: '任务名称', children: taskName },
        {
          key: 'targetCount',
          label: '外呼对象',
          children: `${targetCount} 个`,
        },
        ...(phoneNumber
          ? [{ key: 'phoneNumber', label: '手机号', children: phoneNumber }]
          : []),
        {
          key: 'customerName',
          label: '客户名称',
          children: customerName || '—',
        },
        {
          key: 'prompt',
          label: '提示词',
          children: `${promptName} / ${sceneCode}`,
        },
        { key: 'voice', label: '音色', children: voiceName },
        {
          key: 'rule',
          label: '呼叫规则',
          children: `${ruleName}：${ruleSummary}`,
        },
        { key: 'executionTime', label: '执行计划', children: executionTime },
      ]}
    />
    <div className="mt-4 flex justify-end">
      <Button
        disabled={creating}
        loading={creating}
        type="primary"
        onClick={onConfirm}
      >
        确认启动
      </Button>
    </div>
  </div>
);

export default TaskConfirmation;
