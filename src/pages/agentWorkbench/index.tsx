import {
  AudioOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  LaptopOutlined,
  PauseCircleOutlined,
  PoweroffOutlined,
  SoundOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Empty, Flex, Tag, Typography } from 'antd';
import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  getPendingHandoffs,
  type HandoffDto,
  type MediaCredentialDto,
  type PageResult,
} from '@/services/ruoyi/agent-console';
import CurrentCallPanel from './components/CurrentCallPanel';
import HandoffContextPanel from './components/HandoffContextPanel';
import QuickWrapUp from './components/QuickWrapUp';
import WaitingPool from './components/WaitingPool';
import { useAgentCall } from './hooks/useAgentCall';
import { useAgentEvents } from './hooks/useAgentEvents';
import type { DeviceCheckState } from './hooks/useAgentPresence';
import { useAgentPresence } from './hooks/useAgentPresence';
import './index.css';

const { Text, Title } = Typography;

const statusMeta = {
  offline: { text: '离线', color: 'default' },
  available: { text: '空闲', color: 'success' },
  claiming: { text: '认领中', color: 'processing' },
  in_call: { text: '通话中', color: 'blue' },
  reconnecting: { text: '重连中', color: 'warning' },
  wrap_up_quick: { text: '话后处理中', color: 'purple' },
  paused: { text: '暂停', color: 'orange' },
} as const;

const sceneLabels: Record<string, string> = {
  intro_contract: '合同审核',
  intro_document: '跨境文书',
  intro_overseas: '海外获客',
  intro_geo: 'GEO',
};

const checkMeta: Record<DeviceCheckState, { text: string; color: string }> = {
  idle: { text: '待检测', color: 'default' },
  checking: { text: '检测中', color: 'processing' },
  passed: { text: '正常', color: 'success' },
  failed: { text: '异常', color: 'error' },
};

const DeviceCheck = ({
  icon,
  label,
  state,
}: {
  icon: ReactNode;
  label: string;
  state: DeviceCheckState;
}) => {
  const meta = checkMeta[state];
  return (
    <div className="agent-workbench-device-check">
      <span className="agent-workbench-device-icon">{icon}</span>
      <span>{label}</span>
      <Tag color={meta.color}>{meta.text}</Tag>
    </div>
  );
};

