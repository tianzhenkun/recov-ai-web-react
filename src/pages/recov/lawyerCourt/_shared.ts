import {
  BankOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { createElement, type ReactNode } from 'react';
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  toNumber,
} from '@/pages/recov/settle/_shared';
import type {
  LawyerCourtOverviewVO,
  LawyerCourtTab,
  MatchedLawyerRowVO,
  UnmatchedCaseRowVO,
} from '@/services/ruoyi/lawyer-court';

export const PAGE_TITLE = '律师代开庭引擎';
export const DEFAULT_PAGE_SIZE = 10;

export type {
  LawyerCourtOverviewVO,
  LawyerCourtTab,
  MatchedLawyerRowVO,
  UnmatchedCaseRowVO,
};

export type OverviewCardMeta = {
  key: keyof LawyerCourtOverviewVO;
  label: string;
  format: 'count' | 'currency';
  unit?: string;
  icon: ReactNode;
  color: string;
};

export const OVERVIEW_CARD_METAS: OverviewCardMeta[] = [
  {
    key: 'collaborationCaseCount',
    label: '需协作案件',
    format: 'count',
    unit: '个',
    icon: createElement(FileSearchOutlined),
    color: '#1677ff',
  },
  {
    key: 'coveredCityCount',
    label: '覆盖城市',
    format: 'count',
    unit: '个',
    icon: createElement(EnvironmentOutlined),
    color: '#722ed1',
  },
  {
    key: 'matchedCaseCount',
    label: '已匹配律师',
    format: 'count',
    unit: '个案件',
    icon: createElement(TeamOutlined),
    color: '#52c41a',
  },
  {
    key: 'unmatchedCaseCount',
    label: '待匹配律师',
    format: 'count',
    unit: '个案件',
    icon: createElement(UserSwitchOutlined),
    color: '#fa8c16',
  },
  {
    key: 'totalCaseAmount',
    label: '涉案总金额',
    format: 'currency',
    icon: createElement(DollarOutlined),
    color: '#6366f1',
  },
  {
    key: 'avgCaseAmount',
    label: '件均标的额',
    format: 'currency',
    icon: createElement(BankOutlined),
    color: '#eb2f96',
  },
];

export const MATCH_STRATEGIES = [
  {
    key: 'fee',
    label: '代开庭费用最低',
    tooltip: '优先匹配代开庭费用更低的律师资源',
  },
  {
    key: 'region',
    label: '地域匹配',
    tooltip: '按案件所在城市与律师执业区域匹配',
  },
  {
    key: 'multi',
    label: '多维度匹配',
    tooltip: '综合费用、地域、评分与办案经验',
  },
] as const;

export const TAB_OPTIONS: { label: string; value: LawyerCourtTab }[] = [
  { label: '已匹配律师', value: 'matched' },
  { label: '未匹配律师', value: 'unmatched' },
];

export const formatOverviewValue = (
  value: unknown,
  format: OverviewCardMeta['format'],
  unit?: string,
) => {
  if (format === 'currency') {
    return {
      primary: formatCompactCurrencyDisplay(value),
      tooltip: formatCurrencyDisplay(value),
      unit: undefined,
    };
  }
  return {
    primary: toNumber(value).toLocaleString('zh-CN'),
    tooltip: undefined,
    unit,
  };
};

export const formatDisplayMoney = (value: unknown) =>
  formatCurrencyDisplay(value);
