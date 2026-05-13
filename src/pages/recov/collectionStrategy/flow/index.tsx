import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Button,
  Empty,
  Form,
  InputNumber,
  Modal,
  message,
  Select,
  Spin,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type CreateFlowTemplateDTO,
  createFlowTemplate,
  type FlowTemplateVO,
  listCurrentFlowTemplates,
  listFlowNodeTypes,
  type StepFailStrategy,
  type StepSkipStrategy,
  updateFlowTemplate,
} from '@/services/ruoyi/collection-strategy';
import { listPersona, type PersonaItem } from '@/services/ruoyi/persona';
import {
  type AiCallRole,
  aiCallRoleOptions,
  buildDefaultNodeParams,
  buildDefaultSteps,
  buildInitialFlowModuleMap,
  cloneStrategySteps,
  corpLetterSealOptions,
  createStepId,
  defaultStepConfig,
  type FlowModuleMeta,
  failStrategyOptions,
  getFlowIconComponent,
  getFlowModuleMeta,
  getNodeIdentityDisplayText,
  isSamePersonaId,
  type NormalizedStrategyStep,
  normalizeStep,
  normalizeSteps,
  skipStrategyOptions,
  upsertNodeTypeMeta,
  validateStrategySteps,
} from '../_shared';

const { Title, Text } = Typography;

type PersonaId = string | number;

type SelectedNodeForm = {
  aiRole: AiCallRole | '';
  sealId: string;
  waitMinutes: number;
  failStrategy: StepFailStrategy;
  skipStrategy: StepSkipStrategy;
};

const defaultSelectedNodeForm: SelectedNodeForm = {
  aiRole: '',
  sealId: '',
  waitMinutes: defaultStepConfig.waitMinutes,
  failStrategy: defaultStepConfig.failStrategy,
  skipStrategy: defaultStepConfig.skipStrategy,
};

