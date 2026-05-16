import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  EditOutlined,
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
  Tooltip,
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

type PersonaId = string | number;

type CallConfigForm = {
  id: number | null;
  identityName: string;
  strategyCore: string;
  personaId: PersonaId | null;
};

const emptyCallConfigForm: CallConfigForm = {
  id: null,
  identityName: '',
  strategyCore: '',
  personaId: null,
};

type CallConfigEditValues = {
  strategyCore: string;
};

const useFlowPreviewColumns = (container: HTMLDivElement | null): number => {
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    if (!container) return;
    setColumns(resolveFlowPreviewColumns(container.clientWidth));
    const observer = new ResizeObserver(([entry]) => {
      setColumns(resolveFlowPreviewColumns(entry.contentRect.width));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  return columns;
};

const CollectionStrategyPage = () => {
  const [searchParams] = useSearchParams();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [editCallConfigForm] = Form.useForm<CallConfigEditValues>();

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
  const [callConfigEditorOpen, setCallConfigEditorOpen] = useState(false);

  const [flowPreviewBodyElement, setFlowPreviewBodyElement] =
    useState<HTMLDivElement | null>(null);
  const flowPreviewColumns = useFlowPreviewColumns(flowPreviewBodyElement);

  const loadFlowRequestSeqRef = useRef(0);
  const loadCallConfigRequestSeqRef = useRef(0);

  const activePersona = useMemo(
    () =>
      personaList.find((item) => isSamePersonaId(item.id, activePersonaId)) ??
      null,
    [activePersonaId, personaList],
  );

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

  const personaTabItems = useMemo(
    () =>
      personaList
        .filter((item) => item.id != null)
        .map((item) => ({
          key: String(item.id),
          label: (
            <span className="inline-block max-w-[160px] truncate align-bottom">
              {item.personaName ?? String(item.id)}
            </span>
          ),
        })),
    [personaList],
  );

  const activePersonaKey =
    activePersonaId == null ? undefined : String(activePersonaId);

  const fillCallConfigForm = useCallback(
    (config: CallConfigVO | null, personaId: PersonaId | null) => {
      const next: CallConfigForm = config
        ? {
            id: config.id,
            identityName: config.identityName ?? '',
            strategyCore: config.strategyCore ?? '',
            personaId: config.personaId ?? personaId,
          }
        : { id: null, identityName: '', strategyCore: '', personaId };
      setCallConfigForm(next);
    },
    [],
  );

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
    setActiveCallConfig(nextId);
  };

  const handlePersonaTabClick = (personaId: PersonaId) => {
    if (isSamePersonaId(activePersonaId, personaId)) return;
    setActivePersonaId(personaId);
  };

  const handlePersonaTabsChange = async (personaId: string) => {
    const nextPersona = personaList.find((item) =>
      isSamePersonaId(item.id, personaId),
    );
    if (nextPersona?.id == null) return;
    handlePersonaTabClick(nextPersona.id);
  };

  const openCallConfigEditor = () => {
    if (!callConfigForm.id) {
      messageApi.warning('请选择外呼策略配置');
      return;
    }
    editCallConfigForm.setFieldsValue({
      strategyCore: callConfigForm.strategyCore,
    });
    setCallConfigEditorOpen(true);
  };

  const saveCallConfig = async () => {
    if (!callConfigForm.id) {
      messageApi.warning('请选择外呼策略配置');
      return;
    }
    let values: CallConfigEditValues;
    try {
      values = await editCallConfigForm.validateFields();
    } catch {
      return;
    }
    setCallConfigSaving(true);
    try {
      const payload: UpdateCallConfigDTO = {
        strategyCore: values.strategyCore ?? '',
        personaId: (callConfigForm.personaId ?? activePersonaId ?? undefined) as
          | number
          | undefined,
      };
      await updatePersonaCallConfig(callConfigForm.id, payload);
      const nextCallConfigForm = {
        ...callConfigForm,
        strategyCore: payload.strategyCore ?? '',
        personaId: payload.personaId ?? callConfigForm.personaId,
      };
      setCallConfigList((prev) =>
        prev.map((item) =>
          item.id === callConfigForm.id
            ? {
                ...item,
                strategyCore: nextCallConfigForm.strategyCore,
                personaId: payload.personaId ?? item.personaId,
              }
            : item,
        ),
      );
      setCallConfigForm(nextCallConfigForm);
      setCallConfigEditorOpen(false);
      messageApi.success('外呼策略配置已保存');
    } catch (error) {
      console.error('保存外呼策略配置失败', error);
    } finally {
      setCallConfigSaving(false);
    }
  };

  const openFlowEditor = async () => {
    if (activePersonaId == null) return;
    history.push(
      `/recov/collectionStrategy/flow?personaId=${encodeURIComponent(String(activePersonaId))}`,
    );
  };

  const renderFlowRow = (row: PreviewStep[], rowIdx: number) => {
    const hasNextRow = rowIdx < flowPreviewRows.length - 1;
    return (
      <div key={`flow-row-${rowIdx}`} className="flex flex-col">
        <div className="flex items-center gap-3">
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
                    style={{ width: 128 }}
                  >
                    <div className="mb-1.5 text-sm font-semibold text-zinc-700 text-center">
                      {meta.label}
                    </div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg"
                      style={{ backgroundColor: meta.bgColor }}
                    >
                      <IconCmp
                        style={
                          {
                            color: meta.iconColor,
                            fontSize: 24,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <div className="mt-1.5 max-w-[112px] truncate text-xs text-zinc-500">
                      {getNodeIdentityDisplayText(flowModuleMap, step)}
                    </div>
                  </div>
                </Popover>
                {stepIdx < row.length - 1 ? (
                  <span className="mx-2 text-base text-zinc-400">
                    <ArrowRightOutlined />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {hasNextRow ? (
          <div className="mb-3 mt-1 flex justify-center text-zinc-400">
            <ArrowDownOutlined />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <PageContainer breadcrumbRender={false} title="催收策略配置">
      {messageContextHolder}
      <Modal
        destroyOnHidden
        title="编辑外呼策略"
        open={callConfigEditorOpen}
        width={720}
        okText="保存"
        cancelText="取消"
        confirmLoading={callConfigSaving}
        onOk={() => void saveCallConfig()}
        onCancel={() => setCallConfigEditorOpen(false)}
      >
        <Form
          form={editCallConfigForm}
          layout="vertical"
          preserve={false}
          requiredMark={false}
        >
          <Form.Item label="身份名称">
            <Input
              disabled
              value={callConfigForm.identityName || '未命名身份'}
            />
          </Form.Item>
          <Form.Item
            label="策略内容"
            name="strategyCore"
            rules={[{ max: 1000, message: '策略内容不能超过 1000 字' }]}
          >
            <Input.TextArea
              rows={10}
              maxLength={1000}
              showCount
              style={{ resize: 'none' }}
            />
          </Form.Item>
        </Form>
      </Modal>
      <div className="pb-4">
        <Spin spinning={loading}>
          <div className="flex flex-col gap-4">
            <ProCard className="min-w-0 overflow-hidden">
              <div className="min-w-0 overflow-hidden">
                <Tabs
                  activeKey={activePersonaKey}
                  items={personaTabItems}
                  more={{ trigger: 'click' }}
                  onChange={(key) => void handlePersonaTabsChange(key)}
                  tabBarStyle={{ marginBottom: 0 }}
                  style={{ maxWidth: '100%' }}
                />
              </div>
            </ProCard>

            {activePersona ? (
              <>
                <ProCard
                  className="min-w-0"
                  title="外呼策略"
                  extra={
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        shape="circle"
                        aria-label="编辑"
                        icon={<EditOutlined />}
                        disabled={!callConfigForm.id || callConfigLoading}
                        onClick={openCallConfigEditor}
                      />
                    </Tooltip>
                  }
                >
                  <Spin spinning={callConfigLoading}>
                    {callConfigList.length > 0 ? (
                      <div className="overflow-hidden rounded-lg border border-solid border-zinc-100">
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
                          <div className="min-h-[220px] whitespace-pre-wrap break-words rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700">
                            {callConfigForm.strategyCore.trim() || (
                              <span className="text-zinc-400">
                                暂无策略内容
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6">
                        <Empty
                          description="暂无外呼策略配置"
                          styles={{ image: { height: 64 } }}
                        />
                      </div>
                    )}
                  </Spin>
                </ProCard>

                <ProCard
                  className="min-w-0"
                  title="流程预览"
                  extra={
                    <Tooltip title="编辑流程">
                      <Button
                        type="text"
                        shape="circle"
                        aria-label="编辑流程"
                        icon={<EditOutlined />}
                        onClick={() => void openFlowEditor()}
                      />
                    </Tooltip>
                  }
                >
                  <div
                    ref={setFlowPreviewBodyElement}
                    className="min-w-0 overflow-x-auto"
                  >
                    {previewSteps.length > 0 ? (
                      <div className="flex flex-col">
                        {flowPreviewRows.map((row, rowIdx) =>
                          renderFlowRow(row, rowIdx),
                        )}
                      </div>
                    ) : (
                      <div className="py-6">
                        <Empty
                          description="暂无流程节点"
                          styles={{ image: { height: 64 } }}
                        />
                      </div>
                    )}
                  </div>
                </ProCard>
              </>
            ) : (
              <ProCard>
                <Empty description="暂无画像数据" />
              </ProCard>
            )}
          </div>
        </Spin>
      </div>
    </PageContainer>
  );
};

export default CollectionStrategyPage;
