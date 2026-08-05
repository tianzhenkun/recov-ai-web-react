import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type FollowUpAttemptDto,
  type FollowUpTaskDto,
  getAdminFollowUp,
  listAdminFollowUps,
} from '@/services/ruoyi/agent-console';
import {
  AdminMetricRow,
  formatDateTime,
  sceneLabels,
  sceneValueEnum,
  statusColors,
  statusLabels,
  unwrapPage,
} from '../_shared';

const { Text, Title } = Typography;

const sourceLabels: Record<string, string> = {
  after_call_work: '接通后跟进',
  handoff_unanswered: '人工未接回访',
  ai_post_call: 'AI 话后跟进',
};

const attemptResultLabels: Record<string, string> = {
  connected: '已接通',
  no_answer: '无人接听',
  busy: '占线',
  rejected: '客户拒接',
  invalid_contact: '无效联系方式',
  technical_failure: '技术失败',
};

const contactChannelLabels: Record<string, string> = {
  system_callback: '系统回拨',
  manual_phone: '人工电话',
  wechat: '微信',
  email: '邮件',
  other: '其他',
};

type FollowUpAdminDetail = {
  task: FollowUpTaskDto;
  attempts: FollowUpAttemptDto[];
  callbackRecords: {
    id?: unknown;
    call_id?: unknown;
    status?: unknown;
    end_reason?: unknown;
  }[];
};

const normalizeDetail = (response: unknown): FollowUpAdminDetail => {
  const data =
    response &&
    typeof response === 'object' &&
    Reflect.get(response, 'data') !== undefined
      ? Reflect.get(response, 'data')
      : response;
  if (data && typeof data === 'object' && Reflect.get(data, 'task')) {
    return {
      task: Reflect.get(data, 'task') as FollowUpTaskDto,
      attempts: (Reflect.get(data, 'attempts') || []) as FollowUpAttemptDto[],
      callbackRecords: (Reflect.get(data, 'callback_records') || []) as {
        id?: unknown;
        call_id?: unknown;
        status?: unknown;
        end_reason?: unknown;
      }[],
    };
  }
  const task = data as FollowUpTaskDto;
  return {
    task,
    attempts: task?.attempts || [],
    callbackRecords: [],
  };
};

