import {
  AudioMutedOutlined,
  AudioOutlined,
  BugOutlined,
  DisconnectOutlined,
  PhoneOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Drawer,
  Empty,
  Input,
  message,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecovListPage,
  RecovListStack,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import {
  type AiCallLabDialogueSegment,
  type AiCallLabEvent,
  type AiCallLabHandoff,
  type AiCallLabPromptProfile,
  type AiCallLabRecording,
  type AiCallLabSession,
  type AiCallLabVoiceProfile,
  createAiCallLabSession,
  endAiCallLabSession,
  getAiCallLabDialoguePreview,
  getAiCallLabEvents,
  getAiCallLabHandoff,
  getAiCallLabPromptProfiles,
  getAiCallLabRecording,
  getAiCallLabSession,
  getAiCallLabVoiceProfiles,
  reportAiCallLabBrowserEvent,
} from '@/services/ruoyi/ai-call-lab';
import {
  type AiCallLabRoomConnection,
  connectAiCallLabRoom,
} from './livekitClient';
import './index.css';

const getEventName = (item: AiCallLabEvent) =>
  item.eventType || item.type || item.eventId || '-';

const TERMINAL_SESSION_STATUSES = new Set(['completed', 'failed']);

const AiCallLabCustomerPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [voiceProfiles, setVoiceProfiles] = useState<AiCallLabVoiceProfile[]>(
    [],
  );
  const [promptProfiles, setPromptProfiles] = useState<
    AiCallLabPromptProfile[]
  >([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedSceneCode, setSelectedSceneCode] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [businessParamsText, setBusinessParamsText] = useState(
    '{\n  "customerName": "张总"\n}',
  );
  const [session, setSession] = useState<AiCallLabSession | null>(null);
  const [recording, setRecording] = useState<AiCallLabRecording | null>(null);
  const [handoff, setHandoff] = useState<AiCallLabHandoff | null>(null);
  const [dialogueRows, setDialogueRows] = useState<AiCallLabDialogueSegment[]>(
    [],
  );
  const [eventRows, setEventRows] = useState<AiCallLabEvent[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [observabilityLoading, setObservabilityLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [roomConnected, setRoomConnected] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [debugDrawerOpen, setDebugDrawerOpen] = useState(false);
  const roomConnectionRef = useRef<AiCallLabRoomConnection | null>(null);

  const configReady = Boolean(selectedVoice && selectedSceneCode);
  const sessionTerminal = Boolean(
    session?.status && TERMINAL_SESSION_STATUSES.has(session.status),
  );
  const sessionActive = Boolean(session && !sessionTerminal);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const [voiceResult, promptResult] = await Promise.all([
        getAiCallLabVoiceProfiles(),
        getAiCallLabPromptProfiles(),
      ]);
      setVoiceProfiles(voiceResult.rows);
      setPromptProfiles(promptResult.rows);
      setSelectedVoice((prev) => prev || voiceResult.rows[0]?.voice || '');
      setSelectedSceneCode(
        (prev) => prev || promptResult.rows[0]?.sceneCode || '',
      );
    } catch {
      setVoiceProfiles([]);
      setPromptProfiles([]);
      messageApi.error('通话配置加载失败');
    } finally {
      setConfigLoading(false);
    }
  }, [messageApi]);

  const refreshObservability = useCallback(
    async (targetCallId?: string) => {
      const callId = targetCallId || session?.callId;
      if (!callId) return;
      setObservabilityLoading(true);
      try {
        const [
          nextSession,
          nextRecording,
          nextHandoff,
          dialogueResult,
          eventResult,
        ] = await Promise.all([
          getAiCallLabSession(callId),
          getAiCallLabRecording(callId),
          getAiCallLabHandoff(callId),
          getAiCallLabDialoguePreview(callId),
          getAiCallLabEvents(callId),
        ]);
        setSession((prev) => ({ ...prev, ...nextSession }));
        setRecording(nextRecording);
        setHandoff(nextHandoff);
        setDialogueRows(dialogueResult.rows);
        setEventRows(eventResult.rows);
      } catch {
        messageApi.error('运行观测刷新失败');
      } finally {
        setObservabilityLoading(false);
      }
    },
    [messageApi, session?.callId],
  );

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(
    () => () => {
      void roomConnectionRef.current?.disconnect();
    },
    [],
  );

  useEffect(() => {
    const callId = session?.callId;
    if (!callId || sessionTerminal || ending) return undefined;
    const timer = window.setInterval(() => {
      void refreshObservability(callId);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [ending, refreshObservability, session?.callId, sessionTerminal]);

  const handleCreateSession = async () => {
    let businessParams: Record<string, unknown> = {};
    try {
      businessParams = businessParamsText.trim()
        ? JSON.parse(businessParamsText)
        : {};
    } catch {
      messageApi.error('业务参数不是有效 JSON');
      return;
    }

    setCreating(true);
    try {
      const nextSession = await createAiCallLabSession({
        voice: selectedVoice,
        sceneCode: selectedSceneCode,
        businessId: businessId.trim(),
        businessParams,
      });
      setSession(nextSession);
      setRecording(null);
      setHandoff(null);
      setDialogueRows([]);
      setEventRows([]);
      await refreshObservability(nextSession.callId);
    } catch {
      messageApi.error('会话创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleConnectMicrophone = async () => {
    if (!session) {
      messageApi.warning('请先创建会话');
      return;
    }
    setConnecting(true);
    try {
      const connection = await connectAiCallLabRoom(session);
      roomConnectionRef.current = connection;
      setRoomConnected(true);
      setMicrophoneEnabled(true);
      await reportAiCallLabBrowserEvent(session.callId, {
        type: 'browser_ready',
      });
    } catch (error) {
      const connection = roomConnectionRef.current;
      roomConnectionRef.current = null;
      setRoomConnected(false);
      setMicrophoneEnabled(false);
      try {
        await connection?.disconnect();
      } catch {
        // LiveKit 客户端已尽力清理，继续收口后端 Session。
      }
      const errorMessage = error instanceof Error ? error.message : '';
      try {
        await endAiCallLabSession(session.callId);
        await refreshObservability(session.callId);
        messageApi.error(
          errorMessage
            ? `麦克风连接失败：${errorMessage}；后端会话已回收`
            : '麦克风连接失败，后端会话已回收',
        );
      } catch {
        messageApi.error(
          errorMessage
            ? `麦克风连接失败：${errorMessage}；后端会话回收失败，请点击“结束会话”重试`
            : '麦克风连接失败，后端会话回收失败，请点击“结束会话”重试',
        );
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleMicrophone = async () => {
    if (!roomConnectionRef.current || !session) return;
    const nextEnabled = !microphoneEnabled;
    await roomConnectionRef.current.setMicrophoneEnabled(nextEnabled);
    setMicrophoneEnabled(nextEnabled);
    await reportAiCallLabBrowserEvent(session.callId, {
      type: nextEnabled
        ? 'browser_microphone_unmuted'
        : 'browser_microphone_muted',
    });
  };

  const handleEndSession = async () => {
    if (!session || sessionTerminal) return;
    const { callId } = session;
    const connection = roomConnectionRef.current;
    roomConnectionRef.current = null;
    setRoomConnected(false);
    setMicrophoneEnabled(false);
    setEnding(true);
    try {
      await connection?.disconnect();
    } catch {
      messageApi.warning('本地连接断开异常，正在继续结束后端会话');
    }
    try {
      await endAiCallLabSession(callId);
      await refreshObservability(callId);
      messageApi.success('会话已结束');
    } catch {
      messageApi.error('本地已断开，但后端会话结束失败，请重试');
    } finally {
      setEnding(false);
    }
  };

  const statusTagColor = session?.status === 'connected' ? 'success' : 'blue';
  const firstAudioMs = session?.metrics?.lastModelFirstAudioMs;
  const firstAudioText =
    typeof firstAudioMs === 'number' || typeof firstAudioMs === 'string'
      ? `${firstAudioMs} ms`
      : '-';
  const microphoneText = roomConnected
    ? microphoneEnabled
      ? '麦克风：开'
      : '麦克风：关'
    : '麦克风：未连接';
  const hasAiAudioPublished = eventRows.some(
    (item) => getEventName(item) === 'ai_audio_published',
  );
  const hasModelAudioDelta = eventRows.some(
    (item) => getEventName(item) === 'model_audio_delta',
  );
  const aiAudioText = hasAiAudioPublished
    ? '已发布'
    : hasModelAudioDelta
      ? '生成中'
      : '-';
  const hasRecordingOrHandoff = Boolean(recording || handoff);

  return (
    <RecovListPage
      className="ai-call-lab-customer-page"
      title="AI Call 浏览器通话测试台"
    >
      {messageContextHolder}
      <RecovListStack>
        <div className="ai-call-lab-page-header">
          <Typography.Title level={3} style={{ margin: 0 }}>
            AI Call 浏览器通话测试台
          </Typography.Title>
          <Space>
            <Button
              icon={<BugOutlined />}
              onClick={() => setDebugDrawerOpen(true)}
            >
              调试信息
            </Button>
            {sessionTerminal && (
              <Button
                icon={<ReloadOutlined />}
                loading={observabilityLoading}
                onClick={() => void refreshObservability()}
              >
                刷新结果
              </Button>
            )}
          </Space>
        </div>

        <div className="ai-call-lab-customer-grid">
          <RecovTableCard
            title="会话配置"
            extra={
              <Button
                icon={<ReloadOutlined />}
                loading={configLoading}
                onClick={() => void loadConfig()}
              >
                刷新
              </Button>
            }
          >
            <Spin spinning={configLoading}>
              <div className="recov-table-card-content ai-call-lab-form">
                <div className="ai-call-lab-field">
                  <Typography.Text strong>音色</Typography.Text>
                  <Select
                    value={selectedVoice || undefined}
                    options={voiceProfiles.map((item) => ({
                      value: item.voice,
                      label: item.displayName
                        ? `${item.displayName} / ${item.voice}`
                        : item.voice,
                    }))}
                    style={{ width: '100%' }}
                    onChange={setSelectedVoice}
                  />
                </div>
                <div className="ai-call-lab-field">
                  <Typography.Text strong>业务场景</Typography.Text>
                  <Select
                    value={selectedSceneCode || undefined}
                    options={promptProfiles.map((item) => ({
                      value: item.sceneCode,
                      label: `${item.name} / ${item.sceneCode}`,
                    }))}
                    style={{ width: '100%' }}
                    onChange={setSelectedSceneCode}
                  />
                </div>
                <div className="ai-call-lab-field">
                  <Typography.Text strong>业务 ID</Typography.Text>
                  <Input
                    value={businessId}
                    onChange={(event) => setBusinessId(event.target.value)}
                  />
                </div>
                <div className="ai-call-lab-field">
                  <Typography.Text strong>业务参数</Typography.Text>
                  <Input.TextArea
                    value={businessParamsText}
                    rows={5}
                    onChange={(event) =>
                      setBusinessParamsText(event.target.value)
                    }
                  />
                </div>

                {configReady ? (
                  <Button
                    type="primary"
                    icon={<PhoneOutlined />}
                    block
                    loading={creating}
                    disabled={sessionActive}
                    onClick={() => void handleCreateSession()}
                  >
                    创建会话
                  </Button>
                ) : (
                  <Button block disabled>
                    暂无可用配置
                  </Button>
                )}

                <Space size={8} wrap>
                  <Button
                    icon={<AudioOutlined />}
                    loading={connecting}
                    disabled={!session || roomConnected}
                    onClick={() => void handleConnectMicrophone()}
                  >
                    连接麦克风
                  </Button>
                  <Button
                    icon={
                      microphoneEnabled ? (
                        <AudioMutedOutlined />
                      ) : (
                        <AudioOutlined />
                      )
                    }
                    disabled={!roomConnected}
                    onClick={() => void handleToggleMicrophone()}
                  >
                    {microphoneEnabled ? '静音' : '取消静音'}
                  </Button>
                  <Button
                    icon={<DisconnectOutlined />}
                    loading={ending}
                    disabled={!session || sessionTerminal}
                    onClick={() => void handleEndSession()}
                  >
                    结束会话
                  </Button>
                </Space>
              </div>
            </Spin>
          </RecovTableCard>

          <div className="ai-call-lab-observability">
            <RecovTableCard
              title="运行态"
              extra={<Tag color={statusTagColor}>{session?.status || '-'}</Tag>}
            >
              <Spin spinning={observabilityLoading}>
                <div className="ai-call-lab-state-grid">
                  <MetricItem label="首包" value={firstAudioText} />
                  <MetricItem label="浏览器" value={microphoneText} />
                  <MetricItem label="AI 音频" value={aiAudioText} />
                </div>
              </Spin>
            </RecovTableCard>

            <RecovTableCard title="对话片段">
              <RecordList emptyText="暂无对话片段">
                {dialogueRows.map((item) => (
                  <div
                    className="ai-call-lab-record-row"
                    key={`${item.segmentNo ?? item.startedAt ?? item.text ?? ''}-${item.speakerType}`}
                  >
                    <Tag>{item.speakerType || '-'}</Tag>
                    <Typography.Text>{item.text || '-'}</Typography.Text>
                  </div>
                ))}
              </RecordList>
            </RecovTableCard>

            <RecovTableCard title="录音与转人工">
              {hasRecordingOrHandoff ? (
                <div className="ai-call-lab-state-grid">
                  {recording && (
                    <MetricItem
                      label="录音状态"
                      value={recording.status || '-'}
                    />
                  )}
                  {recording?.failureMessage && (
                    <MetricItem
                      label="录音失败原因"
                      value={recording.failureMessage}
                    />
                  )}
                  {recording?.playUrl && (
                    <MetricItem
                      label="录音"
                      value={
                        // biome-ignore lint/a11y/useMediaCaption: 通话录音当前没有独立字幕轨道。
                        <audio
                          aria-label="播放通话录音"
                          className="ai-call-lab-recording-player"
                          controls
                          preload="metadata"
                          src={recording.playUrl}
                        />
                      }
                    />
                  )}
                  {handoff && (
                    <MetricItem
                      label="转人工状态"
                      value={handoff.status || '-'}
                    />
                  )}
                  {handoff?.humanAgentIdentity && (
                    <MetricItem
                      label="转人工坐席"
                      value={handoff.humanAgentIdentity}
                    />
                  )}
                  {handoff?.requestReason && (
                    <MetricItem
                      label="转人工原因"
                      value={handoff.requestReason}
                    />
                  )}
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无录音或转人工结果"
                />
              )}
            </RecovTableCard>
          </div>
        </div>
      </RecovListStack>

      <Drawer
        title="调试信息"
        open={debugDrawerOpen}
        size={520}
        destroyOnHidden
        onClose={() => setDebugDrawerOpen(false)}
      >
        <div className="ai-call-lab-debug-content">
          <div className="ai-call-lab-state-grid ai-call-lab-debug-grid">
            <MetricItem label="Call ID" value={session?.callId || '-'} />
            <MetricItem label="房间" value={session?.roomName || '-'} />
            <MetricItem label="模型" value={session?.model || '-'} />
            <MetricItem label="Egress ID" value={recording?.egressId || '-'} />
            <MetricItem
              label="原始录音地址"
              value={recording?.playUrl || '-'}
            />
          </div>

          <div className="ai-call-lab-debug-events">
            <Typography.Title level={5}>原始事件</Typography.Title>
            <RecordList emptyText="暂无事件">
              {eventRows.map((item) => {
                const eventName = getEventName(item);
                return (
                  <div
                    className="ai-call-lab-record-row"
                    key={
                      item.eventId ||
                      `${eventName}-${item.eventTime || item.timestamp || item.source || ''}`
                    }
                  >
                    <Tag color="geekblue">{eventName}</Tag>
                    <Typography.Text type="secondary">
                      {item.eventTime || item.timestamp || item.source || '-'}
                    </Typography.Text>
                  </div>
                );
              })}
            </RecordList>
          </div>
        </div>
      </Drawer>
    </RecovListPage>
  );
};

const MetricItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="ai-call-lab-metric">
    <Typography.Text type="secondary">{label}</Typography.Text>
    <Typography.Text strong ellipsis={{ tooltip: String(value || '') }}>
      {value}
    </Typography.Text>
  </div>
);

const RecordList = ({
  children,
  emptyText,
}: {
  children: React.ReactNode[];
  emptyText: string;
}) => {
  if (!children.length) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
    );
  }
  return <div className="ai-call-lab-record-list">{children}</div>;
};

export default AiCallLabCustomerPage;
