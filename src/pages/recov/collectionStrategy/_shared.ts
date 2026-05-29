import {
  ApartmentOutlined,
  CheckCircleOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  MailOutlined,
  PhoneOutlined,
  StopOutlined,
  UploadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ComponentType, CSSProperties } from 'react';
import type {
  FlowNodeTypeVO,
  StepExecutionConfig,
  StepFailStrategy,
  StepSkipStrategy,
  StrategyStep,
} from '@/services/ruoyi/collection-strategy';

export const aiCallRoleValues = [
  '项目员工',
  '企业法务',
  '企业客服',
  '律师',
] as const;

export type AiCallRole = string;

export type StrategyStepParams = {
  aiRole?: AiCallRole;
  scriptId?: string;
  [key: string]: unknown;
};

export type NormalizedStrategyStep = StrategyStep & {
  identity?: string;
  config: Required<StepExecutionConfig>;
  params: StrategyStepParams;
};

export type PreviewStep = NormalizedStrategyStep;

const frontendSupportedFlowNodeCodes = new Set([
  'ai_call',
  'corp_letter',
  'law_letter',
  'filing_material_submit',
]);

const frontendLegacyFlowNodeCodeMap: Record<string, string> = {
  litigation_screenshot: 'filing_material_submit',
};

export const normalizeFrontendFlowNodeCode = (nodeCode?: string) =>
  nodeCode ? (frontendLegacyFlowNodeCodeMap[nodeCode] ?? nodeCode) : '';

export const isFrontendSupportedFlowNode = (nodeCode?: string) =>
  !!nodeCode && frontendSupportedFlowNodeCodes.has(nodeCode);

type AntdIcon = ComponentType<{
  className?: string;
  style?: CSSProperties;
}>;

export type FlowModuleMeta = {
  code: string;
  label: string;
  icon: string;
  bgColor: string;
  iconColor: string;
  defaultIdentity?: string;
  description?: string;
};

export const FLOW_ICON_MAP: Record<string, AntdIcon> = {
  phone: PhoneOutlined,
  email: MailOutlined,
  pdf: FilePdfOutlined,
  screenshot: FileImageOutlined,
  upload: UploadOutlined,
  finish: CheckCircleOutlined,
  workflow: ApartmentOutlined,
  warning: WarningOutlined,
  blacklist: StopOutlined,
};

export const getFlowIconComponent = (icon: string): AntdIcon =>
  FLOW_ICON_MAP[icon] ?? ApartmentOutlined;

export const defaultStepConfig: Required<StepExecutionConfig> = {
  waitMinutes: 0,
  failStrategy: 'BLOCK',
  skipStrategy: 'TERMINATE',
};

export const buildInitialFlowModuleMap = (): Record<
  string,
  FlowModuleMeta
> => ({
  ai_call: {
    code: 'ai_call',
    label: '智能外呼',
    icon: 'phone',
    bgColor: '#3F51B5',
    iconColor: '#ffffff',
    defaultIdentity: '企业客服',
  },
  corp_letter: {
    code: 'corp_letter',
    label: '企业催收函',
    icon: 'email',
    bgColor: '#9C27B0',
    iconColor: '#ffffff',
  },
  law_letter: {
    code: 'law_letter',
    label: '律师函',
    icon: 'pdf',
    bgColor: '#FF9800',
    iconColor: '#ffffff',
  },
  filing_material_submit: {
    code: 'filing_material_submit',
    label: '发送申请诉讼截图',
    icon: 'screenshot',
    bgColor: '#0F766E',
    iconColor: '#ffffff',
  },
  litigation_screenshot: {
    code: 'litigation_screenshot',
    label: '提交立案截图',
    icon: 'upload',
    bgColor: '#5C6BC0',
    iconColor: '#ffffff',
  },
  litigation_result: {
    code: 'litigation_result',
    label: '立案结果',
    icon: 'finish',
    bgColor: '#5C6BC0',
    iconColor: '#ffffff',
  },
  lawyer_court: {
    code: 'lawyer_court',
    label: '律师代开庭',
    icon: 'workflow',
    bgColor: '#5C6BC0',
    iconColor: '#ffffff',
  },
  enforcement_screenshot: {
    code: 'enforcement_screenshot',
    label: '强制执行截图',
    icon: 'upload',
    bgColor: '#4CAF50',
    iconColor: '#ffffff',
  },
  enforcement_result: {
    code: 'enforcement_result',
    label: '强制执行结果',
    icon: 'finish',
    bgColor: '#4CAF50',
    iconColor: '#ffffff',
  },
  restrict_consumption: {
    code: 'restrict_consumption',
    label: '限制高消费',
    icon: 'warning',
    bgColor: '#607D8B',
    iconColor: '#ffffff',
  },
  credit_blacklist: {
    code: 'credit_blacklist',
    label: '列入失信人',
    icon: 'blacklist',
    bgColor: '#455A64',
    iconColor: '#ffffff',
  },
});

