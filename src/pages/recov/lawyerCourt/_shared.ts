import {
  BankOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { createElement, type ReactNode } from 'react';
import type { MetricTone } from '@/pages/recov/components/MetricIcon';
import { toNumber } from '@/pages/recov/settle/_shared';
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
  tone: MetricTone;
};

export const OVERVIEW_CARD_METAS: OverviewCardMeta[] = [
  {
    key: 'collaborationCaseCount',
    label: '需协作案件',
    format: 'count',
    unit: '个',
    icon: createElement(FileSearchOutlined),
    tone: 'primary',
  },
  {
    key: 'coveredCityCount',
    label: '覆盖城市',
    format: 'count',
    unit: '个',
    icon: createElement(EnvironmentOutlined),
    tone: 'info',
  },
  {
    key: 'matchedCaseCount',
    label: '已匹配律师',
    format: 'count',
    unit: '个案件',
    icon: createElement(TeamOutlined),
    tone: 'success',
  },
  {
    key: 'unmatchedCaseCount',
    label: '待匹配律师',
    format: 'count',
    unit: '个案件',
    icon: createElement(UserSwitchOutlined),
    tone: 'warning',
  },
  {
    key: 'totalCaseAmount',
    label: '涉案总金额',
    format: 'currency',
    icon: createElement(DollarOutlined),
    tone: 'primary',
  },
  {
    key: 'avgCaseAmount',
    label: '件均标的额',
    format: 'currency',
    icon: createElement(BankOutlined),
    tone: 'neutral',
  },
];

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
    const primary = `${toNumber(value).toLocaleString('zh-CN')}元`;
    return {
      primary,
      tooltip: primary,
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
  `${toNumber(value).toLocaleString('zh-CN')}元`;
