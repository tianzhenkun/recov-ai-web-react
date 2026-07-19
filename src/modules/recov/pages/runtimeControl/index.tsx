import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import type { InputNumberProps, TableColumnsType } from 'antd';
import {
  Alert,
  Button,
  Input,
  InputNumber,
  Modal,
  message,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  theme,
} from 'antd';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type FlowNodeControl,
  type FlowOutboxControl,
  type FlowRuntimeControl,
  type FlowSchedulerControl,
  getRecovConf,
  type NodeRuntimeControl,
  type RecovConfKey,
  updateRecovConf,
} from '@/modules/recov/services/recov-conf';

type ConfigMeta = {
  confName: string;
  remark: string;
  version: number | null;
  loading: boolean;
  saving: boolean;
  loadError?: string;
};

type NodeRow = {
  nodeCode: string;
  nodeName: string;
  control: NodeRuntimeControl;
};

const DEFAULT_RUNTIME: FlowRuntimeControl = {
  flowEnabled: true,
  disabledRequeueSeconds: 300,
};

const DEFAULT_SCHEDULER: FlowSchedulerControl = {
  enabled: true,
  dispatchBatchSize: 100,
  dispatchIntervalSeconds: 10,
};

const DEFAULT_OUTBOX: FlowOutboxControl = {
  triggerDispatchEnabled: true,
  callbackDispatchEnabled: true,
  dispatchBatchSize: 50,
  dispatchIntervalSeconds: 5,
};

const DEFAULT_NODE: NodeRuntimeControl = {
  enabled: true,
  maxInFlight: 20,
  ratePerMinute: 120,
  busyRetrySeconds: 60,
  permitTtlSeconds: 7200,
};

const SecondsInput = ({
  className,
  style,
  ...props
}: InputNumberProps<number>) => (
  <Space.Compact block className={className}>
    <InputNumber {...props} style={{ ...style, flex: 1, minWidth: 0 }} />
    <Input
      aria-label="时间单位"
      value="秒"
      readOnly
      tabIndex={-1}
      style={{ width: 48, textAlign: 'center', pointerEvents: 'none' }}
    />
  </Space.Compact>
);

const NODE_CODES = [
  'ai_call',
  'corp_letter',
  'law_letter',
  'filing_material_submit',
] as const;

