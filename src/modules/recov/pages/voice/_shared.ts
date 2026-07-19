import {
  AuditOutlined,
  CustomerServiceOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ComponentType, CSSProperties } from 'react';
import type {
  ConcurrencyConfigVo,
  VoiceLibraryQuery,
} from '@/modules/recov/services/voice';

type AntdIcon = ComponentType<{
  className?: string;
  style?: CSSProperties;
}>;

export type IdentityMeta = {
  icon: AntdIcon;
  description: string;
};

export const IDENTITY_META: Record<string, IdentityMeta> = {
  项目员工: {
    icon: UserOutlined,
    description: '亲切自然，侧重于服务满意度调查、物业关怀与日常提醒',
  },
  企业客服: {
    icon: CustomerServiceOutlined,
    description: '温和从容，侧重于理解与沟通',
  },
  企业法务: {
    icon: SolutionOutlined,
    description: '专业严谨，侧重于企业管理规范与法律风险',
  },
  律师: {
    icon: AuditOutlined,
    description: '第二方中立与权威，侧重于事件还原与法律告知',
  },
};

export const FALLBACK_IDENTITY_META: IdentityMeta = {
  icon: UserOutlined,
  description: '',
};

export const getIdentityMeta = (identityName: string): IdentityMeta =>
  IDENTITY_META[identityName] ?? FALLBACK_IDENTITY_META;

export const EMPLOYEE_NAME_PREFIX: Record<string, string> = {
  项目员工: '项目员工',
  企业客服: '企业客服',
  企业法务: '企业法务',
  律师: '律师',
};

export const getEmployeeNamePrefix = (identityName: string): string =>
  EMPLOYEE_NAME_PREFIX[identityName] ?? '';

export type VoiceListTab = '男' | '女';

export const VOICE_TAB_OPTIONS: Array<{ label: string; value: VoiceListTab }> =
  [
    { label: '男声', value: '男' },
    { label: '女声', value: '女' },
  ];

export const VOICE_TAB_TITLE: Record<VoiceListTab, string> = {
  男: '男声',
  女: '女声',
};

export const buildVoiceQuery = (
  tab: VoiceListTab,
  pageNum: number,
  pageSize: number,
): VoiceLibraryQuery => {
  return {
    pageNum,
    pageSize,
    gender: tab,
  };
};

export const getVoiceGenderLabel = (gender: string): string => {
  if (gender === '男') return '男声';
  if (gender === '女') return '女声';
  return '未标注';
};

export type VoiceGenderTagThemeToken = {
  colorPrimary: string;
  colorPrimaryBg: string;
  colorPrimaryBorder: string;
};

export const getVoiceGenderTagStyle = ({
  colorPrimary,
  colorPrimaryBg,
  colorPrimaryBorder,
}: VoiceGenderTagThemeToken): CSSProperties => ({
  backgroundColor: colorPrimaryBg,
  borderColor: colorPrimaryBorder,
  color: colorPrimary,
});

export const getVoiceAvatarBg = (gender: string): string => {
  if (gender === '女') return '#f472b6';
  if (gender === '男') return '#3b82f6';
  return '#94a3b8';
};

export type ConcurrencyFormState = ConcurrencyConfigVo;

export const defaultConcurrencyForm: ConcurrencyFormState = {
  maxConcurrency: 300,
  maxRetry: 3,
  retryInterval: 30,
};

export const RETRY_INTERVAL_FALLBACK_OPTIONS = [
  { label: '5 分钟', value: '5' },
  { label: '10 分钟', value: '10' },
  { label: '15 分钟', value: '15' },
  { label: '30 分钟', value: '30' },
  { label: '60 分钟', value: '60' },
];

export const isConcurrencySnapshotEqual = (
  a: ConcurrencyFormState,
  b: ConcurrencyFormState,
): boolean =>
  Number(a.maxConcurrency) === Number(b.maxConcurrency) &&
  Number(a.maxRetry) === Number(b.maxRetry) &&
  Number(a.retryInterval) === Number(b.retryInterval);

export type IdentityConfigSnapshot = {
  genderMatch: string;
  maleVoiceGender: string | null;
  femaleVoiceGender: string | null;
};

export const isIdentityConfigSnapshotEqual = (
  a: IdentityConfigSnapshot,
  b: IdentityConfigSnapshot,
): boolean =>
  a.genderMatch === b.genderMatch &&
  (a.maleVoiceGender ?? null) === (b.maleVoiceGender ?? null) &&
  (a.femaleVoiceGender ?? null) === (b.femaleVoiceGender ?? null);

export type EmployeeNameValidationResult = {
  valid: boolean;
  message?: string;
};

export const validateEmployeeName = (
  prefix: string,
  rawName: string,
): EmployeeNameValidationResult => {
  const name = (rawName ?? '').trim();
  if (!name) return { valid: false, message: '请输入员工姓名' };
  const fullName = `${prefix}${name}`;
  if (fullName.length > 20) {
    return {
      valid: false,
      message: `完整姓名长度不能超过 20 个字符，当前前缀为「${prefix}」`,
    };
  }
  return { valid: true };
};

export const getEmployeeNameMaxLength = (prefix: string): number =>
  Math.max(1, 20 - prefix.length);
