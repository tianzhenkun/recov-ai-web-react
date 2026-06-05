import { ArrowRightOutlined, EditOutlined } from '@ant-design/icons';
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
  theme,
} from 'antd';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import type { TemplateEditorFeatures } from '@/components/TemplateEditor/types';
import { useTemplateVariables } from '@/hooks/useTemplateVariables';
import {
  type CallConfigVO,
  type FlowTemplateVO,
  getDefaultPersonaFlowTemplate,
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
  findCallConfigByKey,
  getCallConfigKey,
  getFlowIconComponent,
  getFlowModuleMeta,
  getNodeIdentityDisplayText,
  isSamePersonaId,
  normalizeSteps,
  type PreviewStep,
  resolveFlowPreviewColumns,
  skipStrategyLabelMap,
  sortCallConfigsByIdentity,
  upsertNodeTypeMeta,
} from './_shared';

type PersonaId = string | number;

const OPENING_TEMPLATE_FEATURES: TemplateEditorFeatures = {
  textStyle: false,
  color: false,
  align: false,
  list: false,
  image: false,
  table: false,
  variable: true,
};

const STRATEGY_CORE_FEATURES: TemplateEditorFeatures = {
  textStyle: false,
  color: false,
  align: false,
  list: true,
  image: false,
  table: false,
  variable: false,
};

type CallConfigForm = {
  id: number | string | null;
  identityName: string;
  strategyCore: string;
  speakingStyle: string;
  openingTemplate: string;
  personaId: PersonaId | null;
};

const emptyCallConfigForm: CallConfigForm = {
  id: null,
  identityName: '',
  strategyCore: '',
  speakingStyle: '',
  openingTemplate: '',
  personaId: null,
};

type CallConfigEditValues = {
  strategyCore: string;
  speakingStyle: string;
  openingTemplate: string;
};

type CallConfigContentBlockProps = {
  label: string;
  value?: string;
  emptyText: string;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
};

const CallConfigContentBlock = ({
  label,
  value = '',
  emptyText,
  className = '',
  bodyClassName = '',
  children,
}: CallConfigContentBlockProps) => {
  const content = value.trim();
  return (
    <div
      className={`rounded-lg border border-solid border-zinc-100 bg-zinc-50/70 px-5 py-4 ${className}`}
    >
      <div className="mb-2 text-xs font-semibold text-zinc-500">{label}</div>
      <div
        className={`min-h-[96px] whitespace-pre-wrap break-words text-sm leading-7 text-zinc-700 ${bodyClassName}`}
      >
        {children ??
          (content || <span className="text-zinc-400">{emptyText}</span>)}
      </div>
    </div>
  );
};