const CollectionStrategyFlowEditor = () => {
  const [searchParams] = useSearchParams();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [personaList, setPersonaList] = useState<PersonaItem[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<PersonaId | null>(
    null,
  );
  const [flowModuleMap, setFlowModuleMap] = useState<
    Record<string, FlowModuleMeta>
  >(() => buildInitialFlowModuleMap());
  const [backendNodeCodes, setBackendNodeCodes] = useState<Set<string>>(
    () => new Set(),
  );

  const [currentTemplate, setCurrentTemplate] = useState<FlowTemplateVO | null>(
    null,
  );
  const [currentTemplateId, setCurrentTemplateId] = useState<
    number | string | null
  >(null);

  const [draftSteps, setDraftSteps] = useState<NormalizedStrategyStep[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeForm, setSelectedNodeForm] = useState<SelectedNodeForm>(
    defaultSelectedNodeForm,
  );

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<
    'before' | 'after' | null
  >(null);

  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const activePersona = useMemo(
    () =>
      personaList.find((item) => isSamePersonaId(item.id, activePersonaId)) ??
      null,
    [activePersonaId, personaList],
  );

  const activePersonaName = activePersona?.personaName ?? '未命名画像';

  const availableModules = useMemo(() => {
    const modules = Object.values(flowModuleMap);
    if (backendNodeCodes.size === 0) return modules;
    return modules.filter((module) => backendNodeCodes.has(module.code));
  }, [backendNodeCodes, flowModuleMap]);

  const selectedNode = useMemo(
    () => draftSteps.find((node) => node.id === selectedNodeId) ?? null,
    [draftSteps, selectedNodeId],
  );

  const markDirty = () => setDirty(true);

  const syncSelectedNodeForm = useCallback(
    (node: NormalizedStrategyStep | null) => {
      if (!node) {
        setSelectedNodeForm(defaultSelectedNodeForm);
        return;
      }
      setSelectedNodeForm({
        aiRole: (node.params?.aiRole as AiCallRole | undefined) ?? '',
        sealId: node.params?.sealId ?? '',
        waitMinutes: node.config.waitMinutes,
        failStrategy: node.config.failStrategy,
        skipStrategy: node.config.skipStrategy,
      });
    },
    [],
  );

  useEffect(() => {
    syncSelectedNodeForm(selectedNode);
  }, [selectedNode, syncSelectedNodeForm]);

  const setFlowSelectedNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  const loadNodeTypes = useCallback(async () => {
    try {
      const res = await listFlowNodeTypes();
      const list = Array.isArray(res.data) ? res.data : [];
      let nextMap = buildInitialFlowModuleMap();
      const codes = new Set<string>();
      for (const item of list) {
        if (!item.code) continue;
        nextMap = upsertNodeTypeMeta(nextMap, item);
        codes.add(item.code);
      }
      setFlowModuleMap(nextMap);
      setBackendNodeCodes(codes);
      return nextMap;
    } catch (error) {
      console.error('加载节点类型失败', error);
      const fallback = buildInitialFlowModuleMap();
      setFlowModuleMap(fallback);
      setBackendNodeCodes(new Set(Object.keys(fallback)));
      return fallback;
    }
  }, []);

  const loadPersonas = useCallback(async () => {
    const res = await listPersona({ pageNum: 1, pageSize: 1000 });
    const rows = Array.isArray(res.rows) ? res.rows : [];
    setPersonaList(rows);
    return rows;
  }, []);

  const loadPersonaFlow = useCallback(
    async (
      personaId: PersonaId,
      currentFlowModuleMap: Record<string, FlowModuleMeta>,
    ) => {
      const res = await listCurrentFlowTemplates({
        pageNum: 1,
        pageSize: 1,
        personaId: personaId as number,
      });
      const rows = Array.isArray(res.rows) ? res.rows : [];
      const template = rows[0] ?? null;
      setCurrentTemplate(template);
      setCurrentTemplateId(template?.id ?? null);
      const steps = template
        ? normalizeSteps(currentFlowModuleMap, template.steps)
        : buildDefaultSteps(currentFlowModuleMap);
      setDraftSteps(steps);
      setSelectedNodeId(steps[0]?.id ?? null);
      setDirty(false);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const routePersonaId = searchParams.get('personaId');
      setLoading(true);
      try {
        const map = await loadNodeTypes();
        const rows = await loadPersonas();
        if (cancelled) return;
        const personaId =
          rows.find((item) => isSamePersonaId(item.id, routePersonaId))?.id ??
          routePersonaId ??
          rows[0]?.id ??
          null;
        if (personaId == null) return;
        setActivePersonaId(personaId);
        await loadPersonaFlow(personaId, map);
      } catch (error) {
        console.error('初始化催收流程编排页失败', error);
        messageApi.error('初始化催收流程编排页失败');
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

  const applySelectedNodeData = (payload: {
    identity?: string;
    config?: Partial<NormalizedStrategyStep['config']>;
    params?: Partial<NormalizedStrategyStep['params']>;
  }) => {
    if (!selectedNodeId) return;
    setDraftSteps((prev) =>
      prev.map((step) => {
        if (step.id !== selectedNodeId) return step;
        const nextConfig = payload.config
          ? { ...step.config, ...payload.config }
          : step.config;
        const nextParams = payload.params
          ? { ...step.params, ...payload.params }
          : step.params;
        return {
          ...step,
          identity:
            payload.identity !== undefined ? payload.identity : step.identity,
          config: {
            waitMinutes: Number(nextConfig.waitMinutes ?? 0),
            failStrategy: nextConfig.failStrategy,
            skipStrategy: nextConfig.skipStrategy,
          },
          params: nextParams,
        };
      }),
    );
    markDirty();
  };

  const handleStepConfigChange = (
    next: Partial<{
      waitMinutes: number;
      failStrategy: StepFailStrategy;
      skipStrategy: StepSkipStrategy;
    }>,
  ) => {
    setSelectedNodeForm((prev) => ({ ...prev, ...next }));
    applySelectedNodeData({
      config: {
        waitMinutes:
          next.waitMinutes !== undefined
            ? Number(next.waitMinutes) || 0
            : selectedNodeForm.waitMinutes,
        failStrategy: next.failStrategy ?? selectedNodeForm.failStrategy,
        skipStrategy: next.skipStrategy ?? selectedNodeForm.skipStrategy,
      },
    });
  };

  const handleAiCallRoleChange = (role: AiCallRole) => {
    setSelectedNodeForm((prev) => ({ ...prev, aiRole: role }));
    applySelectedNodeData({
      identity:
        aiCallRoleOptions.find((item) => item.value === role)?.label ??
        '企业客服',
      params: { aiRole: role },
    });
  };

  const handleCorpLetterSealChange = (sealId: string) => {
    setSelectedNodeForm((prev) => ({ ...prev, sealId }));
    applySelectedNodeData({ params: { sealId } });
  };

  const addNode = (nodeCode: string) => {
    const meta = getFlowModuleMeta(flowModuleMap, nodeCode);
    setDraftSteps((prev) => {
      const newStep = normalizeStep(
        flowModuleMap,
        {
          id: createStepId(),
          nodeCode,
          identity: meta.defaultIdentity,
          config: defaultStepConfig,
          params: buildDefaultNodeParams(nodeCode, meta.defaultIdentity),
        },
        prev.length,
      );
      const next = [...prev, newStep];
      setSelectedNodeId(newStep.id);
      return next;
    });
    markDirty();
  };

  const removeNode = (idx: number) => {
    setDraftSteps((prev) => {
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      if (removed?.id === selectedNodeId) {
        setSelectedNodeId(next[idx]?.id ?? next[idx - 1]?.id ?? null);
      }
      return next;
    });
    markDirty();
  };

  const resetNodeDragState = () => {
    setDraggingNodeId(null);
    setDragOverNodeId(null);
    setDragOverPosition(null);
  };

  const resolveDragPosition = (
    event: React.DragEvent,
    target: HTMLElement,
  ): 'before' | 'after' => {
    const rect = target.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  };

  const handleNodeDragStart = (
    event: React.DragEvent<HTMLSpanElement>,
    nodeId: string,
  ) => {
    setDraggingNodeId(nodeId);
    setDragOverNodeId(null);
    setDragOverPosition(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', nodeId);
  };

  const handleNodeDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    nodeId: string,
  ) => {
    event.preventDefault();
    if (!draggingNodeId || draggingNodeId === nodeId) {
      setDragOverNodeId(null);
      setDragOverPosition(null);
      return;
    }
    event.dataTransfer.dropEffect = 'move';
    setDragOverNodeId(nodeId);
    setDragOverPosition(
      resolveDragPosition(event, event.currentTarget as HTMLElement),
    );
  };

  const handleNodeDragLeave = (nodeId: string) => {
    if (dragOverNodeId !== nodeId) return;
    setDragOverNodeId(null);
    setDragOverPosition(null);
  };

  const handleNodeDrop = (
    event: React.DragEvent<HTMLDivElement>,
    targetNodeId: string,
  ) => {
    event.preventDefault();
    const sourceNodeId =
      draggingNodeId || event.dataTransfer.getData('text/plain');
    if (!sourceNodeId || sourceNodeId === targetNodeId) {
      resetNodeDragState();
      return;
    }
    setDraftSteps((prev) => {
      const sourceIndex = prev.findIndex((node) => node.id === sourceNodeId);
      const targetIndex = prev.findIndex((node) => node.id === targetNodeId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;

      const insertPosition =
        dragOverPosition ??
        resolveDragPosition(event, event.currentTarget as HTMLElement);
      const next = [...prev];
      const [sourceNode] = next.splice(sourceIndex, 1);
      let insertIndex = targetIndex + (insertPosition === 'after' ? 1 : 0);
      if (sourceIndex < insertIndex) insertIndex -= 1;
      next.splice(insertIndex, 0, sourceNode);
      setSelectedNodeId(sourceNode.id);
      return next;
    });
    markDirty();
    resetNodeDragState();
  };

  const handleNodeDragEnd = () => {
    resetNodeDragState();
  };

  const closeEditor = (options?: { refreshPreview?: boolean }) => {
    const params = new URLSearchParams();
    if (activePersonaId != null) {
      params.set('personaId', String(activePersonaId));
      if (options?.refreshPreview) {
        params.set('flowRefresh', String(Date.now()));
      }
    }
    const query = params.toString();
    history.push(`/sys/collection-strategy${query ? `?${query}` : ''}`);
  };

  const exitEditor = () => {
    if (!dirtyRef.current) {
      closeEditor();
      return;
    }
    modalApi.confirm({
      title: '提示',
      content: '当前流程有未保存修改，确定退出吗？',
      okText: '确定退出',
      okButtonProps: { danger: true },
      cancelText: '继续编辑',
      autoFocusButton: 'cancel',
      onOk: () => {
        closeEditor();
      },
    });
  };

  const saveFlowEditor = async () => {
    if (activePersonaId == null) return;
    const steps = cloneStrategySteps(flowModuleMap, draftSteps);
    const validationError = validateStrategySteps(steps);
    if (validationError) {
      messageApi.warning(validationError);
      return;
    }
    setSaving(true);
    try {
      if (currentTemplateId != null) {
        const res = await updateFlowTemplate(currentTemplateId, {
          templateName:
            currentTemplate?.templateName || `${activePersonaName}催收流程`,
          steps,
        });
        const nextId = res.data ?? currentTemplateId;
        setCurrentTemplateId(nextId);
      } else {
        const payload: CreateFlowTemplateDTO = {
          templateName: `${activePersonaName}催收流程`,
          personaId: activePersonaId,
          steps,
        };
        const res = await createFlowTemplate(payload);
        setCurrentTemplateId(res.data ?? null);
      }
      setDirty(false);
      messageApi.success('策略已保存');
      closeEditor({ refreshPreview: true });
    } catch (error) {
      console.error('保存催收流程失败', error);
    } finally {
      setSaving(false);
    }
  };

  const renderDropIndicator = (nodeId: string, position: 'before' | 'after') =>
    dragOverNodeId === nodeId && dragOverPosition === position ? (
      <div className="h-0.5 w-full rounded-full bg-blue-500" />
    ) : (
      <div className="h-0.5 w-full" />
    );

  return (
    <PageContainer
      title="催收流程编排"
      onBack={exitEditor}
      extra={[
        <Button
          key="save"
          type="primary"
          loading={saving}
          onClick={() => void saveFlowEditor()}
        >
          保存策略
        </Button>,
      ]}
    >
      {messageContextHolder}
      {modalContextHolder}
      <Spin spinning={loading}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
          <ProCard
            title={
              <div>
                <div className="text-sm font-semibold">节点库</div>
                <div className="text-xs text-zinc-500">
                  点击后追加到流程末尾
                </div>
              </div>
            }
            extra={
              <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-semibold text-blue-600">
                {availableModules.length}
              </span>
            }
          >
            <div className="flex flex-col gap-2">
              {availableModules.map((module) => {
                const IconCmp = getFlowIconComponent(module.icon);
                return (
                  <button
                    key={module.code}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border border-solid border-zinc-100 bg-white p-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/30"
                    onClick={() => addNode(module.code)}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: module.bgColor }}
                    >
                      <IconCmp
                        style={
                          {
                            color: module.iconColor,
                            fontSize: 18,
                          } as React.CSSProperties
                        }
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-zinc-800">
                        {module.label}
                      </span>
                      <span className="truncate text-xs text-zinc-400">
                        {module.code}
                      </span>
                    </span>
                    <PlusOutlined className="text-zinc-400" />
                  </button>
                );
              })}
            </div>
          </ProCard>

          <ProCard
            title={
              <div>
                <div className="text-sm font-semibold">执行顺序</div>
                <div className="text-xs text-zinc-500">
                  数组顺序即真实执行顺序，适合十几个节点的轻量编排。
                </div>
              </div>
            }
          >
            {draftSteps.length > 0 ? (
              <div className="flex flex-col gap-2">
                {draftSteps.map((node, idx) => {
                  const meta = getFlowModuleMeta(flowModuleMap, node.nodeCode);
                  const IconCmp = getFlowIconComponent(meta.icon);
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <div key={node.id}>
                      {renderDropIndicator(node.id, 'before')}
                      <div
                        className={`flex items-center gap-3 transition-opacity ${
                          draggingNodeId === node.id ? 'opacity-40' : ''
                        }`}
                        onDragEnter={(e) => e.preventDefault()}
                        onDragOver={(e) => handleNodeDragOver(e, node.id)}
                        onDragLeave={() => handleNodeDragLeave(node.id)}
                        onDrop={(e) => handleNodeDrop(e, node.id)}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">
                          {idx + 1}
                        </div>
                        <button
                          type="button"
                          className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center border-0 bg-transparent p-0 text-zinc-400 active:cursor-grabbing"
                          draggable
                          title="拖拽调整顺序"
                          aria-label="拖拽调整顺序"
                          onDragStart={(e) => handleNodeDragStart(e, node.id)}
                          onDragEnd={handleNodeDragEnd}
                        >
                          <HolderOutlined />
                        </button>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          className={`flex flex-1 items-center gap-3 rounded-xl border border-solid p-2.5 text-left transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                              : 'border-zinc-100 bg-white hover:border-blue-200'
                          }`}
                          onClick={() => setFlowSelectedNode(node.id)}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: meta.bgColor }}
                          >
                            <IconCmp
                              style={
                                {
                                  color: meta.iconColor,
                                  fontSize: 18,
                                } as React.CSSProperties
                              }
                            />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-semibold text-zinc-800">
                              {meta.label}
                            </span>
                            <span className="truncate text-xs text-zinc-500">
                              {getNodeIdentityDisplayText(flowModuleMap, node)}{' '}
                              · {node.config.waitMinutes} 分钟后继续
                            </span>
                          </span>
                        </button>
                        <Button
                          size="small"
                          shape="circle"
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          aria-label="删除节点"
                          onClick={() => removeNode(idx)}
                        />
                      </div>
                      {renderDropIndicator(node.id, 'after')}
                      {idx < draftSteps.length - 1 ? (
                        <div className="my-1 flex items-center gap-2 pl-10">
                          <div className="h-3 w-px bg-zinc-200" />
                          <span className="text-xs text-zinc-400">下一步</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty description="请从左侧节点库添加流程节点" />
            )}
          </ProCard>

          <ProCard
            title={
              <div>
                <div className="text-sm font-semibold">节点配置</div>
                <div className="text-xs text-zinc-500">
                  选中流程节点后编辑参数
                </div>
              </div>
            }
            extra={<SettingOutlined className="text-zinc-400" />}
          >
            {selectedNode ? (
              <div>
                <div className="mb-3 flex items-center justify-between border-0 border-b border-solid border-zinc-100 pb-3">
                  <Text strong>
                    {
                      getFlowModuleMeta(flowModuleMap, selectedNode.nodeCode)
                        .label
                    }
                  </Text>
                  <Text type="secondary" className="text-xs">
                    #{selectedNode.id.slice(-6)}
                  </Text>
                </div>

                <Form layout="vertical">
                  <Form.Item label="步骤完成后等待时间（分钟）" required>
                    <InputNumber
                      value={selectedNodeForm.waitMinutes}
                      min={0}
                      step={1}
                      precision={0}
                      style={{ width: '100%' }}
                      onChange={(value) =>
                        handleStepConfigChange({
                          waitMinutes: Number(value) || 0,
                        })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="失败策略" required>
                    <Select<StepFailStrategy>
                      value={selectedNodeForm.failStrategy}
                      options={failStrategyOptions}
                      onChange={(value) =>
                        handleStepConfigChange({ failStrategy: value })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="跳过策略" required>
                    <Select<StepSkipStrategy>
                      value={selectedNodeForm.skipStrategy}
                      options={skipStrategyOptions}
                      onChange={(value) =>
                        handleStepConfigChange({ skipStrategy: value })
                      }
                    />
                  </Form.Item>

                  {selectedNode.nodeCode === 'ai_call' ? (
                    <Form.Item label="催收角色" required>
                      <Select<AiCallRole>
                        value={
                          selectedNodeForm.aiRole === ''
                            ? undefined
                            : selectedNodeForm.aiRole
                        }
                        options={aiCallRoleOptions}
                        onChange={handleAiCallRoleChange}
                      />
                    </Form.Item>
                  ) : selectedNode.nodeCode === 'corp_letter' ? (
                    <Form.Item label="印章" required>
                      <Select<string>
                        value={selectedNodeForm.sealId || undefined}
                        options={corpLetterSealOptions}
                        onChange={handleCorpLetterSealChange}
                      />
                    </Form.Item>
                  ) : (
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                      该节点类型暂无额外配置项
                    </div>
                  )}
                </Form>
              </div>
            ) : (
              <div className="py-6">
                <Empty description="请选择节点" />
              </div>
            )}
          </ProCard>
        </div>

        {activePersona ? (
          <div className="mt-3">
            <Title level={5} className="!mb-0 text-zinc-400">
              当前画像：{activePersonaName}
            </Title>
          </div>
        ) : null}
      </Spin>
    </PageContainer>
  );
};

export default CollectionStrategyFlowEditor;
