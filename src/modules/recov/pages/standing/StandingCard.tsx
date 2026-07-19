import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Switch, Tag, Tooltip, theme } from 'antd';
import dayjs from 'dayjs';
import React, { type ReactNode } from 'react';
import type { StandingVO } from '@/modules/recov/services/standing';
import { getStandingTypeName } from './_shared';

export type StandingCardProps = {
  item: StandingVO;
  switching?: boolean;
  retrying?: boolean;
  onPreview: (item: StandingVO) => void;
  onDownload: (item: StandingVO) => void;
  onEdit: (item: StandingVO) => void;
  onDelete: (item: StandingVO) => void;
  onToggleStatus: (item: StandingVO, nextStatus: '0' | '1') => void;
  onRetryParse?: (item: StandingVO) => void;
};

type CardAction = {
  key: string;
  title: string;
  icon: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  loading?: boolean;
  onClick: () => void;
};

const PARSE_SUPPORTED_CODES = new Set(['LEGAL_REP_ID_CARD', 'LEGAL_REP_CERT']);

const isEmptyRangeValue = (value: unknown) => value == null || value === '';

const formatRange = (record: StandingVO) => {
  const startEmpty = isEmptyRangeValue(record.startNum);
  const endEmpty = isEmptyRangeValue(record.endNum);
  if (startEmpty && endEmpty) {
    return '全部资产';
  }
  return `${startEmpty ? '-' : record.startNum} - ${
    endEmpty ? '-' : record.endNum
  }`;
};

const isParseSupported = (code?: string) =>
  !!code && PARSE_SUPPORTED_CODES.has(code);

const getParseStatusMeta = (status?: string | null) => {
  switch (status) {
    case 'PENDING':
      return { label: '待解析', color: 'blue' };
    case 'RUNNING':
      return { label: '解析中', color: 'processing' };
    case 'SUCCESS':
      return { label: '解析成功', color: 'success' };
    case 'PARTIAL':
      return { label: '部分成功', color: 'warning' };
    case 'FAILED':
      return { label: '解析失败', color: 'error' };
    default:
      return { label: '未解析', color: 'default' };
  }
};

export const getParseStatusTooltipTitle = (item: StandingVO) => {
  const parseMeta = getParseStatusMeta(item.parseStatus);
  if (item.parseStatus === 'FAILED' && item.parseErrorMessage) {
    return item.parseErrorMessage;
  }

  const parsedFieldCandidates: Array<[string, unknown]> =
    item.standingCode === 'LEGAL_REP_CERT'
      ? [['联系电话', item.legalRepPhone]]
      : [
          ['姓名', item.legalRepName],
          ['身份证号', item.legalRepIdCard],
          ['年龄', item.legalRepAge],
          ['联系地址', item.legalRepAddress],
        ];

  const parsedFields = parsedFieldCandidates
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    )
    .map(([label, value]) => `${label}：${value}`);

  if (
    (item.parseStatus === 'SUCCESS' || item.parseStatus === 'PARTIAL') &&
    parsedFields.length > 0
  ) {
    return parsedFields.join('\n');
  }

  return item.parseErrorMessage || parseMeta.label;
};

export const shouldShowRetryParseAction = (
  item: StandingVO,
  onRetryParse?: StandingCardProps['onRetryParse'],
) =>
  isParseSupported(item.standingCode) &&
  item.parseStatus !== 'SUCCESS' &&
  Boolean(onRetryParse);