export const FollowUpOverviewPage = () => {
  const [searchParams] = useSearchParams();
  const deepLinkFollowUpId = searchParams.get('followUpId')?.trim() || '';
  const presetStatus = searchParams.get('status')?.trim() || '';
  const presetFormalOutboundOnly =
    searchParams.get('formalOutboundOnly') === 'true';
  const presetSourceStartedAtBegin =
    searchParams.get('sourceStartedAtBegin')?.trim() || '';
  const presetSourceStartedAtEnd =
    searchParams.get('sourceStartedAtEnd')?.trim() || '';
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<FollowUpAdminDetail>();
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const detailRequestIdRef = useRef(0);

  const openDetail = useCallback(async (followUpId: string) => {
    const requestId = ++detailRequestIdRef.current;
    setSelectedFollowUpId(followUpId);
    setDetail(undefined);
    setDetailError(undefined);
    setDetailLoading(true);
    try {
      const nextDetail = normalizeDetail(await getAdminFollowUp(followUpId));
      if (requestId === detailRequestIdRef.current) {
        setDetail(nextDetail);
      }
    } catch {
      if (requestId === detailRequestIdRef.current) {
        setDetailError('跟进任务详情加载失败，请确认任务是否存在或重试');
      }
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(
    () => () => {
      detailRequestIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (deepLinkFollowUpId) {
      void openDetail(deepLinkFollowUpId);
    }
  }, [deepLinkFollowUpId, openDetail]);

  const columns = useMemo<ProColumns<FollowUpTaskDto>[]>(
    () => [
      {
        title: '来源类型',
        dataIndex: 'source_type',
        valueType: 'select',
        valueEnum: Object.fromEntries(
          Object.entries(sourceLabels).map(([value, text]) => [
            value,
            { text },
          ]),
        ),
        renderText: (value) => sourceLabels[value] || value,
      },
      {
        title: '业务场景',
        key: 'scene_code_filter',
        dataIndex: 'scene_code',
        valueType: 'select',
        valueEnum: sceneValueEnum,
        hideInTable: true,
      },
      {
        title: '负责人',
        key: 'owner_agent_identity_filter',
        dataIndex: 'owner_agent_identity',
        hideInTable: true,
      },
      {
        title: '任务状态',
        dataIndex: 'status',
        initialValue: presetStatus || undefined,
        valueType: 'select',
        valueEnum: Object.fromEntries(
          ['pending', 'processing', 'completed', 'closed'].map((value) => [
            value,
            { text: statusLabels[value] },
          ]),
        ),
        render: (_, row) => (
          <Tag color={statusColors[row.status]}>
            {statusLabels[row.status] || '未知状态'}
          </Tag>
        ),
      },
      {
        title: '客户预约时间',
        dataIndex: 'customer_callback_at_range',
        valueType: 'dateTimeRange',
        hideInTable: true,
      },
      {
        title: '来源通话时间',
        dataIndex: 'source_started_at_range',
        valueType: 'dateTimeRange',
        hideInTable: true,
        initialValue:
          presetSourceStartedAtBegin && presetSourceStartedAtEnd
            ? [presetSourceStartedAtBegin, presetSourceStartedAtEnd]
            : undefined,
      },
      { title: '客户关键字', dataIndex: 'customer_keyword', hideInTable: true },
      { title: '来源 call_id', dataIndex: 'source_call_id', hideInTable: true },
      {
        title: 'handoff_id',
        dataIndex: 'source_handoff_id',
        hideInTable: true,
      },
      {
        title: '脱敏客户',
        dataIndex: 'masked_contact',
        hideInSearch: true,
        renderText: (value) => value || '联系方式已脱敏',
      },
      {
        title: '业务场景',
        dataIndex: 'scene_code',
        hideInSearch: true,
        renderText: (value) => sceneLabels[value] || value,
      },
      {
        title: '跟进原因',
        dataIndex: 'follow_up_reason',
        hideInSearch: true,
        ellipsis: true,
      },
      {
        title: '负责人',
        dataIndex: 'owner_agent_identity',
        hideInSearch: true,
        renderText: (value) => value || '待认领',
      },
      {
        title: '客户预约时间',
        dataIndex: 'customer_callback_at',
        hideInSearch: true,
        renderText: (value) => (value ? formatDateTime(value) : '未约定'),
      },
      {
        title: '最近联系结果',
        key: 'latest_attempt',
        hideInSearch: true,
        render: (_, row) => {
          const latest = row.latest_attempt || row.attempts?.at(-1);
          return latest
            ? `${attemptResultLabels[latest.attempt_result] || '其他结果'} · ${formatDateTime(latest.contacted_at)}`
            : '-';
        },
      },
      {
        title: '操作',
        valueType: 'option',
        fixed: 'right',
        width: 100,
        render: (_, row) => (
          <Button
            type="link"
            size="small"
            onClick={() => void openDetail(row.id)}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [
      openDetail,
      presetSourceStartedAtBegin,
      presetSourceStartedAtEnd,
      presetStatus,
    ],
  );

  const detailTask = detail?.task;

  return (
    <PageContainer className="agent-admin-page" title="跟进总览">
      <AdminMetricRow
        items={[
          {
            key: 'pending',
            label: '待处理',
            value: metrics.pending ?? 0,
            tone: 'blue',
          },
          {
            key: 'scheduled',
            label: '客户预约待回访',
            value: metrics.scheduled ?? 0,
            tone: 'purple',
          },
          {
            key: 'overdue',
            label: '预约已逾期',
            value: metrics.overdue ?? 0,
            tone: 'red',
          },
          {
            key: 'unanswered',
            label: '人工未接回访',
            value: metrics.handoff_unanswered ?? metrics.unanswered ?? 0,
            tone: 'orange',
          },
          {
            key: 'completed',
            label: '已完成',
            value: metrics.completed ?? 0,
            tone: 'green',
          },
          {
            key: 'closed',
            label: '已关闭',
            value: metrics.closed ?? 0,
            tone: 'blue',
          },
        ]}
      />
      <ProTable<FollowUpTaskDto>
        rowKey={(row) => String(row.id)}
        columns={columns}
        search={{ labelWidth: 112 }}
        scroll={{ x: 1300 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        request={async ({
          current,
          pageSize,
          source_started_at_range,
          ...filters
        }) => {
          const sourceRange = Array.isArray(source_started_at_range)
            ? source_started_at_range
            : undefined;
          const status = (filters.status as string | undefined) || presetStatus;
          const sourceStartedAtBegin = sourceRange?.[0]
            ? dayjs(sourceRange[0]).toISOString()
            : presetSourceStartedAtBegin;
          const sourceStartedAtEnd = sourceRange?.[1]
            ? dayjs(sourceRange[1]).toISOString()
            : presetSourceStartedAtEnd;
          const page = unwrapPage<FollowUpTaskDto>(
            await listAdminFollowUps({
              pageNum: current,
              pageSize,
              ...filters,
              ...(status ? { status } : {}),
              ...(presetFormalOutboundOnly ? { formalOutboundOnly: true } : {}),
              ...(sourceStartedAtBegin ? { sourceStartedAtBegin } : {}),
              ...(sourceStartedAtEnd ? { sourceStartedAtEnd } : {}),
            }),
          );
          setMetrics(page.metrics || {});
          return {
            data: page.rows,
            total: page.total,
            success: true,
          };
        }}
      />

      <Drawer
        title="跟进任务详情"
        open={Boolean(selectedFollowUpId)}
        loading={detailLoading}
        size={720}
        onClose={() => {
          setSelectedFollowUpId(undefined);
          setDetail(undefined);
          setDetailError(undefined);
        }}
      >
        {detailError ? (
          <Alert showIcon title={detailError} type="error" />
        ) : detailTask ? (
          <div className="agent-admin-detail">
            <section className="agent-admin-detail-section">
              <Title level={5}>客户与业务引用</Title>
              <Descriptions
                column={2}
                items={[
                  {
                    key: 'contact',
                    label: '脱敏客户',
                    children: detailTask.masked_contact || '联系方式未提供',
                  },
                  {
                    key: 'scene',
                    label: '业务场景',
                    children:
                      sceneLabels[detailTask.scene_code] ||
                      detailTask.scene_code,
                  },
                  {
                    key: 'business_type',
                    label: '业务类型',
                    children: detailTask.business_type || '-',
                  },
                  {
                    key: 'business_id',
                    label: '业务 ID',
                    children: detailTask.business_id || '-',
                  },
                ]}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>来源通话</Title>
              <Descriptions
                column={1}
                items={[
                  {
                    key: 'source',
                    label: '来源',
                    children:
                      sourceLabels[detailTask.source_type] || '其他来源',
                  },
                  {
                    key: 'call',
                    label: 'call_id',
                    children: detailTask.source_call_id,
                  },
                  {
                    key: 'handoff',
                    label: 'handoff_id',
                    children: detailTask.source_handoff_id ?? '-',
                  },
                ]}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>任务摘要</Title>
              <Text>{detailTask.summary || detailTask.follow_up_reason}</Text>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>客户预约时间</Title>
              <Text>
                {detailTask.customer_callback_at
                  ? formatDateTime(detailTask.customer_callback_at)
                  : '未约定'}
              </Text>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>历次联系尝试</Title>
              <Timeline
                items={detail.attempts.map((attempt) => ({
                  children: `${formatDateTime(attempt.contacted_at)} · ${
                    contactChannelLabels[attempt.contact_channel] || '其他渠道'
                  } · ${
                    attemptResultLabels[attempt.attempt_result] || '其他结果'
                  }`,
                }))}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>关联回拨通话</Title>
              <div>
                {detail.callbackRecords.length > 0 ? (
                  detail.callbackRecords.map((record) => {
                    const callId = String(record.call_id || '-');
                    return (
                      <div key={String(record.id || callId)}>
                        <Text>{callId}</Text> ·{' '}
                        <Text>{String(record.status || '-')}</Text> ·{' '}
                        <Text>{String(record.end_reason || '-')}</Text>
                      </div>
                    );
                  })
                ) : (
                  <Text type="secondary">暂无关联回拨通话</Text>
                )}
              </div>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>完成或关闭信息</Title>
              <Descriptions
                column={1}
                items={[
                  {
                    key: 'status',
                    label: '状态',
                    children: (
                      <Tag color={statusColors[detailTask.status]}>
                        {statusLabels[detailTask.status] || '未知状态'}
                      </Tag>
                    ),
                  },
                  {
                    key: 'reason',
                    label: '关闭原因',
                    children: detailTask.closed_reason || '-',
                  },
                  {
                    key: 'remark',
                    label: '关闭说明',
                    children: detailTask.closed_remark || '-',
                  },
                ]}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>操作审计</Title>
              <Text type="secondary">
                {String(
                  Reflect.get(detailTask, 'audit_summary') ||
                    '暂无可展示审计摘要',
                )}
              </Text>
            </section>
          </div>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};
