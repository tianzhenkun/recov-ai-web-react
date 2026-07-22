import { PhoneOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Flex, Spin, Tag, Typography } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import {
  claimHandoff,
  type HandoffDto,
  type MediaCredentialDto,
} from '@/services/ruoyi/agent-console';
import './WaitingPool.css';

const { Paragraph, Text } = Typography;

export type WaitingPoolProps = {
  handoffs: HandoffDto[];
  loading?: boolean;
  agentStatus: string;
  consoleSessionId: string;
  claim?: (
    handoffId: string,
    input: { consoleSessionId: string; idempotencyKey: string },
  ) => Promise<unknown>;
  onClaimed?: (credential: MediaCredentialDto) => void;
  onRemove?: (handoffId: string) => void;
  now?: number;
};

const sceneLabels: Record<string, string> = {
  intro_contract: '合同审核',
  intro_document: '跨境文书',
  intro_overseas: '海外获客',
  intro_geo: 'GEO',
};

export type HandoffSlaLevel = 'normal' | 'warning' | 'urgent';

export const getHandoffWaitingSeconds = (handoff: HandoffDto, now: number) =>
  Math.max(0, Math.floor((now - Date.parse(handoff.requested_at)) / 1000));

export const getHandoffSlaLevel = (seconds: number): HandoffSlaLevel => {
  if (seconds < 30) return 'normal';
  if (seconds < 45) return 'warning';
  return 'urgent';
};

const unwrapCredential = (response: unknown): MediaCredentialDto => {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    (response as { data?: unknown }).data
  ) {
    return (response as { data: MediaCredentialDto }).data;
  }
  return response as MediaCredentialDto;
};

const getErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object') return undefined;
  const direct = Reflect.get(error, 'code');
  if (typeof direct === 'string') return direct;
  const response = Reflect.get(error, 'response');
  const data =
    response && typeof response === 'object'
      ? Reflect.get(response, 'data')
      : undefined;
  const nested =
    data && typeof data === 'object'
      ? Reflect.get(data, 'errorCode')
      : undefined;
  return typeof nested === 'string' ? nested : undefined;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '接听失败，请刷新后重试';

const WaitingPool = ({
  handoffs,
  loading = false,
  agentStatus,
  consoleSessionId,
  claim = claimHandoff,
  onClaimed,
  onRemove,
  now = Date.now(),
}: WaitingPoolProps) => {
  const inFlight = useRef(new Set<string>());
  const [claimingId, setClaimingId] = useState<string>();
  const [removedIds, setRemovedIds] = useState(() => new Set<string>());
  const [notice, setNotice] = useState('');
  const visibleHandoffs = useMemo(
    () =>
      handoffs
        .filter((item) => !removedIds.has(item.handoff_id))
        .sort(
          (left, right) =>
            Date.parse(left.requested_at) - Date.parse(right.requested_at),
        ),
    [handoffs, removedIds],
  );

  const handleClaim = async (handoff: HandoffDto) => {
    const handoffId = handoff.handoff_id;
    if (inFlight.current.has(handoffId) || agentStatus !== 'available') return;
    inFlight.current.add(handoffId);
    setClaimingId(handoffId);
    setNotice('');
    try {
      const response = await claim(handoffId, {
        consoleSessionId,
        idempotencyKey: crypto.randomUUID(),
      });
      onClaimed?.(unwrapCredential(response));
    } catch (error) {
      if (getErrorCode(error) === 'HANDOFF_ALREADY_CLAIMED') {
        setRemovedIds((current) => new Set(current).add(handoffId));
        setNotice('已被其他坐席接听');
        onRemove?.(handoffId);
      } else {
        setNotice(getErrorMessage(error));
      }
    } finally {
      inFlight.current.delete(handoffId);
      setClaimingId(undefined);
    }
  };

  return (
    <div className="agent-waiting-pool">
      {notice ? (
        <Alert
          className="agent-waiting-pool-notice"
          type="info"
          showIcon
          title={notice}
        />
      ) : null}
      <Spin spinning={loading}>
        {visibleHandoffs.length ? (
          <div className="agent-waiting-pool-list">
            {visibleHandoffs.map((handoff) => {
              const waitingSeconds = getHandoffWaitingSeconds(handoff, now);
              const slaLevel = getHandoffSlaLevel(waitingSeconds);
              const customer = [
                handoff.masked_customer_name,
                handoff.masked_contact,
              ]
                .filter(Boolean)
                .join(' · ');
              const fallbackDialogue = handoff.recent_dialogue?.slice(-2) ?? [];
              return (
                <div
                  className="agent-waiting-pool-item"
                  key={handoff.handoff_id}
                >
                  <div className="agent-waiting-pool-content">
                    <Flex justify="space-between" gap="small" align="center">
                      <Flex gap="small" align="center" wrap>
                        <Tag color="blue">
                          {sceneLabels[handoff.scene_code] ||
                            handoff.scene_code}
                        </Tag>
                        <Text strong>{customer || '客户信息待加载'}</Text>
                      </Flex>
                      <span
                        className="agent-waiting-pool-timer"
                        data-sla-level={slaLevel}
                      >
                        已等待 {waitingSeconds} 秒
                      </span>
                    </Flex>
                    {handoff.request_reason ? (
                      <Text
                        className="agent-waiting-pool-reason"
                        type="secondary"
                      >
                        {handoff.request_reason}
                      </Text>
                    ) : null}
                    <Paragraph className="agent-waiting-pool-summary">
                      {handoff.handoff_summary || handoff.request_message}
                    </Paragraph>
                    {!handoff.handoff_summary && fallbackDialogue.length ? (
                      <div className="agent-waiting-pool-dialogue">
                        {fallbackDialogue.map((turn, index) => (
                          <Text
                            key={turn.id || `${turn.speaker_type}-${index}`}
                          >
                            {turn.text}
                          </Text>
                        ))}
                      </div>
                    ) : null}
                    {handoff.pending_items?.length ? (
                      <ul className="agent-waiting-pool-items">
                        {handoff.pending_items.slice(0, 3).map((item) => (
                          <li key={item.text}>{item.text}</li>
                        ))}
                      </ul>
                    ) : null}
                    <Button
                      block
                      type="primary"
                      aria-label={`接听 ${customer || handoff.handoff_id}`}
                      icon={<PhoneOutlined />}
                      loading={claimingId === handoff.handoff_id}
                      disabled={agentStatus !== 'available'}
                      onClick={() => void handleClaim(handoff)}
                    >
                      接听
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无待接来电"
          />
        )}
      </Spin>
    </div>
  );
};

export default WaitingPool;
