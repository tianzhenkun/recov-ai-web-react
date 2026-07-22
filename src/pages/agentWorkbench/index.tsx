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
import { Alert, Badge, Button, Card, Flex, Tag, Typography } from 'antd';
import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  getPendingHandoffs,
  type HandoffDto,
  type MediaCredentialDto,
  type PageResult,
} from '@/services/ruoyi/agent-console';
import WaitingPool from './components/WaitingPool';
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

  const loadHandoffs = useCallback(async () => {
    if (!agent.profile) {
      setHandoffs([]);
      return;
    }
    setHandoffsLoading(true);
    try {
      const response = await getPendingHandoffs({ pageSize: 100 });
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
  }, [agent.profile]);

  const agentEvents = useAgentEvents({
    agentStatus: agent.status,
    refresh: loadHandoffs,
  });

  useEffect(() => {
    if (agent.phase === 'ready' && agent.profile) void loadHandoffs();
  }, [agent.phase, agent.profile, loadHandoffs]);

  const busy = ['loading', 'checking', 'updating'].includes(agent.phase);
  const status = agent.status || 'offline';
  const meta = statusMeta[status as keyof typeof statusMeta];
  const isAvailable = status === 'available';
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
          <Text type="secondary">浏览器人工接听与本人跟进</Text>
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
              <Flex className="agent-workbench-scenes" gap="small" wrap>
                {agent.profile.scene_codes.map((scene) => (
                  <Tag key={scene}>{sceneLabels[scene] || scene}</Tag>
                ))}
              </Flex>
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
              <span>待接来电</span>
              <Badge count={agentEvents.unreadCount} />
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
        <Card title="当前通话" variant="borderless">
          {claimedCredential ? <Text>正在连接人工通话</Text> : null}
        </Card>
        <Card title="客户与交接信息" variant="borderless" />
      </div>
    </PageContainer>
  );
};

export default AgentWorkbenchPage;
