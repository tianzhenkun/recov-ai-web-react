import { PhoneOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Radio,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import type {
  AiCallTask,
  AiCallTaskTarget,
  AiCallTaskTestCapability,
  LinphoneTestScenario,
} from '../domain';
import { getAiCallTaskTestCapability, listAiCallTaskTargets } from '../service';

const { Text } = Typography;

type LinphoneTaskTestProps = {
  task: AiCallTask;
  onTaskChanged: () => Promise<void> | void;
};

const maskPhone = (value: string) =>
  value.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '外呼对象加载失败';

const LinphoneTaskTest = ({ task }: LinphoneTaskTestProps) => {
  const [capability, setCapability] = useState<AiCallTaskTestCapability | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [scenario, setScenario] = useState<LinphoneTestScenario>('ai_only');
  const [target, setTarget] = useState<AiCallTaskTarget>();
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetError, setTargetError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setCapability(null);
    void getAiCallTaskTestCapability(task.taskId)
      .then((result) => {
        if (!cancelled) setCapability(result);
      })
      .catch(() => {
        if (!cancelled) setCapability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [task.taskId]);

  const loadTarget = async () => {
    if (target || targetLoading) return;
    setTargetLoading(true);
    setTargetError(undefined);
    try {
      const response = await listAiCallTaskTargets(task.taskId, {
        pageNum: 1,
        pageSize: 1,
      });
      setTarget(response.rows[0]);
    } catch (error) {
      setTargetError(getErrorMessage(error));
    } finally {
      setTargetLoading(false);
    }
  };

  const openModal = () => {
    setScenario('ai_only');
    setModalOpen(true);
    void loadTarget();
  };

  if (!capability?.enabled) return null;

  return (
    <>
      <Tooltip
        title={capability.eligible ? undefined : capability.reasons.join('；')}
      >
        <span>
          <Button
            disabled={!capability.eligible}
            icon={<PhoneOutlined aria-hidden />}
            onClick={openModal}
          >
            测试拨打
          </Button>
        </span>
      </Tooltip>

      <Modal
        cancelText="取消"
        okButtonProps={{ disabled: true }}
        okText="确认拨打"
        open={modalOpen}
        title="确认测试拨打"
        width={680}
        onCancel={() => setModalOpen(false)}
      >
        <Spin spinning={targetLoading}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {targetError ? (
              <Alert showIcon title={targetError} type="error" />
            ) : null}
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              items={[
                {
                  key: 'customerName',
                  label: '客户名称',
                  children: target?.customerName || '—',
                },
                {
                  key: 'phoneNumber',
                  label: '手机号',
                  children: target?.phoneNumber
                    ? maskPhone(target.phoneNumber)
                    : '—',
                },
                {
                  key: 'prompt',
                  label: '提示词',
                  children: `${task.promptName} / ${task.sceneCode}`,
                },
                {
                  key: 'voice',
                  label: '音色',
                  children: task.voiceName
                    ? `${task.voiceName} / ${task.voice}`
                    : task.voice,
                },
                {
                  key: 'rule',
                  label: '呼叫规则',
                  children: task.ruleName,
                },
                {
                  key: 'ruleSummary',
                  label: '规则摘要',
                  children: task.ruleSummary,
                },
              ]}
            />

            <Radio.Group
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
            >
              <Space orientation="vertical">
                <Radio value="ai_only">AI 完整通话</Radio>
                <Radio
                  disabled={capability.availableAgentCount === 0}
                  value="handoff"
                >
                  AI 转人工通话
                </Radio>
              </Space>
            </Radio.Group>

            {capability.availableAgentCount === 0 ? (
              <Text type="warning">暂无可用坐席，请先到坐席工作台上线</Text>
            ) : null}

            {scenario === 'handoff' ? (
              <ol className="m-0 pl-5">
                <li>保持坐席工作台在线</li>
                <li>在坐席工作台接单</li>
              </ol>
            ) : null}
          </Space>
        </Spin>
      </Modal>
    </>
  );
};

export default LinphoneTaskTest;
