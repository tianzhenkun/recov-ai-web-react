import {
  CloseOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RECOV_FILTER_CONTROL_STYLE,
  RECOV_LIST_COLUMN_WIDTH,
  renderRecovSingleLineText,
} from '@/modules/recov/components/RecovFilterControls';
import {
  RecovListPage,
  RecovListStack,
  RecovTableCard,
} from '@/modules/recov/components/RecovListLayout';
import {
  type FlowInstanceItem,
  type FlowInstanceQuery,
  pageFlowInstances,
} from '@/modules/recov/services/flowInstance';
import FlowTraceDrawer from '../components/FlowTraceDrawer';

const { Text, Title } = Typography;

type InstanceQueryFormValues = {
  flowStatus?: number | string;
  debtNumber?: string;
};

export type FlowWorkbenchMode = 'page' | 'overlay' | 'embedded';

type FlowWorkbenchProps = {
  mode?: FlowWorkbenchMode;
  onClose?: () => void;
};

const DEFAULT_PAGE_SIZE = 20;

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const toCleanString = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const flowRuntimeStatusMeta = (status: unknown, statusName?: string) => {
  const value = String(status ?? '').trim();
  const fallbackText = statusName || (value ? value : '-');

  if (!value) return { text: fallbackText, color: 'default' };
  if (value === '0') return { text: '待触发', color: 'processing' };
  if (value === '1') return { text: '等待回调', color: 'processing' };
  if (value === '2') return { text: '已完成', color: 'success' };
  if (value === '3') return { text: '节点失败', color: 'error' };
  if (value === '4') return { text: '人工终止', color: 'default' };
  if (value === '5') return { text: '已还款终止', color: 'default' };
  if (value === '6') return { text: '条件不满足终止', color: 'default' };
  return { text: fallbackText, color: 'default' };
};

const getFlowInstanceId = (record: FlowInstanceItem) =>
  toCleanString(record.instanceId ?? record.flowId ?? record.id);

const getInstanceRowKey = (record: FlowInstanceItem) =>
  String(
    getFlowInstanceId(record) ??
      record.debtRecordId ??
      record.debtNumber ??
      record.currentTaskId,
  );