const StandingCard = ({
  item,
  switching,
  retrying,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onToggleStatus,
  onRetryParse,
}: StandingCardProps) => {
  const { token } = theme.useToken();
  const enabled = item.status === '1';
  const standingId = String(item.id);
  const shortStandingId =
    standingId.length > 12
      ? `${standingId.slice(0, 8)}...${standingId.slice(-4)}`
      : standingId;
  const updateLabel = item.updateTime
    ? dayjs(item.updateTime).format('YYYY-MM-DD HH:mm')
    : '-';
  const rangeLabel = formatRange(item);
  const standingTypeLabel = getStandingTypeName(item.standingCode);
  const parseSupported = isParseSupported(item.standingCode);
  const parseMeta = getParseStatusMeta(item.parseStatus);
  const parseBusy =
    item.parseStatus === 'PENDING' || item.parseStatus === 'RUNNING';
  const retryDisabled = parseBusy;
  const retryTooltip = parseBusy ? '解析处理中' : '重新解析';
  const parseStatusTooltipTitle = getParseStatusTooltipTitle(item);
  const actions: CardAction[] = [
    {
      key: 'preview',
      title: '预览',
      icon: <EyeOutlined />,
      disabled: !item.fileUrl,
      onClick: () => onPreview(item),
    },
    {
      key: 'download',
      title: '下载',
      icon: <DownloadOutlined />,
      onClick: () => onDownload(item),
    },
  ];
  if (shouldShowRetryParseAction(item, onRetryParse)) {
    actions.push({
      key: 'retryParse',
      title: retryTooltip,
      icon: <ReloadOutlined />,
      disabled: retryDisabled,
      loading: retrying,
      onClick: () => onRetryParse?.(item),
    });
  }
  actions.push(
    {
      key: 'edit',
      title: '编辑',
      icon: <EditOutlined />,
      onClick: () => onEdit(item),
    },
    {
      key: 'delete',
      title: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDelete(item),
    },
  );
  const primaryTagStyle = {
    backgroundColor: token.colorPrimaryBg,
    borderColor: token.colorPrimaryBorder,
    color: token.colorPrimaryText,
  };
  const parseStatusTagStyle =
    item.parseStatus === 'SUCCESS' ? primaryTagStyle : undefined;
  const parseStatusTagColor =
    item.parseStatus === 'SUCCESS' ? undefined : parseMeta.color;

  return (
    <div className="rounded-xl border border-solid border-zinc-100 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-solid border-zinc-100 bg-zinc-50">
            <FilePdfOutlined className="text-2xl text-red-500" />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <span
                className="truncate text-base font-semibold text-zinc-900"
                title={item.standingName}
              >
                {item.standingName}
              </span>
            </div>
            <Tooltip title={standingId}>
              <span className="font-mono text-xs text-zinc-400">
                编号 {shortStandingId}
              </span>
            </Tooltip>
          </div>
        </div>
        <Tooltip title={enabled ? '停用材料' : '启用材料'}>
          <Switch
            size="small"
            checked={enabled}
            loading={switching}
            onChange={(checked) => onToggleStatus(item, checked ? '1' : '0')}
          />
        </Tooltip>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs font-medium text-zinc-400">材料类型</span>
          <Tag variant="filled" className="!mr-0" style={primaryTagStyle}>
            {standingTypeLabel}
          </Tag>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs font-medium text-zinc-400">资产范围</span>
          <Tag variant="filled" className="!mr-0" style={primaryTagStyle}>
            {rangeLabel}
          </Tag>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs font-medium text-zinc-400">更新时间</span>
          <span className="text-zinc-700">{updateLabel}</span>
        </div>
        {parseSupported ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-medium text-zinc-400">解析状态</span>
            <Tooltip
              title={parseStatusTooltipTitle}
              styles={{ container: { whiteSpace: 'pre-line' } }}
            >
              <Tag
                color={parseStatusTagColor}
                className="!mr-0"
                style={parseStatusTagStyle}
              >
                {parseMeta.label}
              </Tag>
            </Tooltip>
          </div>
        ) : null}
      </div>

      <div
        className="-mx-4 -mb-4 mt-4 grid overflow-hidden rounded-b-xl border-t border-solid border-zinc-100 bg-zinc-50/50"
        style={{
          gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
        }}
      >
        {actions.map((action, index) => (
          <div
            key={action.key}
            className={`flex h-12 items-center justify-center${
              index > 0
                ? ' border-l border-y-0 border-r-0 border-solid border-zinc-100'
                : ''
            }`}
          >
            <Tooltip title={action.title}>
              <Button
                type="text"
                danger={action.danger}
                icon={action.icon}
                aria-label={action.title}
                disabled={action.disabled}
                loading={action.loading}
                className="!h-8 !w-8"
                onClick={action.onClick}
              />
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StandingCard;
