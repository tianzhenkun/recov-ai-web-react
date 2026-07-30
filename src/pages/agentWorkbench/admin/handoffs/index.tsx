import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Button,
  Collapse,
  Descriptions,
  Drawer,
  Modal,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  getAdminHandoff,
  type HandoffDto,
  listAdminHandoffs,
  reconcileAdminHandoff,
} from '@/services/ruoyi/agent-console';
import {
  AdminMetricRow,
  formatDateTime,
  getHandoffCustomerIdentity,
  getHandoffReasonLabel,
  type HandoffAdminDetail,
  normalizeHandoffDetail,
  normalizeHandoffMetrics,
  sceneLabels,
  sceneValueEnum,
  statusColors,
  statusLabels,
  unwrapPage,
} from '../_shared';

const { Paragraph, Text, Title } = Typography;

const detailDescriptionStyles = {
  label: { color: '#1f1f1f' },
};

const waitSeconds = (row: HandoffDto) => {
  const end = row.connected_at || row.ended_at || new Date().toISOString();
  return Math.max(
    0,
    Math.round(
      (new Date(end).getTime() - new Date(row.requested_at).getTime()) / 1000,
    ),
  );
};

const HandoffAdminPage = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<HandoffAdminDetail>();

  const columns = useMemo<ProColumns<HandoffDto>[]>(
    () => [
      {
        title: '时间范围',
        dataIndex: 'requested_at_range',
        valueType: 'dateTimeRange',
        hideInTable: true,
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
        title: '转人工状态',
        dataIndex: 'status',
        valueType: 'select',
        valueEnum: Object.fromEntries(
          [
            'requested',
            'accepted',
            'connected',
            'completed',
            'expired',
            'canceled',
            'failed',
          ].map((value) => [value, { text: statusLabels[value] }]),
        ),
        render: (_, row) => (
          <Tag color={statusColors[row.status]}>
            {statusLabels[row.status] || '未知状态'}
          </Tag>
        ),
      },
      {
        title: '接听坐席',
        key: 'human_agent_identity_filter',
        dataIndex: 'human_agent_identity',
        hideInTable: true,
      },
      { title: '客户关键字', dataIndex: 'customer_keyword', hideInTable: true },
      { title: 'call_id', dataIndex: 'call_id', hideInTable: true },
      {
        title: '是否生成未接回访',
        dataIndex: 'has_unanswered_follow_up',
        valueType: 'select',
        valueEnum: { true: { text: '是' }, false: { text: '否' } },
        hideInTable: true,
      },
      {
        title: '请求时间',
        dataIndex: 'requested_at',
        hideInSearch: true,
        renderText: (value) => formatDateTime(value),
      },
      {
        title: '客户标识',
        dataIndex: 'masked_customer_name',
        hideInSearch: true,
        render: (_, row) => {
          const customer = getHandoffCustomerIdentity(row);
          return (
            <div>
              <Text strong>{customer.primary}</Text>
              <div>
                <Text type="secondary">{customer.secondary}</Text>
              </div>
            </div>
          );
        },
      },
      {
        title: '业务场景',
        dataIndex: 'scene_code',
        hideInSearch: true,
        renderText: (value) => sceneLabels[value] || value,
      },
      {
        title: '转人工原因',
        dataIndex: 'request_reason',
        hideInSearch: true,
        ellipsis: true,
        renderText: (value) => getHandoffReasonLabel(value),
      },
      {
        title: '等待时长',
        key: 'wait_seconds',
        hideInSearch: true,
        render: (_, row) => `${waitSeconds(row)} 秒`,
      },
      {
        title: '接听坐席',
        dataIndex: 'human_agent_identity',
        hideInSearch: true,
        renderText: (value) => value || '-',
      },
      {
        title: '最终结果',
        dataIndex: 'status',
        hideInSearch: true,
        render: (_, row) => (
          <Tag color={statusColors[row.status]}>
            {statusLabels[row.status] || '未知状态'}
          </Tag>
        ),
      },
      {
        title: '操作',
        valueType: 'option',
        fixed: 'right',
        width: 168,
        render: (_, row) => (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              onClick={async () =>
                setDetail(
                  normalizeHandoffDetail(await getAdminHandoff(row.handoff_id)),
                )
              }
            >
              查看详情
            </Button>
            {row.failure_stage || row.status === 'failed' ? (
              <Button
                danger
                type="link"
                size="small"
                onClick={() =>
                  Modal.confirm({
                    title: '确认重新执行状态补偿',
                    content: `仅对异常记录 ${row.handoff_id} 执行幂等补偿，不会改写正常通话结果。`,
                    okText: '确认补偿',
                    cancelText: '取消',
                    onOk: async () => {
                      await reconcileAdminHandoff(
                        row.handoff_id,
                        crypto.randomUUID(),
                      );
                      actionRef.current?.reload();
                    },
                  })
                }
              >
                重新补偿
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [],
  );

  const detailHandoff = detail?.handoff;
  const detailRecord = detail?.record;
  const detailCustomer = detailHandoff
    ? getHandoffCustomerIdentity({
        ...detailHandoff,
        masked_contact:
          (detailRecord?.masked_contact as string | undefined) ||
          detailHandoff.masked_contact,
        business_id:
          (detailRecord?.business_id as string | undefined) ||
          detailHandoff.business_id,
      })
    : undefined;
  const timelineItems = detailHandoff
    ? [
        { label: '请求转人工', value: detailHandoff.requested_at },
        { label: '坐席认领', value: detailHandoff.accepted_at },
        { label: '人工媒体接通', value: detailHandoff.connected_at },
        { label: '通话结束', value: detailHandoff.ended_at },
      ].filter((item) => item.value)
    : [];
  const normalizedMetrics = normalizeHandoffMetrics(metrics);

  return (
    <PageContainer className="agent-admin-page" title="转人工记录">
      <AdminMetricRow
        items={[
          {
            key: 'requests',
            label: '请求数',
            value: normalizedMetrics.requests,
            tone: 'blue',
          },
          {
            key: 'connect_rate',
            label: '60 秒内接通率',
            value: `${normalizedMetrics.connectRate}%`,
            tone: 'green',
          },
          {
            key: 'avg_wait',
            label: '平均等待时间',
            value: `${normalizedMetrics.averageWaitSeconds} 秒`,
            tone: 'orange',
          },
          {
            key: 'expired',
            label: '等待超时数',
            value: normalizedMetrics.timeoutCount,
            tone: 'red',
          },
          {
            key: 'media_failed',
            label: '媒体接入失败数',
            value: normalizedMetrics.mediaFailureCount,
            tone: 'purple',
          },
        ]}
      />
      <ProTable<HandoffDto>
        actionRef={actionRef}
        rowKey={(row) => String(row.handoff_id)}
        columns={columns}
        search={{ labelWidth: 112 }}
        scroll={{ x: 1280 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        request={async ({ current, pageSize, ...filters }) => {
          const page = unwrapPage<HandoffDto>(
            await listAdminHandoffs({ pageNum: current, pageSize, ...filters }),
          );
          setMetrics(page.metrics || {});
          return { data: page.rows, total: page.total, success: true };
        }}
      />

      <Drawer
        title="转人工记录详情"
        open={Boolean(detail)}
        size={720}
        onClose={() => setDetail(undefined)}
      >
        {detailHandoff ? (
          <div className="agent-admin-detail">
            <section className="agent-admin-detail-section">
              <Title level={5}>基本信息</Title>
              <Descriptions
                column={2}
                styles={detailDescriptionStyles}
                items={[
                  {
                    key: 'handoff',
                    label: 'handoff_id',
                    children: detailHandoff.handoff_id,
                  },
                  {
                    key: 'call',
                    label: 'call_id',
                    children: detailHandoff.call_id,
                  },
                  {
                    key: 'customer',
                    label: '客户标识',
                    children: detailCustomer
                      ? `${detailCustomer.primary} · ${detailCustomer.secondary}`
                      : '-',
                  },
                  {
                    key: 'scene',
                    label: '业务场景',
                    children:
                      sceneLabels[detailHandoff.scene_code] ||
                      detailHandoff.scene_code,
                  },
                  {
                    key: 'reason',
                    label: '转人工原因',
                    children: getHandoffReasonLabel(
                      detailHandoff.request_reason,
                    ),
                  },
                  {
                    key: 'agent',
                    label: '接听坐席',
                    children: detailHandoff.human_agent_identity || '未接听',
                  },
                  {
                    key: 'status',
                    label: '最终结果',
                    children: (
                      <Tag color={statusColors[detailHandoff.status]}>
                        {statusLabels[detailHandoff.status] || '未知状态'}
                      </Tag>
                    ),
                  },
                ]}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>状态时间线</Title>
              <Timeline
                items={timelineItems.map((item) => ({
                  children: `${item.label} · ${formatDateTime(item.value)}`,
                }))}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>AI 交接摘要与待处理事项</Title>
              <Paragraph>
                {detailHandoff.handoff_summary ||
                  detailHandoff.request_message ||
                  '摘要未生成'}
              </Paragraph>
              <ul>
                {(detailHandoff.pending_items || []).map((item) => (
                  <li key={item.text}>{item.text}</li>
                ))}
              </ul>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>转接前对话摘录</Title>
              {detailHandoff.recent_dialogue?.length ? (
                <div>
                  {detailHandoff.recent_dialogue.map((item, index) => (
                    <Paragraph key={item.id || `${item.speaker_type}-${index}`}>
                      {item.speaker_type}：{item.text}
                    </Paragraph>
                  ))}
                </div>
              ) : (
                <Text type="secondary">本次转人工未保存转接前对话</Text>
              )}
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>录音状态</Title>
              <Text>
                {String(detailRecord?.recording_status || '当前记录未提供')}
              </Text>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>快速话后结果</Title>
              <Text>
                {String(
                  detail.afterCallWork?.summary ||
                    detail.afterCallWork?.disposition_code ||
                    '尚未提交',
                )}
              </Text>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>关联跟进任务</Title>
              <Text>
                {String(
                  (detail.followUp && Reflect.get(detail.followUp, 'id')) ||
                    (detail.followUp &&
                      Reflect.get(detail.followUp, 'follow_up_id')) ||
                    '无',
                )}
              </Text>
            </section>
            <Collapse
              items={[
                {
                  key: 'model-prompt',
                  label: '通话配置快照（排查用）',
                  children: (
                    <Text type="secondary">
                      {String(
                        detailRecord?.model_prompt_snapshot ||
                          '本次通话未保存配置快照',
                      )}
                    </Text>
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default HandoffAdminPage;
