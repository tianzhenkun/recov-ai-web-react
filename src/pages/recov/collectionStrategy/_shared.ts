import {
  ApartmentOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
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

export type AiCallRole =
  | 'enterprise_service'
  | 'enterprise_business'
  | 'lawyer';

export type StrategyStepParams = {
  aiRole?: AiCallRole;
  sealId?: string;
  scriptId?: string;
};

export type NormalizedStrategyStep = StrategyStep & {
  identity: string;
  config: Required<StepExecutionConfig>;
  params: StrategyStepParams;
};

export type PreviewStep = NormalizedStrategyStep;

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
  defaultIdentity: string;
  description?: string;
};

export const FLOW_ICON_MAP: Record<string, AntdIcon> = {
  phone: PhoneOutlined,
  email: MailOutlined,
  pdf: FilePdfOutlined,
  filing: FileDoneOutlined,
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
    label: 'AI 电话催收',
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
    defaultIdentity: '企业法务',
  },
  law_letter: {
    code: 'law_letter',
    label: '律师函',
    icon: 'pdf',
    bgColor: '#FF9800',
    iconColor: '#ffffff',
    defaultIdentity: '律师',
  },
  filing_material_submit: {
    code: 'filing_material_submit',
    label: '立案材料提交',
    icon: 'filing',
    bgColor: '#0F766E',
    iconColor: '#ffffff',
    defaultIdentity: '立案专员',
    description:
      '生成并盖章立案材料，校验原告主体资格材料，提交 RPA 后等待外部回调。',
  },
  litigation_screenshot: {
    code: 'litigation_screenshot',
    label: '提交立案截图',
    icon: 'upload',
    bgColor: '#5C6BC0',
    iconColor: '#ffffff',
    defaultIdentity: '律师',
  },
  litigation_result: {
    code: 'litigation_result',
    label: '立案结果',
    icon: 'finish',
    bgColor: '#5C6BC0',
    iconColor: '#ffffff',
    defaultIdentity: '律师',
  },
  lawyer_court: {
    code: 'lawyer_court',
    label: '律师代开庭',
    icon: 'workflow',
    bgColor: '#5C6BC0',
    iconColor: '#ffffff',
    defaultIdentity: '律师',
  },
  enforcement_screenshot: {
    code: 'enforcement_screenshot',
    label: '强制执行截图',
    icon: 'upload',
    bgColor: '#4CAF50',
    iconColor: '#ffffff',
    defaultIdentity: '律师',
  },
  enforcement_result: {
    code: 'enforcement_result',
    label: '强制执行结果',
    icon: 'finish',
    bgColor: '#4CAF50',
    iconColor: '#ffffff',
    defaultIdentity: '律师',
  },
  restrict_consumption: {
    code: 'restrict_consumption',
    label: '限制高消费',
    icon: 'warning',
    bgColor: '#607D8B',
    iconColor: '#ffffff',
    defaultIdentity: '法院',
  },
  credit_blacklist: {
    code: 'credit_blacklist',
    label: '列入失信人',
    icon: 'blacklist',
    bgColor: '#455A64',
    iconColor: '#ffffff',
    defaultIdentity: '法院',
  },
});

export const fallbackFlowModuleMeta: FlowModuleMeta = {
  code: 'unknown',
  label: '未知节点',
  icon: 'workflow',
  bgColor: '#64748b',
  iconColor: '#ffffff',
  defaultIdentity: '系统',
};

export const defaultFlowSteps: Array<
  Pick<StrategyStep, 'nodeCode' | 'identity'>
> = [
  { nodeCode: 'ai_call', identity: '企业客服' },
  { nodeCode: 'corp_letter', identity: '企业法务' },
  { nodeCode: 'law_letter', identity: '律师' },
  { nodeCode: 'litigation_screenshot', identity: '律师' },
  { nodeCode: 'litigation_result', identity: '律师' },
];

export const aiCallRoleOptions: Array<{ label: string; value: AiCallRole }> = [
  { label: '企业客服', value: 'enterprise_service' },
  { label: '企业商务', value: 'enterprise_business' },
  { label: '律师', value: 'lawyer' },
];

export const corpLetterSealOptions: Array<{ label: string; value: string }> = [
  { label: '企业默认公章', value: 'company_default' },
  { label: '合同专用章', value: 'contract_seal' },
  { label: '法务专用章', value: 'legal_seal' },
];

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
    const roleMap: Record<AiCallRole, string> = {
      enterprise_service: '企业客服',
      enterprise_business: '企业商务',
      lawyer: '律师',
    };
    const aiRole = step.params?.aiRole;
    if (aiRole && roleMap[aiRole]) return roleMap[aiRole];
    return (
      step.identity ??
      getFlowModuleMeta(flowModuleMap, step.nodeCode).defaultIdentity
    );
  }
  return (
    step.identity ??
    getFlowModuleMeta(flowModuleMap, step.nodeCode).defaultIdentity
  );
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
  identity: string,
): StrategyStepParams => {
  if (nodeCode === 'ai_call') {
    const roleByIdentity: Record<string, AiCallRole> = {
      企业客服: 'enterprise_service',
      企业商务: 'enterprise_business',
      律师: 'lawyer',
    };
    return { aiRole: roleByIdentity[identity] ?? 'enterprise_service' };
  }
  if (nodeCode === 'corp_letter') return { sealId: 'company_default' };
  return {};
};

export const sanitizeStepParams = (
  nodeCode: string,
  params: StrategyStepParams,
): StrategyStepParams => {
  const nextParams: StrategyStepParams = { ...params };
  if (nodeCode === 'ai_call') delete nextParams.scriptId;
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
  const identity = step.identity || meta.defaultIdentity;
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
  return steps.map((step, idx) => normalizeStep(flowModuleMap, step, idx));
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
        defaultIdentity: '系统',
      }),
      code: nodeType.code,
      label: nodeType.label || current?.label || nodeType.code,
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
      return 'AI 电话催收步骤必须配置催收角色';
    }
    if (step.nodeCode === 'corp_letter' && !step.params?.sealId) {
      return '企业催收函步骤必须配置印章';
    }
  }
  return '';
};

export const resolveFlowPreviewColumns = (width: number) => {
  if (width >= 1500) return 10;
  if (width >= 1260) return 8;
  if (width >= 1020) return 6;
  if (width >= 820) return 5;
  if (width >= 620) return 4;
  if (width >= 440) return 3;
  return 1;
};
