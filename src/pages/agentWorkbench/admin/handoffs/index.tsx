import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Collapse,
  Descriptions,
  Drawer,
  List,
  Modal,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  getAdminHandoff,
  type HandoffDto,
  listAdminHandoffs,
  reconcileAdminHandoff,
} from '@/services/ruoyi/agent-console';
import {
  AdminMetricRow,
  formatDateTime,
  sceneLabels,
  sceneValueEnum,
  statusLabels,
  unwrapPage,
} from '../_shared';

const { Paragraph, Text, Title } = Typography;

const unwrapDetail = (response: unknown): HandoffDto => {
  if (
    response &&
    typeof response === 'object' &&
    Reflect.get(response, 'data')
  ) {
    return Reflect.get(response, 'data') as HandoffDto;
  }
  return response as HandoffDto;
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
  const [detail, setDetail] = useState<HandoffDto>();

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
        render: (_, row) => <Tag>{statusLabels[row.status] || row.status}</Tag>,
      },
      {
        title: '接听坐席',
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
        title: '脱敏客户',
        dataIndex: 'masked_customer_name',
        hideInSearch: true,
        render: (_, row) => (
          <div>
            <Text strong>{row.masked_customer_name || '客户'}</Text>
            <div>
              <Text type="secondary">{row.masked_contact || '-'}</Text>
            </div>
          </div>
        ),
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
        renderText: (value) => statusLabels[value] || value,
      },
      {
        title: '操作',
        valueType: 'option',
        fixed: 'right',
        width: 120,
        render: (_, row) => (
          <TableActions
            maxVisible={2}
            actions={[
              {
                key: 'detail',
                label: '查看详情',
                onClick: async () =>
                  setDetail(
                    unwrapDetail(await getAdminHandoff(row.handoff_id)),
                  ),
              },
              ...(row.failure_stage || row.status === 'failed'
                ? [
                    {
                      key: 'reconcile',
                      label: '重新补偿',
                      danger: true,
                      onClick: () =>
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
                        }),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    [],
  );

  const detailData = detail as
    | (HandoffDto & Record<string, unknown>)
    | undefined;
  const timelineItems = detail
    ? [
        { label: '请求转人工', value: detail.requested_at },
        { label: '坐席认领', value: detail.accepted_at },
        { label: '人工媒体接通', value: detail.connected_at },
        { label: '通话结束', value: detail.ended_at },
      ].filter((item) => item.value)
    : [];

  return (
    <PageContainer className="agent-admin-page" title="转人工记录">
      <AdminMetricRow
        items={[
          {
            key: 'requests',
            label: '请求数',
            value: metrics.requests ?? 0,
            tone: 'blue',
          },
          {
            key: 'connect_rate',
            label: '60 秒内接通率',
            value: `${metrics.connect_rate ?? 0}%`,
            tone: 'green',
          },
          {
            key: 'avg_wait',
            label: '平均等待时间',
            value: `${metrics.avg_wait_seconds ?? 0} 秒`,
            tone: 'orange',
          },
          {
            key: 'expired',
            label: '等待超时数',
            value: metrics.expired ?? 0,
            tone: 'red',
          },
          {
            key: 'media_failed',
            label: '媒体接入失败数',
            value: metrics.media_failed ?? 0,
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
        {detail ? (
          <div className="agent-admin-detail">
            <section className="agent-admin-detail-section">
              <Title level={5}>基本信息</Title>
              <Descriptions
                column={2}
                items={[
                  {
                    key: 'handoff',
                    label: 'handoff_id',
                    children: detail.handoff_id,
                  },
                  { key: 'call', label: 'call_id', children: detail.call_id },
                  {
                    key: 'customer',
                    label: '脱敏客户',
                    children: `${detail.masked_customer_name || '客户'} ${detail.masked_contact || ''}`,
                  },
                  {
                    key: 'scene',
                    label: '业务场景',
                    children: sceneLabels[detail.scene_code],
                  },
                  {
                    key: 'reason',
                    label: '转人工原因',
                    children: detail.request_reason || '-',
                  },
                  {
                    key: 'agent',
                    label: '接听坐席',
                    children: detail.human_agent_identity || '-',
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
                {detail.handoff_summary ||
                  detail.request_message ||
                  '摘要未生成'}
              </Paragraph>
              <List
                size="small"
                dataSource={detail.pending_items || []}
                renderItem={(item) => <List.Item>{item.text}</List.Item>}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>三方对话</Title>
              <List
                size="small"
                dataSource={detail.recent_dialogue || []}
                renderItem={(item) => (
                  <List.Item>
                    {item.speaker_type}：{item.text}
                  </List.Item>
                )}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>录音状态</Title>
              <Text>{String(detailData?.recording_status || '处理中')}</Text>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>快速话后结果</Title>
              <Text>
                {String(detailData?.after_call_work_summary || '尚未提交')}
              </Text>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>关联跟进任务</Title>
              <Text>{String(detailData?.follow_up_id || '无')}</Text>
            </section>
            <Collapse
              items={[
                {
                  key: 'model-prompt',
                  label: '模型与话术配置',
                  children: (
                    <Text type="secondary">
                      {String(
                        detailData?.model_prompt_snapshot || '无可展示配置快照',
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
