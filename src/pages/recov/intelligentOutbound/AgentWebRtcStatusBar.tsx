import {
  AudioOutlined,
  BugOutlined,
  DisconnectOutlined,
  PhoneOutlined,
  PoweroffOutlined,
} from '@ant-design/icons';
import { Alert, Button, Popover, Space, Tag, Typography } from 'antd';
import React, { useEffect, useRef } from 'react';
import type {
  UseWebRtcAgentResult,
  WebRtcAgentStatus,
  WebRtcDiagnosticEvent,
} from './useWebRtcAgent';

const { Text } = Typography;

const statusText: Record<WebRtcAgentStatus, string> = {
  unregistered: '未注册',
  registering: '注册中',
  available: '可接听',
  incoming: '来电中',
  talking: '通话中',
  error: '异常',
};

const statusColor: Record<WebRtcAgentStatus, string> = {
  unregistered: 'default',
  registering: 'processing',
  available: 'success',
  incoming: 'warning',
  talking: 'processing',
  error: 'error',
};

const formatDiagnosticTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('zh-CN', { hour12: false });
};

const renderDiagnosticData = (data?: Record<string, string>) => {
  if (!data) return null;
  const text = Object.entries(data)
    .map(([key, value]) => `${key}=${value}`)
    .join('  ');
  if (!text) return null;
  return (
    <Text type="secondary" className="block break-all text-xs">
      {text}
    </Text>
  );
};

const DiagnosticPopoverContent = ({
  events,
}: {
  events: WebRtcDiagnosticEvent[];
}) => {
  const recentEvents = events.slice(0, 20);
  return (
    <div
      style={{
        maxHeight: 360,
        maxWidth: 'calc(100vw - 48px)',
        overflowY: 'auto',
        width: 520,
      }}
    >
      {recentEvents.length ? (
        <Space direction="vertical" size={8} className="w-full">
          {recentEvents.map((event) => (
            <div
              className="border-0 border-b border-solid border-gray-100 pb-2 last:border-b-0 last:pb-0"
              key={event.id}
            >
              <Space size={8} wrap>
                <Text type="secondary" className="text-xs">
                  {formatDiagnosticTime(event.at)}
                </Text>
                <Text strong className="text-xs">
                  {event.event}
                </Text>
              </Space>
              {event.detail ? (
                <Text className="block text-xs">{event.detail}</Text>
              ) : null}
              {renderDiagnosticData(event.data)}
            </div>
          ))}
        </Space>
      ) : (
        <Text type="secondary">暂无诊断记录</Text>
      )}
    </div>
  );
};

type AgentWebRtcStatusBarProps = {
  agent: UseWebRtcAgentResult;
  onHangup?: () => void;
};

export const AgentWebRtcStatusBar = ({
  agent,
  onHangup,
}: AgentWebRtcStatusBarProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.srcObject = agent.remoteStream;
    if (agent.remoteStream) {
      void audio.play().catch(() => undefined);
    }
  }, [agent.remoteStream]);

  return (
    <div className="mb-3 rounded border border-solid border-gray-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Space size="small" wrap>
          <Text strong>坐席 WebRTC</Text>
          <Tag color={statusColor[agent.status]}>
            {statusText[agent.status]}
          </Tag>
          {agent.agentExtension ? (
            <Text type="secondary">分机 {agent.agentExtension}</Text>
          ) : null}
          {agent.diagnosticMessage ? (
            <Text type="secondary">{agent.diagnosticMessage}</Text>
          ) : null}
        </Space>

        <Space size="small" wrap>
          <Popover
            content={
              <DiagnosticPopoverContent events={agent.diagnosticEvents} />
            }
            title="WebRTC 诊断"
            trigger="click"
          >
            <Button icon={<BugOutlined />}>诊断</Button>
          </Popover>
          {agent.status === 'unregistered' ? (
            <Button icon={<PoweroffOutlined />} onClick={agent.registerAgent}>
              上线
            </Button>
          ) : null}
          {agent.status === 'registering' ? (
            <Button icon={<PoweroffOutlined />} loading>
              上线
            </Button>
          ) : null}
          {agent.status === 'available' ? (
            <Button
              icon={<DisconnectOutlined />}
              onClick={agent.unregisterAgent}
            >
              下线
            </Button>
          ) : null}
          {agent.status === 'incoming' ? (
            <>
              <Button
                icon={<PhoneOutlined />}
                type="primary"
                onClick={agent.answerIncoming}
              >
                接听来电
              </Button>
              <Button danger onClick={agent.rejectIncoming}>
                拒接
              </Button>
            </>
          ) : null}
          {agent.status === 'talking' ? (
            <Button
              danger
              icon={<AudioOutlined />}
              onClick={onHangup || agent.hangup}
            >
              挂断
            </Button>
          ) : null}
          {agent.status === 'error' ? (
            <Button icon={<PoweroffOutlined />} onClick={agent.registerAgent}>
              重新上线
            </Button>
          ) : null}
        </Space>
      </div>
      {agent.errorMessage ? (
        <Alert
          className="mt-2"
          showIcon
          title={agent.errorMessage}
          type="error"
        />
      ) : null}
      {/* biome-ignore lint/a11y/useMediaCaption: Remote WebRTC audio has no caption track source. */}
      <audio ref={audioRef} autoPlay />
    </div>
  );
};