export const fallbackFlowModuleMeta: FlowModuleMeta = {
  code: 'unknown',
  label: '未知节点',
  icon: 'workflow',
  bgColor: '#64748b',
  iconColor: '#ffffff',
};

export const defaultFlowSteps: Array<
  Pick<StrategyStep, 'nodeCode' | 'identity'>
> = [
  { nodeCode: 'ai_call', identity: '项目员工' },
  { nodeCode: 'ai_call', identity: '企业客服' },
  { nodeCode: 'ai_call', identity: '企业法务' },
  { nodeCode: 'corp_letter' },
  { nodeCode: 'ai_call', identity: '律师' },
  { nodeCode: 'law_letter' },
  { nodeCode: 'filing_material_submit' },
];

const flowModuleLabelOverrideMap: Record<string, string> = {
  ai_call: '智能外呼',
  filing_material_submit: '发送申请诉讼截图',
};

export const aiCallRoleOptions: Array<{ label: string; value: AiCallRole }> =
  aiCallRoleValues.map((role) => ({ label: role, value: role }));

const legacyAiCallRoleMap: Record<string, AiCallRole> = {
  enterprise_service: '企业客服',
  enterprise_business: '企业法务',
  lawyer: '律师',
  企业商务: '企业法务',
  第三方律师: '律师',
};

export const normalizeAiCallRole = (role?: unknown): AiCallRole | undefined => {
  const value = typeof role === 'string' ? role.trim() : '';
  if (!value) return undefined;
  return legacyAiCallRoleMap[value] ?? value;
};

export const failStrategyOptions: Array<{
  label: string;
  value: StepFailStrategy;
}> = [
  { label: '阻塞流程', value: 'BLOCK' },
  { label: '继续下一步', value: 'CONTINUE' },
];

export const skipStrategyOptions: Array<{
  label: string;
  value: StepSkipStrategy;
}> = [
  { label: '终止流程', value: 'TERMINATE' },
  { label: '继续下一步', value: 'CONTINUE' },
];

export const failStrategyLabelMap: Record<StepFailStrategy, string> = {
  BLOCK: '失败阻断',
  CONTINUE: '失败继续',
};

export const skipStrategyLabelMap: Record<StepSkipStrategy, string> = {
  TERMINATE: '跳过终止',
  CONTINUE: '跳过继续',
};

export const isSamePersonaId = (
  left?: number | string | null,
  right?: number | string | null,
) => {
  if (left == null || right == null) return false;
  return String(left) === String(right);
};

type PersonaLike = {
  id?: number | string | null;
  personaName?: string | null;
};

export const defaultPersonaId = '0';
export const defaultPersonaName = '默认画像';

export const resolveDefaultPersonaId = (personas: PersonaLike[]) =>
  personas.find((item) => isSamePersonaId(item.id, defaultPersonaId))?.id ??
  personas.find((item) => item.personaName?.trim() === defaultPersonaName)
    ?.id ??
  defaultPersonaId;

export const getFlowModuleMeta = (
  flowModuleMap: Record<string, FlowModuleMeta>,
  nodeCode: string,
): FlowModuleMeta =>
  flowModuleMap[nodeCode] ?? {
    ...fallbackFlowModuleMeta,
    code: nodeCode,
    label: nodeCode || fallbackFlowModuleMeta.label,
  };

export const getNodeIdentityDisplayText = (
  flowModuleMap: Record<string, FlowModuleMeta>,
  step: Pick<NormalizedStrategyStep, 'nodeCode' | 'identity' | 'params'>,
) => {
  if (step.nodeCode === 'ai_call') {
    const aiRole = normalizeAiCallRole(step.params?.aiRole);
    if (aiRole) return aiRole;
    return (
      normalizeAiCallRole(step.identity) ??
      step.identity ??
      getFlowModuleMeta(flowModuleMap, step.nodeCode).defaultIdentity ??
      '企业客服'
    );
  }
  return '';
};

export const withDefaultStepConfig = (
  config?: StepExecutionConfig,
): Required<StepExecutionConfig> => ({
  waitMinutes: Number(config?.waitMinutes ?? defaultStepConfig.waitMinutes),
  failStrategy: (config?.failStrategy ??
    defaultStepConfig.failStrategy) as StepFailStrategy,
  skipStrategy: (config?.skipStrategy ??
    defaultStepConfig.skipStrategy) as StepSkipStrategy,
});

export const buildDefaultNodeParams = (
  nodeCode: string,
  identity?: string,
): StrategyStepParams => {
  if (nodeCode === 'ai_call') {
    return { aiRole: normalizeAiCallRole(identity) ?? '企业客服' };
  }
  return {};
};