const NODE_NAMES: Record<string, string> = {
  default: '默认节点',
  ai_call: '智能外呼',
  corp_letter: '企业催收函',
  law_letter: '律师催收函',
  filing_material_submit: '发送申请诉讼截图',
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const stableStringify = (value: unknown) => JSON.stringify(value);

const createMeta = (confName: string): ConfigMeta => ({
  confName,
  remark: '',
  version: null,
  loading: false,
  saving: false,
  loadError: undefined,
});

const createDefaultNodes = (): Record<string, NodeRuntimeControl> => ({
  ai_call: {
    enabled: true,
    maxInFlight: 100,
    ratePerMinute: 60,
    busyRetrySeconds: 60,
    permitTtlSeconds: 7200,
  },
  corp_letter: {
    enabled: true,
    maxInFlight: 20,
    ratePerMinute: 120,
    busyRetrySeconds: 120,
    permitTtlSeconds: 3600,
  },
  law_letter: {
    enabled: true,
    maxInFlight: 20,
    ratePerMinute: 120,
    busyRetrySeconds: 120,
    permitTtlSeconds: 3600,
  },
  filing_material_submit: {
    enabled: true,
    maxInFlight: 5,
    ratePerMinute: 20,
    busyRetrySeconds: 300,
    permitTtlSeconds: 7200,
  },
});

const createDefaultNodeControl = (): FlowNodeControl => ({
  default: clone(DEFAULT_NODE),
  nodes: createDefaultNodes(),
});

const toNumber = (value: number | string | null | undefined) =>
  Number(value ?? 0);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const parseConfValue = <T,>(raw: T | string | undefined, fallback: T): T => {
  if (!raw) return clone(fallback);

  if (typeof raw === 'string') {
    try {
      return {
        ...clone(fallback),
        ...(JSON.parse(raw) as Partial<T>),
      };
    } catch {
      return clone(fallback);
    }
  }

  return {
    ...clone(fallback),
    ...raw,
  };
};

const normalizeNodeControl = (
  raw: FlowNodeControl | string | undefined,
): FlowNodeControl => {
  const parsed = parseConfValue(raw, createDefaultNodeControl());
  const nodes = createDefaultNodes();

  Object.entries(parsed.nodes || {}).forEach(([nodeCode, control]) => {
    nodes[nodeCode] = {
      ...clone(DEFAULT_NODE),
      ...control,
    };
  });

  return {
    default: {
      ...clone(DEFAULT_NODE),
      ...(parsed.default || {}),
    },
    nodes,
  };
};

const assertRange = (
  value: number,
  min: number,
  max: number,
  label: string,
) => {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}必须在 ${min}-${max} 之间`);
  }
};

const ConfigStateTag = ({
  dirty,
  meta,
  primaryIconStyle,
  primaryTagStyle,
}: {
  dirty: boolean;
  meta: ConfigMeta;
  primaryIconStyle: CSSProperties;
  primaryTagStyle: CSSProperties;
}) => {
  if (meta.loadError) {
    return (
      <Tooltip title={meta.loadError}>
        <Tag color="red" icon={<ExclamationCircleOutlined />}>
          加载失败
        </Tag>
      </Tooltip>
    );
  }

  if (dirty) {
    return <Tag color="warning">未保存</Tag>;
  }

  return (
    <Tooltip
      title={`配置版本号：${meta.version ?? '-'}。保存时用于校验配置是否已被他人更新，避免覆盖新配置。`}
    >
      <Tag
        icon={<InfoCircleOutlined style={primaryIconStyle} />}
        style={primaryTagStyle}
      >
        配置版本 {meta.version ?? '-'}
      </Tag>
    </Tooltip>
  );
};

const SectionExtra = ({
  dirty,
  meta,
  onSave,
  primaryIconStyle,
  primaryTagStyle,
}: {
  dirty: boolean;
  meta: ConfigMeta;
  onSave: () => void;
  primaryIconStyle: CSSProperties;
  primaryTagStyle: CSSProperties;
}) => (
  <Space size={8}>
    <ConfigStateTag
      dirty={dirty}
      meta={meta}
      primaryIconStyle={primaryIconStyle}
      primaryTagStyle={primaryTagStyle}
    />
    <Button
      type="primary"
      disabled={!dirty || meta.version === null}
      loading={meta.saving}
      onClick={onSave}
    >
      保存
    </Button>
  </Space>
);

const RecovRuntimeControlPage = () => {
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [runtimeControl, setRuntimeControl] =
    useState<FlowRuntimeControl>(DEFAULT_RUNTIME);
  const [schedulerControl, setSchedulerControl] =
    useState<FlowSchedulerControl>(DEFAULT_SCHEDULER);
  const [outboxControl, setOutboxControl] =
    useState<FlowOutboxControl>(DEFAULT_OUTBOX);
  const [nodeControl, setNodeControl] = useState<FlowNodeControl>(
    createDefaultNodeControl,
  );

  const [runtimeMeta, setRuntimeMeta] = useState<ConfigMeta>(() =>
    createMeta('流程运行总控'),
  );
  const [schedulerMeta, setSchedulerMeta] = useState<ConfigMeta>(() =>
    createMeta('流程调度控制'),
  );
  const [outboxMeta, setOutboxMeta] = useState<ConfigMeta>(() =>
    createMeta('流程消息发送控制'),
  );
  const [nodeMeta, setNodeMeta] = useState<ConfigMeta>(() =>
    createMeta('流程节点运行控制'),
  );

  const [runtimeSnapshot, setRuntimeSnapshot] = useState(() =>
    stableStringify(DEFAULT_RUNTIME),
  );
  const [schedulerSnapshot, setSchedulerSnapshot] = useState(() =>
    stableStringify(DEFAULT_SCHEDULER),
  );
  const [outboxSnapshot, setOutboxSnapshot] = useState(() =>
    stableStringify(DEFAULT_OUTBOX),
  );
  const [nodeSnapshot, setNodeSnapshot] = useState(() =>
    stableStringify(createDefaultNodeControl()),
  );

  const runtimeDirty = stableStringify(runtimeControl) !== runtimeSnapshot;
  const schedulerDirty =
    stableStringify(schedulerControl) !== schedulerSnapshot;
  const outboxDirty = stableStringify(outboxControl) !== outboxSnapshot;
  const nodeDirty = stableStringify(nodeControl) !== nodeSnapshot;
  const loadingAll =
    runtimeMeta.loading ||
    schedulerMeta.loading ||
    outboxMeta.loading ||
    nodeMeta.loading;
  const themeLinkedAlertStyle = useMemo<CSSProperties>(
    () => ({
      background: token.colorPrimaryBg,
      borderColor: token.colorPrimaryBorder,
      color: token.colorText,
    }),
    [token.colorPrimaryBg, token.colorPrimaryBorder, token.colorText],
  );
  const themeLinkedTagStyle = useMemo<CSSProperties>(
    () => ({
      background: token.colorPrimaryBg,
      borderColor: token.colorPrimaryBorder,
      color: token.colorPrimary,
    }),
    [token.colorPrimary, token.colorPrimaryBg, token.colorPrimaryBorder],
  );
  const themeLinkedIconStyle = useMemo<CSSProperties>(
    () => ({
      color: token.colorPrimary,
    }),
    [token.colorPrimary],
  );

  const nodeRows = useMemo<NodeRow[]>(
    () => [
      {
        nodeCode: 'default',
        nodeName: NODE_NAMES.default,
        control: nodeControl.default,
      },
      ...NODE_CODES.map((nodeCode) => ({
        nodeCode,
        nodeName: NODE_NAMES[nodeCode],
        control: nodeControl.nodes[nodeCode] || clone(DEFAULT_NODE),
      })),
    ],
    [nodeControl],
  );

  const loadConfig = useCallback(
    async <T,>(
      confKey: RecovConfKey,
      fallback: T,
      setValue: (value: T) => void,
      setMeta: React.Dispatch<React.SetStateAction<ConfigMeta>>,
      setSnapshot: (value: string) => void,
      normalize: (raw: T | string | undefined) => T = (raw) =>
        parseConfValue(raw, fallback),
    ) => {
      setMeta((prev) => ({
        ...prev,
        loading: true,
        loadError: undefined,
      }));

      try {
        const res = await getRecovConf<T>(confKey);
        const data = res.data;
        const next = normalize(data?.confValue as T | string | undefined);
        const version = Number(data?.version);

        setValue(next);
        setSnapshot(stableStringify(next));
        setMeta((prev) => ({
          ...prev,
          confName: data?.confName || prev.confName,
          remark: data?.remark || '',
          version: Number.isFinite(version) ? version : null,
          loading: false,
          loadError: undefined,
        }));
        return true;
      } catch (error) {
        const next = clone(fallback);
        setValue(next);
        setSnapshot(stableStringify(next));
        setMeta((prev) => ({
          ...prev,
          version: null,
          loading: false,
          loadError: getErrorMessage(error, '配置加载失败'),
        }));
        return false;
      }
    },
    [],
  );

  const fetchAll = useCallback(async () => {
    const results = await Promise.all([
      loadConfig(
        'flow.runtime_control',
        DEFAULT_RUNTIME,
        setRuntimeControl,
        setRuntimeMeta,
        setRuntimeSnapshot,
      ),
      loadConfig(
        'flow.scheduler_control',
        DEFAULT_SCHEDULER,
        setSchedulerControl,
        setSchedulerMeta,
        setSchedulerSnapshot,
      ),
      loadConfig(
        'flow.outbox_control',
        DEFAULT_OUTBOX,
        setOutboxControl,
        setOutboxMeta,
        setOutboxSnapshot,
      ),
      loadConfig(
        'flow.node_control',
        createDefaultNodeControl(),
        setNodeControl,
        setNodeMeta,
        setNodeSnapshot,
        normalizeNodeControl,
      ),
    ]);

    if (results.some((success) => !success)) {
      messageApi.warning('部分配置加载失败，已展示安全默认值');
    }
  }, [loadConfig, messageApi]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const saveConfig = async <T,>(
    confKey: RecovConfKey,
    value: T,
    meta: ConfigMeta,
    setMeta: React.Dispatch<React.SetStateAction<ConfigMeta>>,
    setSnapshot: (value: string) => void,
    validate: () => void,
  ) => {
    if (meta.version === null) {
      messageApi.warning('配置未加载成功，不能保存，请刷新后重试');
      return;
    }

    try {
      validate();
    } catch (error) {
      messageApi.warning(getErrorMessage(error, '配置值不合法'));
      return;
    }

    setMeta((prev) => ({ ...prev, saving: true }));
    try {
      const res = await updateRecovConf(confKey, {
        confValue: clone(value),
        version: meta.version,
        remark: meta.remark,
      });
      const nextVersion = Number(res.data?.version);
      setMeta((prev) => ({
        ...prev,
        version: Number.isFinite(nextVersion) ? nextVersion : prev.version,
        remark: res.data?.remark || prev.remark,
        saving: false,
        loadError: undefined,
      }));
      setSnapshot(stableStringify(value));
      messageApi.success('配置保存成功');
    } catch (error) {
      setMeta((prev) => ({ ...prev, saving: false }));
      messageApi.error(getErrorMessage(error, '配置保存失败'));
    }
  };

  const saveRuntime = () =>
    void saveConfig(
      'flow.runtime_control',
      runtimeControl,
      runtimeMeta,
      setRuntimeMeta,
      setRuntimeSnapshot,
      () => {
        assertRange(
          runtimeControl.disabledRequeueSeconds,
          30,
          3600,
          '关闭重投间隔',
        );
      },
    );

  const saveScheduler = () =>
    void saveConfig(
      'flow.scheduler_control',
      schedulerControl,
      schedulerMeta,
      setSchedulerMeta,
      setSchedulerSnapshot,
      () => {
        assertRange(schedulerControl.dispatchBatchSize, 1, 500, '每轮扫描数量');
        assertRange(
          schedulerControl.dispatchIntervalSeconds,
          2,
          60,
          '扫描间隔',
        );
      },
    );

  const confirmDisableCallback = () =>
    new Promise<boolean>((resolve) => {
      modalApi.confirm({
        title: '确认关闭 CALLBACK 发送',
        content:
          '关闭后会阻断已执行节点的状态回传，只适合作为完全冻结消息流的紧急开关。',
        okText: '确认关闭',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

  const saveOutbox = async () => {
    const original = JSON.parse(
      outboxSnapshot || '{}',
    ) as Partial<FlowOutboxControl>;
    if (
      original.callbackDispatchEnabled !== false &&
      outboxControl.callbackDispatchEnabled === false
    ) {
      const confirmed = await confirmDisableCallback();
      if (!confirmed) return;
    }

    await saveConfig(
      'flow.outbox_control',
      outboxControl,
      outboxMeta,
      setOutboxMeta,
      setOutboxSnapshot,
      () => {
        assertRange(outboxControl.dispatchBatchSize, 1, 500, '每轮发送数量');
        assertRange(outboxControl.dispatchIntervalSeconds, 2, 60, '发送间隔');
      },
    );
  };

  const saveNodeControl = () =>
    void saveConfig(
      'flow.node_control',
      nodeControl,
      nodeMeta,
      setNodeMeta,
      setNodeSnapshot,
      () => {
        nodeRows.forEach((row) => {
          assertRange(
            row.control.maxInFlight,
            1,
            500,
            `${row.nodeName} 最大进行中`,
          );
          assertRange(
            row.control.ratePerMinute,
            1,
            5000,
            `${row.nodeName} 每分钟速率`,
          );
          assertRange(
            row.control.busyRetrySeconds,
            10,
            3600,
            `${row.nodeName} 繁忙重试秒数`,
          );
          assertRange(
            row.control.permitTtlSeconds,
            300,
            86400,
            `${row.nodeName} 许可 TTL 秒数`,
          );
        });
      },
    );

  const updateNodeEnabled = (nodeCode: string, enabled: boolean) => {
    setNodeControl((prev) => {
      const next = clone(prev);
      if (nodeCode === 'default') {
        next.default.enabled = enabled;
        return next;
      }
      next.nodes[nodeCode] = {
        ...(next.nodes[nodeCode] || clone(DEFAULT_NODE)),
        enabled,
      };
      return next;
    });
  };

  const updateNodeNumber = (
    nodeCode: string,
    field: Exclude<keyof NodeRuntimeControl, 'enabled'>,
    value: number | string | null,
  ) => {
    setNodeControl((prev) => {
      const next = clone(prev);
      if (nodeCode === 'default') {
        next.default[field] = toNumber(value);
        return next;
      }
      next.nodes[nodeCode] = {
        ...(next.nodes[nodeCode] || clone(DEFAULT_NODE)),
        [field]: toNumber(value),
      };
      return next;
    });
  };

  const nodeColumns: TableColumnsType<NodeRow> = [
    {
      title: '节点',
      dataIndex: 'nodeName',
      width: 184,
      fixed: 'left',
      render: (_, row) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-900">
            {row.nodeName}
          </div>
          <div className="truncate text-xs text-slate-500">{row.nodeCode}</div>
        </div>
      ),
    },
    {
      title: '启用',
      dataIndex: ['control', 'enabled'],
      align: 'center',
      width: 96,
      render: (_, row) => (
        <Switch
          checked={row.control.enabled}
          onChange={(checked) => updateNodeEnabled(row.nodeCode, checked)}
        />
      ),
    },
    {
      title: '最大进行中',
      dataIndex: ['control', 'maxInFlight'],
      width: 152,
      render: (_, row) => (
        <InputNumber
          min={1}
          max={500}
          value={row.control.maxInFlight}
          className="w-full"
          onChange={(value) =>
            updateNodeNumber(row.nodeCode, 'maxInFlight', value)
          }
        />
      ),
    },
    {
      title: '每分钟速率',
      dataIndex: ['control', 'ratePerMinute'],
      width: 152,
      render: (_, row) => (
        <InputNumber
          min={1}
          max={5000}
          value={row.control.ratePerMinute}
          className="w-full"
          onChange={(value) =>
            updateNodeNumber(row.nodeCode, 'ratePerMinute', value)
          }
        />
      ),
    },
    {
      title: '繁忙重试秒数',
      dataIndex: ['control', 'busyRetrySeconds'],
      width: 164,
      render: (_, row) => (
        <InputNumber
          min={10}
          max={3600}
          value={row.control.busyRetrySeconds}
          className="w-full"
          onChange={(value) =>
            updateNodeNumber(row.nodeCode, 'busyRetrySeconds', value)
          }
        />
      ),
    },
    {
      title: '许可 TTL 秒数',
      dataIndex: ['control', 'permitTtlSeconds'],
      width: 164,
      render: (_, row) => (
        <InputNumber
          min={300}
          max={86400}
          value={row.control.permitTtlSeconds}
          className="w-full"
          onChange={(value) =>
            updateNodeNumber(row.nodeCode, 'permitTtlSeconds', value)
          }
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="流程运行控制"
      breadcrumbRender={false}
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loadingAll}
          onClick={() => void fetchAll()}
        >
          刷新
        </Button>,
      ]}
    >
      {messageContextHolder}
      {modalContextHolder}

      <Alert
        showIcon
        icon={<InfoCircleOutlined style={themeLinkedIconStyle} />}
        type="info"
        className="mb-4"
        style={themeLinkedAlertStyle}
        title="配置保存后将在约 3-5 秒内影响新调度和新消费，已在执行中的节点不会被强制中断。"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ProCard
          title="流程总控"
          extra={
            <SectionExtra
              dirty={runtimeDirty}
              meta={runtimeMeta}
              onSave={saveRuntime}
              primaryIconStyle={themeLinkedIconStyle}
              primaryTagStyle={themeLinkedTagStyle}
            />
          }
        >
          <Spin spinning={runtimeMeta.loading}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">
                  流程总开关
                </div>
                <Switch
                  checked={runtimeControl.flowEnabled}
                  checkedChildren="开启"
                  unCheckedChildren="暂停"
                  onChange={(checked) =>
                    setRuntimeControl((prev) => ({
                      ...prev,
                      flowEnabled: checked,
                    }))
                  }
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">
                  关闭重投间隔
                </div>
                <SecondsInput
                  min={30}
                  max={3600}
                  step={30}
                  value={runtimeControl.disabledRequeueSeconds}
                  className="w-full"
                  onChange={(value) =>
                    setRuntimeControl((prev) => ({
                      ...prev,
                      disabledRequeueSeconds: toNumber(value),
                    }))
                  }
                />
              </div>
            </div>
          </Spin>
        </ProCard>

        <ProCard
          title="调度扫描"
          extra={
            <SectionExtra
              dirty={schedulerDirty}
              meta={schedulerMeta}
              onSave={saveScheduler}
              primaryIconStyle={themeLinkedIconStyle}
              primaryTagStyle={themeLinkedTagStyle}
            />
          }
        >
          <Spin spinning={schedulerMeta.loading}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">
                  扫描开关
                </div>
                <Switch
                  checked={schedulerControl.enabled}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                  onChange={(checked) =>
                    setSchedulerControl((prev) => ({
                      ...prev,
                      enabled: checked,
                    }))
                  }
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">
                  每轮扫描数量
                </div>
                <InputNumber
                  min={1}
                  max={500}
                  value={schedulerControl.dispatchBatchSize}
                  className="w-full"
                  onChange={(value) =>
                    setSchedulerControl((prev) => ({
                      ...prev,
                      dispatchBatchSize: toNumber(value),
                    }))
                  }
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">
                  扫描间隔
                </div>
                <SecondsInput
                  min={2}
                  max={60}
                  value={schedulerControl.dispatchIntervalSeconds}
                  className="w-full"
                  onChange={(value) =>
                    setSchedulerControl((prev) => ({
                      ...prev,
                      dispatchIntervalSeconds: toNumber(value),
                    }))
                  }
                />
              </div>
            </div>
          </Spin>
        </ProCard>
      </div>

      <ProCard
        className="mt-4"
        title="消息发送"
        extra={
          <SectionExtra
            dirty={outboxDirty}
            meta={outboxMeta}
            onSave={() => void saveOutbox()}
            primaryIconStyle={themeLinkedIconStyle}
            primaryTagStyle={themeLinkedTagStyle}
          />
        }
      >
        <Spin spinning={outboxMeta.loading}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">
                TRIGGER 发送
              </div>
              <Switch
                checked={outboxControl.triggerDispatchEnabled}
                checkedChildren="开启"
                unCheckedChildren="关闭"
                onChange={(checked) =>
                  setOutboxControl((prev) => ({
                    ...prev,
                    triggerDispatchEnabled: checked,
                  }))
                }
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">
                CALLBACK 发送
              </div>
              <Switch
                checked={outboxControl.callbackDispatchEnabled}
                checkedChildren="开启"
                unCheckedChildren="关闭"
                onChange={(checked) =>
                  setOutboxControl((prev) => ({
                    ...prev,
                    callbackDispatchEnabled: checked,
                  }))
                }
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">
                每轮发送数量
              </div>
              <InputNumber
                min={1}
                max={500}
                value={outboxControl.dispatchBatchSize}
                className="w-full"
                onChange={(value) =>
                  setOutboxControl((prev) => ({
                    ...prev,
                    dispatchBatchSize: toNumber(value),
                  }))
                }
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">
                发送间隔
              </div>
              <SecondsInput
                min={2}
                max={60}
                value={outboxControl.dispatchIntervalSeconds}
                className="w-full"
                onChange={(value) =>
                  setOutboxControl((prev) => ({
                    ...prev,
                    dispatchIntervalSeconds: toNumber(value),
                  }))
                }
              />
            </div>
          </div>
        </Spin>
      </ProCard>

      <ProCard
        className="mt-4"
        title="节点控制"
        extra={
          <SectionExtra
            dirty={nodeDirty}
            meta={nodeMeta}
            onSave={saveNodeControl}
            primaryIconStyle={themeLinkedIconStyle}
            primaryTagStyle={themeLinkedTagStyle}
          />
        }
      >
        <Table<NodeRow>
          rowKey="nodeCode"
          size="middle"
          bordered
          pagination={false}
          loading={nodeMeta.loading}
          columns={nodeColumns}
          dataSource={nodeRows}
          scroll={{ x: 912 }}
        />
      </ProCard>
    </PageContainer>
  );
};

export default RecovRuntimeControlPage;