const AgentWorkbenchPage = () => {
  const agent = useAgentPresence();
  const [handoffs, setHandoffs] = useState<HandoffDto[]>([]);
  const [handoffsLoading, setHandoffsLoading] = useState(false);
  const [claimedCredential, setClaimedCredential] =
    useState<MediaCredentialDto>();
  const [wrapUpReason, setWrapUpReason] = useState('');
  const handleWrapUp = useCallback(
    (_handoff: HandoffDto, reason?: string) => setWrapUpReason(reason || ''),
    [],
  );

  const loadHandoffs = useCallback(async () => {
    if (!agent.profile || !agent.consoleSessionId) {
      setHandoffs([]);
      return;
    }
    if (agent.status !== 'available' || claimedCredential) return;
    setHandoffsLoading(true);
    try {
      const response = await getPendingHandoffs({
        consoleSessionId: agent.consoleSessionId,
        limit: 100,
      });
      const envelope = response as unknown as {
        data?: PageResult<HandoffDto>;
        rows?: HandoffDto[];
      };
      const page = envelope.data;
      setHandoffs(
        page?.rows || (Array.isArray(envelope.rows) ? envelope.rows : []) || [],
      );
    } catch {
      setHandoffs([]);
    } finally {
      setHandoffsLoading(false);
    }
  }, [agent.consoleSessionId, agent.profile, agent.status, claimedCredential]);

  const agentEvents = useAgentEvents({
    agentStatus: agent.status,
    refresh: loadHandoffs,
  });
  const agentCall = useAgentCall({
    credential: claimedCredential,
    consoleSessionId: agent.consoleSessionId,
    refresh: loadHandoffs,
    onWrapUp: handleWrapUp,
  });
  const currentHandoff = claimedCredential?.handoff;
  const nextHandoff = handoffs[0];
  const contextHandoff = currentHandoff ?? nextHandoff;

  useEffect(() => {
    if (agent.phase === 'ready' && agent.profile) void loadHandoffs();
  }, [agent.phase, agent.profile, loadHandoffs]);

  const busy = ['loading', 'checking', 'updating'].includes(agent.phase);
  const status = agent.status || 'offline';
  const meta = statusMeta[status as keyof typeof statusMeta];
  const isAvailable = status === 'available';
  const idleDescription = isAvailable
    ? '正在等待系统分配转人工请求'
    : status === 'paused'
      ? '恢复接听后等待转人工请求'
      : '上线后开始接听转人工请求';
  const canGoOnline = ['offline', 'paused'].includes(status);
  const canGoOffline = ['available', 'paused'].includes(status);
  const blockDescription =
    agent.blockReason === 'disabled'
      ? '当前坐席档案已停用，请联系管理员启用并确认可接业务场景。'
      : '当前账号尚未开通坐席功能，请联系管理员创建坐席档案并配置业务场景。';

  return (
    <PageContainer className="agent-workbench-page" pageHeaderRender={false}>
      <div className="agent-workbench-heading">
        <div>
          <Title level={3}>坐席工作台</Title>
          <Text type="secondary">实时接听与 AI 转人工交接</Text>
        </div>
        <Flex gap="small" align="center" wrap>
          <Tag color={meta?.color} icon={<CheckCircleOutlined />}>
            {meta?.text || '状态加载中'}
          </Tag>
          {canGoOnline ? (
            <Button
              type="primary"
              aria-label="上线接听"
              icon={<PoweroffOutlined />}
              loading={agent.phase === 'checking'}
              disabled={busy || agent.phase === 'blocked'}
              onClick={() => void agent.goOnline()}
            >
              上线接听
            </Button>
          ) : null}
          {isAvailable ? (
            <Button
              aria-label="暂停接听"
              icon={<PauseCircleOutlined />}
              loading={agent.phase === 'updating'}
              onClick={() => void agent.pause()}
            >
              暂停接听
            </Button>
          ) : null}
          {canGoOffline ? (
            <Button
              aria-label="下线"
              icon={<DisconnectOutlined />}
              disabled={busy}
              onClick={() => void agent.goOffline()}
            >
              下线
            </Button>
          ) : null}
        </Flex>
      </div>

      {agent.phase === 'blocked' ? (
        <Alert
          className="agent-workbench-alert"
          type="warning"
          showIcon
          title="当前账号无法进入接听状态"
          description={blockDescription}
        />
      ) : null}
      {agent.errorMessage ? (
        <Alert
          className="agent-workbench-alert"
          type="error"
          showIcon
          title="坐席状态需要处理"
          description={agent.errorMessage}
        />
      ) : null}

      {agent.profile ? (
        <Card className="agent-workbench-preflight" variant="borderless">
          <Flex justify="space-between" align="center" gap="middle" wrap>
            <div>
              <Text strong>接听环境</Text>
              <div className="agent-workbench-scenes">
                <Text type="secondary">接听范围：全部业务</Text>
              </div>
            </div>
            <div className="agent-workbench-device-grid">
              <DeviceCheck
                icon={<AudioOutlined />}
                label="麦克风"
                state={agent.deviceResult.checks.microphone}
              />
              <DeviceCheck
                icon={<SoundOutlined />}
                label="输入电平"
                state={agent.deviceResult.checks.inputLevel}
              />
              <DeviceCheck
                icon={<SoundOutlined />}
                label="音频播放"
                state={agent.deviceResult.checks.audioPlayback}
              />
              <DeviceCheck
                icon={<LaptopOutlined />}
                label="浏览器"
                state={agent.deviceResult.checks.browser}
              />
              <DeviceCheck
                icon={<WifiOutlined />}
                label="网络"
                state={agent.deviceResult.checks.network}
              />
            </div>
          </Flex>
        </Card>
      ) : null}

      <div className="agent-workbench-grid">
        <Card
          title={
            <Flex align="center" gap="small">
              <span>待接通话</span>
              <span className="agent-workbench-queue-count">
                {handoffs.length}
              </span>
            </Flex>
          }
          extra={
            <Button
              type="text"
              size="small"
              onClick={() => void agentEvents.requestNotificationPermission()}
            >
              开启桌面通知
            </Button>
          }
          variant="borderless"
          onMouseEnter={agentEvents.clearUnread}
        >
          <WaitingPool
            handoffs={handoffs}
            loading={handoffsLoading}
            agentStatus={agent.status}
            consoleSessionId={agent.consoleSessionId}
            onClaimed={(credential) => {
              setWrapUpReason('');
              setClaimedCredential(credential);
              setHandoffs((current) =>
                current.filter(
                  (item) => item.handoff_id !== credential.handoff.handoff_id,
                ),
              );
            }}
            onRemove={(handoffId) =>
              setHandoffs((current) =>
                current.filter((item) => item.handoff_id !== handoffId),
              )
            }
          />
        </Card>
        <Card
          className="agent-workbench-current-card"
          title="当前工作区"
          variant="borderless"
        >
          {wrapUpReason ? (
            <Alert
              className="agent-workbench-alert"
              type="warning"
              showIcon
              title="通话异常结束，已进入话后处理"
              description={wrapUpReason}
            />
          ) : null}
          {!currentHandoff && agentCall.phase === 'idle' ? (
            nextHandoff ? (
              <div className="agent-workbench-next-handoff">
                <Tag color="blue">
                  {sceneLabels[nextHandoff.scene_code] ||
                    nextHandoff.scene_code}
                </Tag>
                <Title level={4}>队首请求正在等待接管</Title>
                <Text strong>
                  {[
                    nextHandoff.masked_customer_name,
                    nextHandoff.masked_contact,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '客户信息待加载'}
                </Text>
                <Text type="secondary">
                  {nextHandoff.request_reason ||
                    nextHandoff.handoff_summary ||
                    nextHandoff.request_message ||
                    '客户正在等待人工服务'}
                </Text>
                <Text className="agent-workbench-next-hint" type="secondary">
                  请从左侧队首请求接管通话
                </Text>
              </div>
            ) : (
              <div className="agent-workbench-idle">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={idleDescription}
                />
              </div>
            )
          ) : currentHandoff &&
            ['ended', 'wrap_up_quick'].includes(agentCall.phase) ? (
            <QuickWrapUp
              handoff={currentHandoff}
              abnormalReason={wrapUpReason}
              onSubmitted={async () => {
                setClaimedCredential(undefined);
                setWrapUpReason('');
                await agent.bootstrap();
                await loadHandoffs();
              }}
            />
          ) : (
            <CurrentCallPanel
              phase={agentCall.phase}
              connectionStage={agentCall.connectionStage}
              microphoneEnabled={agentCall.microphoneEnabled}
              remoteAudioReady={agentCall.remoteAudioReady}
              networkQuality={agentCall.networkQuality}
              errorMessage={agentCall.errorMessage}
              onToggleMicrophone={agentCall.toggleMicrophone}
              onSwitchAudioInput={agentCall.switchAudioInput}
              onEndCall={agentCall.endCall}
            />
          )}
        </Card>
        <Card title="客户与交接信息" variant="borderless">
          <HandoffContextPanel handoff={contextHandoff} />
        </Card>
      </div>
    </PageContainer>
  );
};

export default AgentWorkbenchPage;
