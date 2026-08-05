import { PageContainer } from '@ant-design/pro-components';
import { Card } from 'antd';
import * as React from 'react';
import { useState } from 'react';
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
  const [callback, setCallback] = useState<FollowUpCallbackCredentialDto>();
  const [callbackFollowUpId, setCallbackFollowUpId] = useState<string>();
  const callbackCall = useFollowUpCallback({
    credential: callback,
    followUpId: callbackFollowUpId,
    consoleSessionId: agent.consoleSessionId,
    refresh: agent.bootstrap,
  });

  return (
    <PageContainer className="agent-admin-page" title="跟进处理">
      {callback ? (
        <Card title="当前回拨通话" variant="borderless">
          <CurrentCallPanel
            {...callbackCall}
            endConfirmDescription="结束后客户将退出本次回拨，当前跟进任务保持处理中，可继续登记联系结果。"
            onToggleMicrophone={callbackCall.toggleMicrophone}
            onSwitchAudioInput={callbackCall.switchAudioInput}
            onEndCall={callbackCall.endCall}
          />
        </Card>
      ) : null}
      <FollowUpPanel
        agentStatus={agent.status}
        callbackEnabled
        consoleSessionId={agent.consoleSessionId}
        onCallAccepted={(nextCallback, task: FollowUpTaskDto) => {
          setCallbackFollowUpId(task.id);
          setCallback(nextCallback);
        }}
      />
    </PageContainer>
  );
};

export default FollowUpProcessingPage;
