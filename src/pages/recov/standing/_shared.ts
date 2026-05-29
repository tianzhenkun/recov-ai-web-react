import {
  IdcardOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import type {
  StandingCode,
  StandingForm,
  StandingRangeVO,
  StandingVO,
} from '@/services/ruoyi/standing';

export type StandingTypeDef = {
  code: StandingCode;
  label: string;
  icon: typeof SolutionOutlined;
};

export const STANDING_TYPES: StandingTypeDef[] = [
  {
    code: 'PLAINTIFF_LICENSE',
    label: '原告营业执照',
    icon: SolutionOutlined,
  },
  {
    code: 'LEGAL_REP_ID_CARD',
    label: '法人身份证',
    icon: IdcardOutlined,
  },
  {
    code: 'LEGAL_REP_CERT',
    label: '法人身份证明',
    icon: SafetyCertificateOutlined,
  },
];

export const DEFAULT_STANDING_RANGE: StandingRangeVO = {
  usedRanges: [],
  wildcardUsed: false,
  minAvailable: null,
  maxAvailable: null,
};

export type UsedRangeRef = {
  startNum: number;
  endNum: number;
  standingName: string;
};

export const getStandingTypeName = (code?: string) =>
  STANDING_TYPES.find((item) => item.code === code)?.label || code || '-';

export const normalizeRangeBoundary = (value: unknown): number | null => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : null;
};

export const hasAvailableStandingRange = (
  rangeInfo: StandingRangeVO,
): boolean => {
  const minAvailable = normalizeRangeBoundary(rangeInfo.minAvailable);
  const maxAvailable = normalizeRangeBoundary(rangeInfo.maxAvailable);
  return (
    minAvailable != null && maxAvailable != null && minAvailable <= maxAvailable
  );
};

export const defaultStandingForm = (): StandingForm => ({
  id: undefined,
  standingCode: 'PLAINTIFF_LICENSE',
  standingName: '',
  standingOssId: '',
  status: '1',
  startNum: null,
  endNum: null,
});

export const pickUsedRangesInSameType = (
  items: StandingVO[] | undefined,
  standingCode?: string,
  excludeId?: number | string,
): UsedRangeRef[] => {
  if (!items || items.length === 0) return [];
  return items
    .filter(
      (item) =>
        item.standingCode === standingCode &&
        item.id !== excludeId &&
        item.status === '1' &&
        item.startNum != null &&
        item.endNum != null,
    )
    .map((item) => ({
      startNum: item.startNum as number,
      endNum: item.endNum as number,
      standingName: item.standingName,
    }));
};

export type RangeIssues = {
  partialRange: boolean;
  rangeOrderInvalid: boolean;
  rangeOutOfBounds: boolean;
  rangeConflict: boolean;
  wildcardConflict: boolean;
  conflictDetail: string;
};

export const computeRangeIssues = (input: {
  startNum: number | null | undefined;
  endNum: number | null | undefined;
  rangeInfo: StandingRangeVO;
  usedRanges: UsedRangeRef[];
  wildcardUsed?: boolean;
}): RangeIssues => {
  const { startNum, endNum, rangeInfo, usedRanges, wildcardUsed } = input;

  const partialRange =
    (startNum == null && endNum != null) ||
    (startNum != null && endNum == null);
  const wildcardConflict = startNum == null && endNum == null && !!wildcardUsed;
  const rangeOrderInvalid =
    startNum != null && endNum != null && endNum < startNum;

  const minAvailable = normalizeRangeBoundary(rangeInfo.minAvailable);
  const maxAvailable = normalizeRangeBoundary(rangeInfo.maxAvailable);
  const hasAvailableRange =
    minAvailable != null &&
    maxAvailable != null &&
    minAvailable <= maxAvailable;
  let rangeOutOfBounds = false;
  if (
    hasAvailableRange &&
    startNum != null &&
    (startNum < minAvailable || startNum > maxAvailable)
  ) {
    rangeOutOfBounds = true;
  }
  if (
    hasAvailableRange &&
    !rangeOutOfBounds &&
    endNum != null &&
    (endNum < minAvailable || endNum > maxAvailable)
  ) {
    rangeOutOfBounds = true;
  }
  if (!hasAvailableRange && (startNum != null || endNum != null)) {
    rangeOutOfBounds = true;
  }

  let rangeConflict = false;
  let conflictDetail = '';
  if (startNum != null && endNum != null) {
    const hit = usedRanges.find(
      (range) => startNum <= range.endNum && endNum >= range.startNum,
    );
    if (hit) {
      rangeConflict = true;
      conflictDetail = `与「${hit.standingName}」(${hit.startNum}-${hit.endNum}) 冲突`;
    }
  }

  return {
    partialRange,
    rangeOrderInvalid,
    rangeOutOfBounds,
    rangeConflict,
    wildcardConflict,
    conflictDetail,
  };
};

export const attachStandingFile = (
  items: StandingVO[],
  ossMap: Map<string, { url?: string; name?: string }>,
): StandingVO[] =>
  items.map((item) => {
    if (item.standingOssId == null) return { ...item };
    const oss = ossMap.get(String(item.standingOssId));
    return {
      ...item,
      fileUrl: oss?.url,
      fileName: oss?.name,
    };
  });