const FlowWorkbench = ({ mode = 'page', onClose }: FlowWorkbenchProps) => {
  const [instanceForm] = Form.useForm<InstanceQueryFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();

  const [instanceQuery, setInstanceQuery] = useState<FlowInstanceQuery>({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [instanceRows, setInstanceRows] = useState<FlowInstanceItem[]>([]);
  const [instanceTotal, setInstanceTotal] = useState(0);
  const [instanceLoading, setInstanceLoading] = useState(false);

  const [traceOpen, setTraceOpen] = useState(false);
  const [traceInstanceId, setTraceInstanceId] = useState<string>('');

  const instanceQueryRef = useRef(instanceQuery);
  const instanceRequestSeqRef = useRef(0);

  useEffect(() => {
    instanceQueryRef.current = instanceQuery;
  }, [instanceQuery]);

  const loadFlowInstanceList = useCallback(
    async (params: FlowInstanceQuery, silent = false) => {
      instanceRequestSeqRef.current += 1;
      const seq = instanceRequestSeqRef.current;
      if (!silent) setInstanceLoading(true);
      try {
        const res = await pageFlowInstances(params);
        if (seq !== instanceRequestSeqRef.current) return;
        const pageData = (
          res.data as
            | {
                page?: {
                  rows?: FlowInstanceItem[];
                  total?: number | string;
                };
              }
            | undefined
        )?.page;
        setInstanceRows(pageData?.rows ?? res.rows ?? []);
        setInstanceTotal(toNumber(pageData?.total ?? res.total));
      } catch {
        if (seq === instanceRequestSeqRef.current) {
          setInstanceRows([]);
          setInstanceTotal(0);
          if (!silent) messageApi.error('流程实例列表加载失败，请稍后重试');
        }
      } finally {
        if (seq === instanceRequestSeqRef.current && !silent) {
          setInstanceLoading(false);
        }
      }
    },
    [messageApi],
  );

  const refreshInstanceList = useCallback(() => {
    void loadFlowInstanceList(instanceQueryRef.current, true);
  }, [loadFlowInstanceList]);

  useEffect(() => {
    void loadFlowInstanceList(instanceQuery);
  }, [instanceQuery, loadFlowInstanceList]);

  const handleInstanceSearch = () => {
    const values = instanceForm.getFieldsValue();
    setInstanceQuery({
      pageNum: 1,
      pageSize: instanceQuery.pageSize || DEFAULT_PAGE_SIZE,
      flowStatus: values.flowStatus,
      debtNumber: values.debtNumber,
    });
  };

  const handleInstanceReset = () => {
    instanceForm.resetFields();
    setInstanceQuery({
      pageNum: 1,
      pageSize: instanceQuery.pageSize || DEFAULT_PAGE_SIZE,
    });
  };

  const instanceColumns = useMemo<ColumnsType<FlowInstanceItem>>(
    () => [
      {
        title: '流程实例',
        dataIndex: 'instanceId',
        width: 190,
        ellipsis: true,
        render: (_value, record) => toText(getFlowInstanceId(record)),
      },
      {
        title: '资产编号',
        dataIndex: 'debtNumber',
        width: RECOV_LIST_COLUMN_WIDTH.debtNumber,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '业主姓名',
        dataIndex: 'debtorName',
        width: 140,
        ellipsis: true,
        render: (value) => <Text strong>{toText(value)}</Text>,
      },
      {
        title: '所属城市',
        dataIndex: 'city',
        width: RECOV_LIST_COLUMN_WIDTH.city,
        render: toText,
      },
      {
        title: '所属项目',
        dataIndex: 'organization',
        width: RECOV_LIST_COLUMN_WIDTH.organization,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '流程状态',
        dataIndex: 'flowStatus',
        width: 130,
        align: 'center',
        render: (value, record) => {
          const meta = flowRuntimeStatusMeta(value, record.flowStatusName);
          return <Tag color={meta.color}>{meta.text}</Tag>;
        },
      },
      {
        title: '当前节点',
        dataIndex: 'currentIdentity',
        width: 150,
        ellipsis: true,
        render: (value, record) =>
          toText(value || record.currentNodeCode || record.currentStepId),
      },
      {
        title: '下次触发',
        dataIndex: 'wakeUpTime',
        width: 170,
        render: (value, record) =>
          String(record.flowStatus ?? '').trim() === '0' ? (
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              {toText(value)}
            </Text>
          ) : (
            '-'
          ),
      },
      {
        title: '步骤进度',
        dataIndex: 'completedStepCount',
        width: 120,
        align: 'center',
        render: (value, record) =>
          `${toText(value)}/${toText(record.totalStepCount)}`,
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        width: 170,
        render: (value, record) => (
          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            {toText(
              value ||
                record.finishTime ||
                record.startTime ||
                record.createTime,
            )}
          </Text>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        align: 'left',
        render: (_value, record) => {
          const instanceId = getFlowInstanceId(record);
          return instanceId ? (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setTraceInstanceId(instanceId);
                setTraceOpen(true);
              }}
            >
              查看详情
            </Button>
          ) : (
            '-'
          );
        },
      },
    ],
    [],
  );

  const workbenchBody = (
    <>
      {messageContextHolder}
      <RecovListStack>
        <RecovTableCard title="流程实例">
          <Form form={instanceForm} className="recov-table-toolbar">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Space wrap size={12}>
                <Form.Item name="debtNumber" noStyle>
                  <Input
                    allowClear
                    placeholder="资产编号"
                    style={RECOV_FILTER_CONTROL_STYLE}
                  />
                </Form.Item>
                <Form.Item name="flowStatus" noStyle>
                  <Select
                    allowClear
                    placeholder="流程状态"
                    style={{ width: 150 }}
                    options={[
                      { label: '待触发', value: 0 },
                      { label: '等待回调', value: 1 },
                      { label: '已完成', value: 2 },
                      { label: '节点失败', value: 3 },
                      { label: '人工终止', value: 4 },
                      { label: '已还款终止', value: 5 },
                      { label: '条件不满足终止', value: 6 },
                    ]}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleInstanceSearch}
                >
                  查询
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleInstanceReset}>
                  重置
                </Button>
              </Space>
            </div>
          </Form>

          <Table<FlowInstanceItem>
            bordered
            className="recov-stable-pagination-table"
            columns={instanceColumns}
            dataSource={instanceRows}
            loading={instanceLoading}
            rowKey={getInstanceRowKey}
            scroll={{ x: 1620 }}
            locale={{
              emptyText: <Empty description="暂无流程实例" />,
            }}
            pagination={{
              current: instanceQuery.pageNum || 1,
              pageSize: instanceQuery.pageSize || DEFAULT_PAGE_SIZE,
              total: instanceTotal,
              showSizeChanger: true,
              showTotal: (nextTotal) => `共 ${nextTotal} 条`,
              onChange: (pageNum, pageSize) => {
                setInstanceQuery({
                  ...instanceQuery,
                  pageNum,
                  pageSize,
                });
              },
            }}
          />
        </RecovTableCard>
      </RecovListStack>

      <FlowTraceDrawer
        open={traceOpen}
        instanceId={traceInstanceId}
        onClose={() => setTraceOpen(false)}
        onChanged={refreshInstanceList}
      />
    </>
  );

  if (mode === 'embedded') {
    return workbenchBody;
  }

  if (mode === 'overlay') {
    return (
      <Drawer
        closeIcon={null}
        closable={false}
        destroyOnHidden
        open
        placement="right"
        size="100vw"
        title={null}
        styles={{
          body: {
            height: '100vh',
            overflow: 'hidden',
            padding: 0,
          },
          header: {
            display: 'none',
          },
        }}
        onClose={onClose}
      >
        <div className="flex h-full min-h-0 flex-col bg-[#f5f7fb]">
          <div className="flex shrink-0 items-center justify-between border-0 border-b border-solid border-[rgba(5,5,5,0.06)] bg-[rgba(255,255,255,0.92)] px-6 py-4 backdrop-blur">
            <div className="min-w-0">
              <Title level={4} style={{ margin: 0 }}>
                催收流程
              </Title>
              <Text type="secondary">
                查看流程批量发起、批次进度和实例运行明细。
              </Text>
            </div>
            <Button icon={<CloseOutlined />} onClick={onClose} type="text">
              关闭
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
            {workbenchBody}
          </div>
        </div>
      </Drawer>
    );
  }

  return <RecovListPage title="催收流程">{workbenchBody}</RecovListPage>;
};

export default FlowWorkbench;
