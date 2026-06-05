import {
  AuditOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type {
  LawyerAccountForm,
  SealCode,
  SealForm,
  SealRangeVO,
  SealTypeVO,
  SealVO,
} from '@/services/ruoyi/seal';

export type SealColumnDef = {
  code: SealCode;
  label: string;
  icon: typeof BankOutlined;
};

export const SEAL_COLUMNS: SealColumnDef[] = [
  {
    code: 'company_seal',
    label: '企业章',
    icon: BankOutlined,
  },
  {
    code: 'lawyer_seal',
    label: '律师章',
    icon: AuditOutlined,
  },
  {
    code: 'law_firm_seal',
    label: '律所章',
    icon: SafetyCertificateOutlined,
  },
];

export const SEAL_CODE_SET: ReadonlySet<string> = new Set(
  SEAL_COLUMNS.map((col) => col.code),
);

export const DEFAULT_SEAL_RANGE: SealRangeVO = {
  usedRanges: [],
  minAvailable: null,
  maxAvailable: null,
};

/**
 * 只保留数字字符（与 Vue 的 handleRangeInput 行为一致）。
 */
export const parseRangeInput = (value: string | number | null | undefined) => {
  const raw = String(value ?? '').replace(/[^\d]/g, '');
  return raw ? Number(raw) : null;
};

export const normalizeRangeBoundary = (value: unknown): number | null => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : null;
};

export const hasAvailableSealRange = (rangeInfo: SealRangeVO): boolean => {
  const minAvailable = normalizeRangeBoundary(rangeInfo.minAvailable);
  const maxAvailable = normalizeRangeBoundary(rangeInfo.maxAvailable);
  return (
    minAvailable != null && maxAvailable != null && minAvailable <= maxAvailable
  );
};

export type UsedRangeRef = {
  startNum: number;
  endNum: number;
  sealName: string;
};

/**
 * 从同栏数据中筛出已占用的范围（用于编辑时排除自身）。
 */
export const pickUsedRangesInSameType = (
  items: SealVO[] | undefined,
  excludeId?: number | string,
): UsedRangeRef[] => {
  if (!items || items.length === 0) return [];
  return items
    .filter(
      (item) =>
        item.id !== excludeId && item.startNum != null && item.endNum != null,
    )
    .map((item) => ({
      startNum: item.startNum as number,
      endNum: item.endNum as number,
      sealName: item.sealName,
    }));
};

export type RangeIssues = {
  rangeOrderInvalid: boolean;
  rangeOutOfBounds: boolean;
  rangeConflict: boolean;
  conflictDetail: string;
};

/**
 * 与 Vue 端 rangeOrderInvalid / rangeOutOfBounds / rangeConflict / conflictDetail 1:1 对齐。
 */
export const computeRangeIssues = (input: {
  startNum: number | null | undefined;
  endNum: number | null | undefined;
  rangeInfo: SealRangeVO;
  usedRanges: UsedRangeRef[];
}): RangeIssues => {
  const { startNum, endNum, rangeInfo, usedRanges } = input;

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
      conflictDetail = `与「${hit.sealName}」(${hit.startNum}-${hit.endNum}) 冲突`;
    }
  }

  return { rangeOrderInvalid, rangeOutOfBounds, rangeConflict, conflictDetail };
};

/**
 * code → name 映射，与 Vue getInstrumentTypeName 一致。
 */
export const pickInstrumentTypeName = (
  sealTypeList: SealTypeVO[] | undefined,
  code: string,
) => {
  const hit = sealTypeList?.find((item) => item.code === code);
  return hit ? hit.name : code;
};

export const defaultSealForm = (
  sealCode: SealCode = 'company_seal',
): SealForm => ({
  id: undefined,
  sealCode,
  sealName: '',
  instrumentTypeCodes: [],
  sealOssId: '',
  startNum: null,
  endNum: null,
});

export type LawyerModalState = LawyerAccountForm & {
  sealName: string;
};

export const defaultLawyerForm = (): LawyerModalState => ({
  id: 0,
  sealName: '',
  lawyerUsername: '',
  lawyerPassword: '',
  accountIdentity: '律师用户',
});

/**
 * 用 sealCode 取栏目元信息。
 */
export const getSealColumn = (sealCode: string) =>
  SEAL_COLUMNS.find((col) => col.code === sealCode);

/**
 * 在加载完成后向卡片对象注入预览 URL。返回的是同一个引用以便上游写回 state。
 */
export const attachSealUrl = (
  items: SealVO[],
  ossMap: Map<string, string | undefined>,
): SealVO[] =>
  items.map((item) =>
    item.sealOssId
      ? { ...item, sealUrl: ossMap.get(String(item.sealOssId)) }
      : { ...item },
  );
