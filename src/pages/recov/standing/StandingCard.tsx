import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { Button, Switch, Tag, Tooltip, theme } from 'antd';
import dayjs from 'dayjs';
import type { StandingVO } from '@/services/ruoyi/standing';
import { getStandingTypeName } from './_shared';

export type StandingCardProps = {
  item: StandingVO;
  switching?: boolean;
  onPreview: (item: StandingVO) => void;
  onDownload: (item: StandingVO) => void;
  onEdit: (item: StandingVO) => void;
  onDelete: (item: StandingVO) => void;
  onToggleStatus: (item: StandingVO, nextStatus: '0' | '1') => void;
};

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

const StandingCard = ({
  item,
  switching,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onToggleStatus,
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
  const primaryTagStyle = {
    backgroundColor: token.colorPrimaryBg,
    borderColor: token.colorPrimaryBorder,
    color: token.colorPrimaryText,
  };

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
      </div>

      <div className="-mx-4 -mb-4 mt-4 grid grid-cols-4 overflow-hidden rounded-b-xl border-t border-solid border-zinc-100 bg-zinc-50/50">
        <div className="flex h-12 items-center justify-center">
          <Tooltip title="预览">
            <Button
              type="text"
              icon={<EyeOutlined />}
              disabled={!item.fileUrl}
              className="!h-8 !w-8"
              onClick={() => onPreview(item)}
            />
          </Tooltip>
        </div>
        <div className="flex h-12 items-center justify-center border-l border-y-0 border-r-0 border-solid border-zinc-100">
          <Tooltip title="下载">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              className="!h-8 !w-8"
              onClick={() => onDownload(item)}
            />
          </Tooltip>
        </div>
        <div className="flex h-12 items-center justify-center border-l border-y-0 border-r-0 border-solid border-zinc-100">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              className="!h-8 !w-8"
              onClick={() => onEdit(item)}
            />
          </Tooltip>
        </div>
        <div className="flex h-12 items-center justify-center border-l border-y-0 border-r-0 border-solid border-zinc-100">
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              className="!h-8 !w-8"
              onClick={() => onDelete(item)}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default StandingCard;
