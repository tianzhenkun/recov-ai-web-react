import { PageContainer } from '@ant-design/pro-components';
import { Card, message } from 'antd';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type {
  FollowUpCallbackCredentialDto,
  FollowUpTaskDto,
} from '@/services/ruoyi/agent-console';
import CurrentCallPanel from '../../components/CurrentCallPanel';
import FollowUpPanel from '../../components/FollowUpPanel';
import { useAgentPresence } from '../../hooks/useAgentPresence';
import { useFollowUpCallback } from '../../hooks/useFollowUpCallback';

const FollowUpProcessingPage = () => {
  const agent = useAgentPresence();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [callback, setCallback] = useState<FollowUpCallbackCredentialDto>();
  const [callbackTask, setCallbackTask] = useState<FollowUpTaskDto>();
  const [attemptTaskToOpen, setAttemptTaskToOpen] = useState<FollowUpTaskDto>();
  const callbackCall = useFollowUpCallback({
    credential: callback,
    followUpId: callbackTask?.id,
    consoleSessionId: agent.consoleSessionId,
    refresh: agent.bootstrap,
  });
  const prepareCallback = useCallback(async () => {
    return agent.goOnline();
  }, [agent.goOnline]);
  const endCallbackCall = useCallback(async () => {
    const task = callbackTask;
    if (!(await callbackCall.endCall()) || !task) return;
    setCallback(undefined);
    setCallbackTask(undefined);
    setAttemptTaskToOpen(task);
    messageApi.success('通话已结束，请登记联系结果');
  }, [callbackCall.endCall, callbackTask, messageApi]);
  const clearAttemptTask = useCallback(
    () => setAttemptTaskToOpen(undefined),
    [],
  );

  useEffect(() => {
    if (agent.errorMessage) messageApi.error(agent.errorMessage);
  }, [agent.errorMessage, messageApi]);

  return (
    <PageContainer className="agent-admin-page" title="跟进处理">
      {messageContextHolder}
      {callback ? (
        <Card className="agent-follow-up-current-call" size="small">
          <CurrentCallPanel
            {...callbackCall}
            endConfirmDescription="结束后客户将退出本次回拨，并自动进入联系结果登记。"
            onToggleMicrophone={callbackCall.toggleMicrophone}
            onSwitchAudioInput={callbackCall.switchAudioInput}
            onEndCall={endCallbackCall}
          />
        </Card>
      ) : null}
      <FollowUpPanel
        agentStatus={agent.status}
        callbackEnabled
        consoleSessionId={agent.consoleSessionId}
        attemptTaskToOpen={attemptTaskToOpen}
        onAttemptTaskOpened={clearAttemptTask}
        onPrepareCallback={prepareCallback}
        onCallAccepted={(nextCallback, task: FollowUpTaskDto) => {
          setCallbackTask(task);
          setCallback(nextCallback);
        }}
      />
    </PageContainer>
  );
};

export default FollowUpProcessingPage;
