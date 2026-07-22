import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Descriptions, Drawer, List, Tag, Timeline, Typography } from 'antd';
import * as React from 'react';
import { useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  type FollowUpTaskDto,
  getAdminFollowUp,
  listAdminFollowUps,
} from '@/services/ruoyi/agent-console';
import {
  AdminMetricRow,
  formatDateTime,
  sceneLabels,
  sceneValueEnum,
  statusLabels,
  unwrapPage,
} from '../_shared';

const { Text, Title } = Typography;

const sourceLabels: Record<string, string> = {
  after_call_work: '接通后跟进',
  handoff_unanswered: '人工未接回访',
};

const unwrapDetail = (response: unknown): FollowUpTaskDto => {
  if (
    response &&
    typeof response === 'object' &&
    Reflect.get(response, 'data')
  ) {
    return Reflect.get(response, 'data') as FollowUpTaskDto;
  }
  return response as FollowUpTaskDto;
};

const FollowUpAdminPage = () => {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<FollowUpTaskDto>();

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
        dataIndex: 'scene_code',
        valueType: 'select',
        valueEnum: sceneValueEnum,
        hideInTable: true,
      },
      { title: '负责人', dataIndex: 'owner_agent_identity', hideInTable: true },
      {
        title: '任务状态',
        dataIndex: 'status',
        valueType: 'select',
        valueEnum: Object.fromEntries(
          ['pending', 'processing', 'completed', 'closed'].map((value) => [
            value,
            { text: statusLabels[value] },
          ]),
        ),
        render: (_, row) => <Tag>{statusLabels[row.status] || row.status}</Tag>,
      },
      {
        title: '客户预约时间',
        dataIndex: 'customer_callback_at_range',
        valueType: 'dateTimeRange',
        hideInTable: true,
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
          const latest = row.attempts?.at(-1);
          return latest
            ? `${latest.attempt_result} · ${formatDateTime(latest.contacted_at)}`
            : '-';
        },
      },
      {
        title: '操作',
        valueType: 'option',
        fixed: 'right',
        width: 90,
        render: (_, row) => (
          <TableActions
            maxVisible={1}
            actions={[
              {
                key: 'detail',
                label: '查看详情',
                onClick: async () =>
                  setDetail(unwrapDetail(await getAdminFollowUp(row.id))),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const detailData = detail as
    | (FollowUpTaskDto & Record<string, unknown>)
    | undefined;

  return (
    <PageContainer className="agent-admin-page" title="跟进任务管理">
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
            value: metrics.unanswered ?? 0,
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
        request={async ({ current, pageSize, ...filters }) => {
          const page = unwrapPage<FollowUpTaskDto>(
            await listAdminFollowUps({
              pageNum: current,
              pageSize,
              ...filters,
            }),
          );
          setMetrics(page.metrics || {});
          return { data: page.rows, total: page.total, success: true };
        }}
      />

      <Drawer
        title="跟进任务详情"
        open={Boolean(detail)}
        size={720}
        onClose={() => setDetail(undefined)}
      >
        {detail ? (
          <div className="agent-admin-detail">
            <section className="agent-admin-detail-section">
              <Title level={5}>客户与业务引用</Title>
              <Descriptions
                column={2}
                items={[
                  {
                    key: 'contact',
                    label: '脱敏客户',
                    children: detail.masked_contact || '-',
                  },
                  {
                    key: 'scene',
                    label: '业务场景',
                    children: sceneLabels[detail.scene_code],
                  },
                  {
                    key: 'business_type',
                    label: '业务类型',
                    children: detail.business_type || '-',
                  },
                  {
                    key: 'business_id',
                    label: '业务 ID',
                    children: detail.business_id || '-',
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
                    children: sourceLabels[detail.source_type],
                  },
                  {
                    key: 'call',
                    label: 'call_id',
                    children: detail.source_call_id,
                  },
                  {
                    key: 'handoff',
                    label: 'handoff_id',
                    children: detail.source_handoff_id,
                  },
                ]}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>任务摘要</Title>
              <Text>{detail.summary || detail.follow_up_reason}</Text>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>客户预约时间</Title>
              <Text>
                {detail.customer_callback_at
                  ? formatDateTime(detail.customer_callback_at)
                  : '未约定'}
              </Text>
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>历次联系尝试</Title>
              <Timeline
                items={(detail.attempts || []).map((attempt) => ({
                  children: `${formatDateTime(attempt.contacted_at)} · ${attempt.contact_channel} · ${attempt.attempt_result}`,
                }))}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>关联回拨通话</Title>
              <List
                size="small"
                dataSource={(detail.attempts || []).filter(
                  (attempt) => attempt.related_call_id,
                )}
                renderItem={(attempt) => (
                  <List.Item>
                    {attempt.related_call_id} · {attempt.attempt_result}
                  </List.Item>
                )}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>完成或关闭信息</Title>
              <Descriptions
                column={1}
                items={[
                  {
                    key: 'status',
                    label: '状态',
                    children: statusLabels[detail.status],
                  },
                  {
                    key: 'reason',
                    label: '关闭原因',
                    children: detail.closed_reason || '-',
                  },
                  {
                    key: 'remark',
                    label: '关闭说明',
                    children: detail.closed_remark || '-',
                  },
                ]}
              />
            </section>
            <section className="agent-admin-detail-section">
              <Title level={5}>操作审计</Title>
              <Text type="secondary">
                {String(detailData?.audit_summary || '暂无可展示审计摘要')}
              </Text>
            </section>
          </div>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default FollowUpAdminPage;
