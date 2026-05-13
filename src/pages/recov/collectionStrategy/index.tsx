import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popover,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type CallConfigVO,
  type FlowTemplateVO,
  listCurrentFlowTemplates,
  listFlowNodeTypes,
  listPersonaCallConfigs,
  type UpdateCallConfigDTO,
  updatePersonaCallConfig,
} from '@/services/ruoyi/collection-strategy';
import { listPersona, type PersonaItem } from '@/services/ruoyi/persona';
import {
  buildDefaultSteps,
  buildInitialFlowModuleMap,
  type FlowModuleMeta,
  failStrategyLabelMap,
  getFlowIconComponent,
  getFlowModuleMeta,
  getNodeIdentityDisplayText,
  isSamePersonaId,
  normalizeSteps,
  type PreviewStep,
  resolveFlowPreviewColumns,
  skipStrategyLabelMap,
  upsertNodeTypeMeta,
} from './_shared';

const { Title, Text } = Typography;

type PersonaId = string | number;

type CallConfigForm = {
  id: number | null;
  strategyCore: string;
  personaId: PersonaId | null;
};

const emptyCallConfigForm: CallConfigForm = {
  id: null,
  strategyCore: '',
  personaId: null,
};

const useFlowPreviewColumns = (
  containerRef: React.RefObject<HTMLDivElement | null>,
): number => {
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;
    setColumns(resolveFlowPreviewColumns(target.clientWidth));
    const observer = new ResizeObserver(([entry]) => {
      setColumns(resolveFlowPreviewColumns(entry.contentRect.width));
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [containerRef]);

  return columns;
};

const CollectionStrategyPage = () => {
  const [searchParams] = useSearchParams();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [loading, setLoading] = useState(false);
  const [personaList, setPersonaList] = useState<PersonaItem[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<PersonaId | null>(
    null,
  );
  const [flowModuleMap, setFlowModuleMap] = useState<
    Record<string, FlowModuleMeta>
  >(() => buildInitialFlowModuleMap());

  const [, setCurrentTemplate] = useState<FlowTemplateVO | null>(null);
  const [previewSteps, setPreviewSteps] = useState<PreviewStep[]>([]);

  const [callConfigList, setCallConfigList] = useState<CallConfigVO[]>([]);
  const [callConfigLoading, setCallConfigLoading] = useState(false);
  const [callConfigSaving, setCallConfigSaving] = useState(false);
  const [callConfigForm, setCallConfigForm] =
    useState<CallConfigForm>(emptyCallConfigForm);
  const [callConfigOriginal, setCallConfigOriginal] =
    useState<CallConfigForm>(emptyCallConfigForm);

  const personaScrollRef = useRef<HTMLDivElement | null>(null);
  const flowPreviewBodyRef = useRef<HTMLDivElement | null>(null);
  const flowPreviewColumns = useFlowPreviewColumns(flowPreviewBodyRef);

  const loadFlowRequestSeqRef = useRef(0);
  const loadCallConfigRequestSeqRef = useRef(0);

  const activePersona = useMemo(
    () =>
      personaList.find((item) => isSamePersonaId(item.id, activePersonaId)) ??
      null,
    [activePersonaId, personaList],
  );

  const hasCallConfigChanges = useMemo(() => {
    return (
      callConfigForm.id !== callConfigOriginal.id ||
      callConfigForm.strategyCore !== callConfigOriginal.strategyCore ||
      callConfigForm.personaId !== callConfigOriginal.personaId
    );
  }, [callConfigForm, callConfigOriginal]);

  const flowPreviewRows = useMemo<PreviewStep[][]>(() => {
    const columns = Math.max(1, flowPreviewColumns);
    const rows: PreviewStep[][] = [];
    previewSteps.forEach((step, idx) => {
      const rowIdx = Math.floor(idx / columns);
      if (!rows[rowIdx]) rows[rowIdx] = [];
      rows[rowIdx].push(step);
    });
    return rows;
  }, [flowPreviewColumns, previewSteps]);

  const callConfigTabKey = useMemo(
    () => (callConfigForm.id == null ? '' : String(callConfigForm.id)),
    [callConfigForm.id],
  );

  const fillCallConfigForm = useCallback(
    (config: CallConfigVO | null, personaId: PersonaId | null) => {
      const next: CallConfigForm = config
        ? {
            id: config.id,
            strategyCore: config.strategyCore ?? '',
            personaId: config.personaId ?? personaId,
          }
        : { id: null, strategyCore: '', personaId };
      setCallConfigForm(next);
      setCallConfigOriginal(next);
    },
    [],
  );

  const confirmDiscardCallConfigChanges = useCallback((): Promise<boolean> => {
    if (!hasCallConfigChanges) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      modalApi.confirm({
        title: '未保存修改',
        content:
          '当前外呼策略有未保存修改，切换后会丢弃这些改动。是否继续切换？',
        okText: '继续切换',
        cancelText: '留在当前',
        autoFocusButton: 'cancel',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, [hasCallConfigChanges, modalApi]);

  const loadPersonaFlow = useCallback(
    async (
      personaId: PersonaId,
      currentFlowModuleMap: Record<string, FlowModuleMeta>,
    ) => {
      loadFlowRequestSeqRef.current += 1;
      const requestSeq = loadFlowRequestSeqRef.current;
      try {
        const res = await listCurrentFlowTemplates({
          pageNum: 1,
          pageSize: 1,
          personaId: personaId as number,
        });
        if (requestSeq !== loadFlowRequestSeqRef.current) return;
        const rows = Array.isArray(res.rows) ? res.rows : [];
        const template = rows[0] ?? null;
        setCurrentTemplate(template);
        setPreviewSteps(
          template
            ? normalizeSteps(currentFlowModuleMap, template.steps)
            : buildDefaultSteps(currentFlowModuleMap),
        );
      } catch (error) {
        if (requestSeq !== loadFlowRequestSeqRef.current) return;
        console.error('加载策略模板失败', error);
        setCurrentTemplate(null);
        setPreviewSteps(buildDefaultSteps(currentFlowModuleMap));
      }
    },
    [],
  );

  const loadPersonaCallConfigs = useCallback(
    async (personaId: PersonaId) => {
      loadCallConfigRequestSeqRef.current += 1;
      const requestSeq = loadCallConfigRequestSeqRef.current;
      setCallConfigLoading(true);
      try {
        const res = await listPersonaCallConfigs(personaId as number);
        if (requestSeq !== loadCallConfigRequestSeqRef.current) return;
        const list = Array.isArray(res.data) ? res.data : [];
        const normalized = list.map((config) => ({
          ...config,
          identityName: config.identityName ?? '',
          strategyCore: config.strategyCore ?? '',
          personaId: (config.personaId ?? personaId ?? 0) as number,
        }));
        setCallConfigList(normalized);
        fillCallConfigForm(normalized[0] ?? null, personaId);
      } catch (error) {
        if (requestSeq !== loadCallConfigRequestSeqRef.current) return;
        console.error('加载外呼策略配置失败', error);
        setCallConfigList([]);
        fillCallConfigForm(null, personaId);
      } finally {
        if (requestSeq === loadCallConfigRequestSeqRef.current) {
          setCallConfigLoading(false);
        }
      }
    },
    [fillCallConfigForm],
  );

  const loadNodeTypes = useCallback(async () => {
    try {
      const res = await listFlowNodeTypes();
      const list = Array.isArray(res.data) ? res.data : [];
      let nextMap = buildInitialFlowModuleMap();
      for (const item of list) {
        if (!item.code) continue;
        nextMap = upsertNodeTypeMeta(nextMap, item);
      }
      setFlowModuleMap(nextMap);
      return nextMap;
    } catch (error) {
      console.error('加载节点类型失败', error);
      const fallback = buildInitialFlowModuleMap();
      setFlowModuleMap(fallback);
      return fallback;
    }
  }, []);

  const loadPersonas = useCallback(async () => {
    const res = await listPersona({ pageNum: 1, pageSize: 1000 });
    const rows = Array.isArray(res.rows) ? res.rows : [];
    setPersonaList(rows);
    return rows;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      try {
        const map = await loadNodeTypes();
        const rows = await loadPersonas();
        if (cancelled) return;
        const routePersonaId = searchParams.get('personaId');
        const firstPersonaId =
          rows.find((item) => isSamePersonaId(item.id, routePersonaId))?.id ??
          rows[0]?.id ??
          null;
        if (firstPersonaId != null) {
          setActivePersonaId(firstPersonaId);
          await Promise.all([
            loadPersonaFlow(firstPersonaId, map),
            loadPersonaCallConfigs(firstPersonaId),
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activePersonaId == null) {
      setCurrentTemplate(null);
      setPreviewSteps([]);
      setCallConfigList([]);
      fillCallConfigForm(null, null);
      return;
    }
    void loadPersonaFlow(activePersonaId, flowModuleMap);
    void loadPersonaCallConfigs(activePersonaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePersonaId]);

  useEffect(() => {
    const flowRefresh = searchParams.get('flowRefresh');
    if (!flowRefresh || activePersonaId == null) return;
    void loadPersonaFlow(activePersonaId, flowModuleMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setActiveCallConfig = (configId: number | null) => {
    const next = callConfigList.find((item) => item.id === configId) ?? null;
    fillCallConfigForm(next, activePersonaId);
  };

  const handleCallConfigTabChange = async (key: string) => {
    if (key === callConfigTabKey) return;
    const nextId = Number(key);
    if (!Number.isFinite(nextId)) return;
    const canSwitch = await confirmDiscardCallConfigChanges();
    if (!canSwitch) return;
    setActiveCallConfig(nextId);
  };

  const handlePersonaTabClick = async (personaId: PersonaId) => {
    if (isSamePersonaId(activePersonaId, personaId)) return;
    const canSwitch = await confirmDiscardCallConfigChanges();
    if (!canSwitch) return;
    setActivePersonaId(personaId);
  };

  const handleStrategyCoreChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setCallConfigForm((prev) => ({ ...prev, strategyCore: e.target.value }));
  };

  const saveCallConfig = async () => {
    if (!callConfigForm.id) {
      messageApi.warning('请选择外呼策略配置');
      return;
    }
    setCallConfigSaving(true);
    try {
      const payload: UpdateCallConfigDTO = {
        strategyCore: callConfigForm.strategyCore,
        personaId: (callConfigForm.personaId ?? activePersonaId ?? undefined) as
          | number
          | undefined,
      };
      await updatePersonaCallConfig(callConfigForm.id, payload);
      setCallConfigList((prev) =>
        prev.map((item) =>
          item.id === callConfigForm.id
            ? {
                ...item,
                strategyCore: payload.strategyCore ?? item.strategyCore,
                personaId: payload.personaId ?? item.personaId,
              }
            : item,
        ),
      );
      setCallConfigOriginal(callConfigForm);
      messageApi.success('外呼策略配置已保存');
    } catch (error) {
      console.error('保存外呼策略配置失败', error);
    } finally {
      setCallConfigSaving(false);
    }
  };

  const openFlowEditor = async () => {
    if (activePersonaId == null) return;
    const canLeave = await confirmDiscardCallConfigChanges();
    if (!canLeave) return;
    history.push(
      `/recov/collectionStrategy/flow?personaId=${encodeURIComponent(String(activePersonaId))}`,
    );
  };

  const scrollPersonaTabs = (direction: -1 | 1) => {
    personaScrollRef.current?.scrollBy({
      left: direction * 260,
      behavior: 'smooth',
    });
  };

  const handlePersonaTabsWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!personaScrollRef.current) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    personaScrollRef.current.scrollLeft += event.deltaY;
  };

  const renderFlowRow = (row: PreviewStep[], rowIdx: number) => {
    const hasTailArrow = rowIdx < flowPreviewRows.length - 1;
    return (
      <div
        key={`flow-row-${rowIdx}`}
        className="flex items-center gap-2"
        style={{ marginBottom: 12 }}
      >
        {row.map((step, stepIdx) => {
          const meta = getFlowModuleMeta(flowModuleMap, step.nodeCode);
          const IconCmp = getFlowIconComponent(meta.icon);
          return (
            <div
              key={step.id || `${rowIdx}-${stepIdx}-${step.nodeCode}`}
              className="flex items-center"
            >
              <Popover
                trigger="hover"
                placement="top"
                content={
                  <div className="min-w-[220px] text-sm">
                    <div className="mb-2 font-semibold">执行参数</div>
                    <div className="mb-1 flex justify-between gap-3">
                      <span className="text-zinc-500">等待时间</span>
                      <strong>{step.config.waitMinutes} 分钟后继续</strong>
                    </div>
                    <div className="mb-1 flex justify-between gap-3">
                      <span className="text-zinc-500">失败策略</span>
                      <strong>
                        {failStrategyLabelMap[step.config.failStrategy]}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">跳过策略</span>
                      <strong>
                        {skipStrategyLabelMap[step.config.skipStrategy]}
                      </strong>
                    </div>
                  </div>
                }
              >
                <div
                  className="flex flex-col items-center"
                  style={{ width: 116 }}
                >
                  <div className="mb-1 text-xs font-medium text-zinc-700 text-center">
                    {meta.label}
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: meta.bgColor }}
                  >
                    <IconCmp
                      className="text-base"
                      style={
                        {
                          color: meta.iconColor,
                          fontSize: 20,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                  <div className="mt-1 max-w-[100px] truncate text-[11px] text-zinc-500">
                    {getNodeIdentityDisplayText(flowModuleMap, step)}
                  </div>
                </div>
              </Popover>
              {stepIdx < row.length - 1 ? (
                <span className="mx-2 text-zinc-400">
                  <ArrowRightOutlined />
                </span>
              ) : null}
            </div>
          );
        })}
        {hasTailArrow ? (
          <span className="ml-2 text-zinc-400">
            <ArrowRightOutlined />
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <PageContainer title="催收策略配置">
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4 pb-4">
        <ProCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Title level={4} className="!mb-1">
                催收策略配置
              </Title>
              <Text type="secondary" className="text-sm">
                按画像维护外呼策略与催收流程，系统将根据策略自动执行催收任务。
              </Text>
            </div>
          </div>
        </ProCard>

        <ProCard>
          <Spin spinning={loading}>
            <div className="flex items-center gap-2 border-0 border-b border-solid border-zinc-100 pb-3">
              <Button
                shape="circle"
                size="small"
                aria-label="向左滚动画像标签"
                icon={<ArrowLeftOutlined />}
                onClick={() => scrollPersonaTabs(-1)}
              />
              <div
                ref={personaScrollRef}
                className="flex flex-1 min-w-0 items-center gap-2 overflow-x-auto"
                style={{ scrollBehavior: 'smooth' }}
                onWheel={handlePersonaTabsWheel}
              >
                {personaList.map((persona) => {
                  const isActive = isSamePersonaId(
                    activePersonaId,
                    persona.id ?? null,
                  );
                  return (
                    <button
                      key={String(persona.id)}
                      type="button"
                      className={`shrink-0 max-w-[220px] truncate rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-zinc-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      onClick={() =>
                        void handlePersonaTabClick(persona.id as PersonaId)
                      }
                    >
                      {persona.personaName ?? '-'}
                    </button>
                  );
                })}
              </div>
              <Button
                shape="circle"
                size="small"
                aria-label="向右滚动画像标签"
                icon={<ArrowRightOutlined />}
                onClick={() => scrollPersonaTabs(1)}
              />
            </div>

            {activePersona ? (
              <div className="pt-4">
                <section className="rounded-xl border border-solid border-zinc-100">
                  <Spin spinning={callConfigLoading}>
                    <div className="flex items-center justify-between gap-4 px-4 pt-4">
                      <Text strong className="text-base">
                        策略配置
                      </Text>
                      {hasCallConfigChanges ? (
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          loading={callConfigSaving}
                          disabled={!callConfigForm.id}
                          onClick={() => void saveCallConfig()}
                        >
                          保存配置
                        </Button>
                      ) : null}
                    </div>

                    {callConfigList.length > 0 ? (
                      <div className="mx-4 my-3 overflow-hidden rounded-lg border border-solid border-zinc-100">
                        <div className="px-4 pt-2">
                          <Tabs
                            activeKey={callConfigTabKey}
                            onChange={(key) =>
                              void handleCallConfigTabChange(key)
                            }
                            items={callConfigList.map((config) => ({
                              key: String(config.id),
                              label:
                                config.identityName?.trim() || '未命名身份',
                            }))}
                            tabBarStyle={{ marginBottom: 0 }}
                          />
                        </div>
                        <div className="px-4 py-3">
                          <Form layout="vertical">
                            <Form.Item className="!mb-0">
                              <Input.TextArea
                                value={callConfigForm.strategyCore}
                                onChange={handleStrategyCoreChange}
                                rows={8}
                                maxLength={1000}
                                showCount
                                style={{ resize: 'none' }}
                              />
                            </Form.Item>
                          </Form>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-6 pt-2">
                        <Empty
                          description="暂无外呼策略配置"
                          styles={{ image: { height: 80 } }}
                        />
                      </div>
                    )}
                  </Spin>
                </section>

                <section className="mt-4 rounded-xl border border-solid border-zinc-100">
                  <div className="flex items-center justify-between gap-4 px-4 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <NodeIndexOutlined style={{ fontSize: 20 }} />
                      </div>
                      <div>
                        <Text strong className="text-base">
                          配置催收流程
                        </Text>
                        <div className="text-xs text-zinc-500">
                          针对 {activePersona.personaName} 的业务逻辑与催收路径
                        </div>
                      </div>
                    </div>
                    <Button type="link" onClick={() => void openFlowEditor()}>
                      进入编排工作台
                    </Button>
                  </div>

                  <div ref={flowPreviewBodyRef} className="px-4 pb-4 pt-3">
                    {previewSteps.length > 0 ? (
                      <div className="flex flex-col">
                        {flowPreviewRows.map((row, rowIdx) =>
                          renderFlowRow(row, rowIdx),
                        )}
                      </div>
                    ) : (
                      <Empty
                        description="暂无流程节点"
                        styles={{ image: { height: 80 } }}
                      />
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="py-8">
                <Empty description="暂无画像数据" />
              </div>
            )}
          </Spin>
        </ProCard>
      </div>
    </PageContainer>
  );
};

export default CollectionStrategyPage;