const renderOpeningTemplatePreview = (
  template: string,
  variables: { label: string; value: string }[],
  emptyText: string,
  variableTone: { bg: string; border: string; color: string },
) => {
  const content = template.trim();
  if (!content) {
    return <span className="text-zinc-400">{emptyText}</span>;
  }

  const nodes: ReactNode[] = [];
  const variableLabelMap = new Map(
    variables.map((item) => [item.value, item.label] as const),
  );
  const variablePattern = /\{\{\s*([a-zA-Z0-9_]+)\s*}}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  for (
    match = variablePattern.exec(content);
    match;
    match = variablePattern.exec(content)
  ) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }
    const variableName = match[1];
    const variableLabel = variableLabelMap.get(variableName);
    if (!variableLabel) {
      nodes.push(match[0]);
      lastIndex = match.index + match[0].length;
      continue;
    }
    nodes.push(
      <span
        key={`${variableName}-${match.index}`}
        className="mx-0.5 inline-flex items-center rounded border border-solid px-1.5 py-0.5 text-xs font-medium leading-5"
        style={{
          background: variableTone.bg,
          borderColor: variableTone.border,
          color: variableTone.color,
        }}
      >
        {variableLabel}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }
  return nodes;
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
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [editCallConfigForm] = Form.useForm<CallConfigEditValues>();
  const { variables: templateVariables } = useTemplateVariables();

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
    () => getCallConfigKey(callConfigForm.id),
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
            speakingStyle: config.speakingStyle ?? '',
            openingTemplate: config.openingTemplate ?? '',
            personaId: config.personaId ?? personaId,
          }
        : { ...emptyCallConfigForm, personaId };
      setCallConfigForm(next);
    },
    [],
  );

  const fetchCurrentFlowTemplate = useCallback(async (personaId: PersonaId) => {
    const res = await listCurrentFlowTemplates({
      pageNum: 1,
      pageSize: 1,
      personaId: personaId as number,
    });
    const rows = Array.isArray(res.rows) ? res.rows : [];
    return rows[0] ?? null;
  }, []);

  const resolveTemplateSteps = useCallback(
    (
      template: FlowTemplateVO | null,
      currentFlowModuleMap: Record<string, FlowModuleMeta>,
    ) => {
      const steps = template
        ? normalizeSteps(currentFlowModuleMap, template.steps)
        : [];
      return steps.length > 0 ? steps : buildDefaultSteps(currentFlowModuleMap);
    },
    [],
  );

  const loadDefaultPersonaTemplateSteps = useCallback(
    async (currentFlowModuleMap: Record<string, FlowModuleMeta>) => {
      const res = await getDefaultPersonaFlowTemplate();
      const template = res.data ?? null;
      return resolveTemplateSteps(template, currentFlowModuleMap);
    },
    [resolveTemplateSteps],
  );

  const loadPersonaFlow = useCallback(
    async (
      personaId: PersonaId,
      currentFlowModuleMap: Record<string, FlowModuleMeta>,
    ) => {
      loadFlowRequestSeqRef.current += 1;
      const requestSeq = loadFlowRequestSeqRef.current;
      try {
        const template = await fetchCurrentFlowTemplate(personaId);
        if (requestSeq !== loadFlowRequestSeqRef.current) return;
        setCurrentTemplate(template);
        const steps = template
          ? resolveTemplateSteps(template, currentFlowModuleMap)
          : await loadDefaultPersonaTemplateSteps(currentFlowModuleMap);
        if (requestSeq !== loadFlowRequestSeqRef.current) return;
        setPreviewSteps(steps);
      } catch (error) {
        if (requestSeq !== loadFlowRequestSeqRef.current) return;
        console.error('加载策略模板失败', error);
        setCurrentTemplate(null);
        setPreviewSteps(buildDefaultSteps(currentFlowModuleMap));
      }
    },
    [
      fetchCurrentFlowTemplate,
      loadDefaultPersonaTemplateSteps,
      resolveTemplateSteps,
    ],
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
          speakingStyle: config.speakingStyle ?? '',
          openingTemplate: config.openingTemplate ?? '',
          personaId: (config.personaId ?? personaId ?? 0) as number,
        }));
        const sorted = sortCallConfigsByIdentity(normalized);
        setCallConfigList(sorted);
        fillCallConfigForm(sorted[0] ?? null, personaId);
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

  const setActiveCallConfig = (configKey: string) => {
    const next = findCallConfigByKey(callConfigList, configKey);
    fillCallConfigForm(next, activePersonaId);
  };

  const handleCallConfigTabChange = async (key: string) => {
    if (key === callConfigTabKey) return;
    setActiveCallConfig(key);
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
    if (callConfigForm.id == null) {
      messageApi.warning('请选择外呼策略配置');
      return;
    }
    editCallConfigForm.setFieldsValue({
      strategyCore: callConfigForm.strategyCore,
      speakingStyle: callConfigForm.speakingStyle,
      openingTemplate: callConfigForm.openingTemplate,
    });
    setCallConfigEditorOpen(true);
  };

  const saveCallConfig = async () => {
    if (callConfigForm.id == null) {
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
        identityName: callConfigForm.identityName,
        strategyCore: values.strategyCore ?? '',
        speakingStyle: values.speakingStyle ?? '',
        openingTemplate: values.openingTemplate ?? '',
        personaId: (callConfigForm.personaId ?? activePersonaId ?? undefined) as
          | number
          | undefined,
      };
      await updatePersonaCallConfig(callConfigForm.id, payload);
      const nextCallConfigForm = {
        ...callConfigForm,
        strategyCore: payload.strategyCore ?? '',
        speakingStyle: payload.speakingStyle ?? '',
        openingTemplate: payload.openingTemplate ?? '',
        personaId: payload.personaId ?? callConfigForm.personaId,
      };
      setCallConfigList((prev) =>
        prev.map((item) =>
          getCallConfigKey(item.id) === getCallConfigKey(callConfigForm.id)
            ? {
                ...item,
                strategyCore: nextCallConfigForm.strategyCore,
                speakingStyle: nextCallConfigForm.speakingStyle,
                openingTemplate: nextCallConfigForm.openingTemplate,
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
        <div className="flex items-start gap-4">
          {row.map((step, stepIdx) => {
            const meta = getFlowModuleMeta(flowModuleMap, step.nodeCode);
            const IconCmp = getFlowIconComponent(meta.icon);
            const identityText = getNodeIdentityDisplayText(
              flowModuleMap,
              step,
            );
            const waitMinutes = Number(step.config.waitMinutes || 0);
            const showConnectorArrow =
              stepIdx < row.length - 1 ||
              (hasNextRow && stepIdx === row.length - 1);
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
                        <span className="text-zinc-500">触发前等待</span>
                        <strong>
                          {waitMinutes > 0
                            ? `触发前等待 ${waitMinutes} 分钟`
                            : '到期立即触发'}
                        </strong>
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
                    className="flex min-h-[124px] flex-col items-center justify-start"
                    style={{ width: 128 }}
                  >
                    <div className="mb-1.5 flex min-h-[44px] items-end justify-center text-center text-sm font-semibold text-zinc-700">
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
                    <div className="mt-1.5 h-5 max-w-[112px] truncate text-center text-xs text-zinc-500">
                      {identityText || ''}
                    </div>
                  </div>
                </Popover>
                {showConnectorArrow ? (
                  <span className="mx-2 text-base text-zinc-400">
                    <ArrowRightOutlined />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
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
        width={760}
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
            label="沟通语气"
            name="speakingStyle"
            rules={[{ max: 255, message: '沟通语气不能超过 255 字' }]}
          >
            <Input.TextArea
              variant="outlined"
              rows={3}
              maxLength={255}
              showCount
              style={{ resize: 'none' }}
            />
          </Form.Item>
          <Form.Item
            label="开场白"
            name="openingTemplate"
            rules={[{ max: 255, message: '开场白不能超过 255 字' }]}
          >
            <TemplateEditor
              outputType="text"
              height={140}
              placeholder="请输入开场白"
              features={OPENING_TEMPLATE_FEATURES}
              variables={templateVariables}
            />
          </Form.Item>
          <Form.Item
            label="策略核心"
            name="strategyCore"
            rules={[{ max: 1000, message: '策略核心不能超过 1000 字' }]}
          >
            <TemplateEditor
              outputType="text"
              height={180}
              maxLength={1000}
              showCount
              placeholder="请输入策略核心"
              features={STRATEGY_CORE_FEATURES}
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
                        disabled={
                          callConfigForm.id == null || callConfigLoading
                        }
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
                              key: getCallConfigKey(config.id),
                              label:
                                config.identityName?.trim() || '未命名身份',
                            }))}
                            tabBarStyle={{ marginBottom: 0 }}
                          />
                        </div>
                        <div className="px-5 pb-5 pt-4">
                          <CallConfigContentBlock
                            label="开场白"
                            emptyText="暂无开场白"
                            className="border-blue-100 bg-blue-50/70"
                            bodyClassName="min-h-[88px] text-[15px] leading-8 text-slate-800"
                          >
                            {renderOpeningTemplatePreview(
                              callConfigForm.openingTemplate,
                              templateVariables,
                              '暂无开场白',
                              {
                                bg: token.colorPrimaryBg,
                                border: token.colorPrimaryBorder,
                                color: token.colorPrimaryText,
                              },
                            )}
                          </CallConfigContentBlock>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <CallConfigContentBlock
                              label="沟通语气"
                              value={callConfigForm.speakingStyle}
                              emptyText="暂无沟通语气"
                              bodyClassName="min-h-[160px]"
                            />
                            <CallConfigContentBlock
                              label="策略核心"
                              value={callConfigForm.strategyCore}
                              emptyText="暂无策略核心"
                              bodyClassName="min-h-[160px]"
                            />
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
                      <div className="flex flex-col gap-8">
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