export const sanitizeStepParams = (
  nodeCode: string,
  params: StrategyStepParams,
): StrategyStepParams => {
  const nextParams: StrategyStepParams = { ...params };
  if (nodeCode === 'ai_call') {
    const aiRole = normalizeAiCallRole(nextParams.aiRole);
    delete nextParams.scriptId;
    if (aiRole) {
      nextParams.aiRole = aiRole;
    } else {
      delete nextParams.aiRole;
    }
  } else {
    delete nextParams.aiRole;
    delete nextParams.scriptId;
  }
  delete nextParams.sealId;
  return nextParams;
};

export const createStepId = () =>
  `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const normalizeStep = (
  flowModuleMap: Record<string, FlowModuleMeta>,
  step: StrategyStep,
  idx: number,
): NormalizedStrategyStep => {
  const meta = getFlowModuleMeta(flowModuleMap, step.nodeCode);
  const identity =
    step.nodeCode === 'ai_call'
      ? (normalizeAiCallRole(step.params?.aiRole) ??
        normalizeAiCallRole(step.identity) ??
        step.identity ??
        meta.defaultIdentity ??
        '企业客服')
      : undefined;
  const baseParams = buildDefaultNodeParams(step.nodeCode, identity);
  const mergedParams: StrategyStepParams = {
    ...baseParams,
    ...((step.params as StrategyStepParams | undefined) ?? {}),
  };
  return {
    ...step,
    id: step.id || `step_${idx + 1}_${step.nodeCode || 'node'}`,
    nodeCode: step.nodeCode,
    identity,
    config: withDefaultStepConfig(step.config),
    params: sanitizeStepParams(step.nodeCode, mergedParams),
  };
};

export const normalizeSteps = (
  flowModuleMap: Record<string, FlowModuleMeta>,
  steps?: StrategyStep[],
): NormalizedStrategyStep[] => {
  if (!Array.isArray(steps) || steps.length === 0) return [];
  return steps
    .map((step) => {
      const nodeCode = normalizeFrontendFlowNodeCode(step.nodeCode);
      if (!nodeCode || nodeCode === step.nodeCode) return step;
      const meta = getFlowModuleMeta(flowModuleMap, nodeCode);
      return {
        ...step,
        nodeCode,
        identity: meta.defaultIdentity,
        params: {},
      };
    })
    .filter((step) => isFrontendSupportedFlowNode(step.nodeCode))
    .map((step, idx) => normalizeStep(flowModuleMap, step, idx));
};

export const buildDefaultSteps = (
  flowModuleMap: Record<string, FlowModuleMeta>,
): NormalizedStrategyStep[] =>
  defaultFlowSteps.map((step, idx) =>
    normalizeStep(
      flowModuleMap,
      {
        id: createStepId(),
        nodeCode: step.nodeCode,
        identity: step.identity,
        config: defaultStepConfig,
        params: buildDefaultNodeParams(step.nodeCode, step.identity ?? ''),
      },
      idx,
    ),
  );

export const upsertNodeTypeMeta = (
  flowModuleMap: Record<string, FlowModuleMeta>,
  nodeType: FlowNodeTypeVO,
): Record<string, FlowModuleMeta> => {
  if (!nodeType.code) return flowModuleMap;
  const current = flowModuleMap[nodeType.code];
  return {
    ...flowModuleMap,
    [nodeType.code]: {
      ...(current ?? {
        ...fallbackFlowModuleMeta,
        code: nodeType.code,
        defaultIdentity: nodeType.code === 'ai_call' ? '企业客服' : undefined,
      }),
      code: nodeType.code,
      label:
        flowModuleLabelOverrideMap[nodeType.code] ||
        nodeType.label ||
        current?.label ||
        nodeType.code,
      description: nodeType.description || current?.description,
    },
  };
};

export const cloneStrategySteps = (
  flowModuleMap: Record<string, FlowModuleMeta>,
  steps: NormalizedStrategyStep[],
): NormalizedStrategyStep[] =>
  steps.map((step, idx) =>
    normalizeStep(
      flowModuleMap,
      {
        ...step,
        config: { ...step.config },
        params: { ...step.params },
      },
      idx,
    ),
  );

export const validateStrategySteps = (
  steps: NormalizedStrategyStep[],
): string => {
  if (steps.length === 0) return '请至少保留一个流程步骤';

  const seenIds = new Set<string>();
  for (const step of steps) {
    if (!step.id) return '步骤实例 ID 不能为空';
    if (seenIds.has(step.id)) return `步骤实例 ID 重复：${step.id}`;
    seenIds.add(step.id);
    if (step.config.waitMinutes < 0) return '触发前等待不能小于 0';
    if (step.nodeCode === 'ai_call' && !step.params?.aiRole) {
      return '智能外呼步骤必须配置催收角色';
    }
  }
  return '';
};

export const resolveFlowPreviewColumns = (width: number) => {
  if (width >= 1020) return 6;
  if (width >= 820) return 5;
  if (width >= 620) return 4;
  if (width >= 440) return 3;
  return 1;
};
