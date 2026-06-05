import {
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Image, Space, Switch, Tag, Tooltip, theme } from 'antd';
import type { SealTypeVO, SealVO } from '@/services/ruoyi/seal';
import { pickInstrumentTypeName } from './_shared';

export type SealCardProps = {
  item: SealVO;
  supportsFilingAccount: boolean;
  sealTypeList: SealTypeVO[];
  switching?: boolean;
  onEdit: (item: SealVO) => void;
  onDelete: (item: SealVO) => void;
  onToggleStatus: (item: SealVO, nextStatus: '0' | '1') => void;
  onAddFilingAccount: (item: SealVO) => void;
  onEditFilingAccount: (item: SealVO) => void;
  onDeleteFilingAccount: (item: SealVO) => void;
};

const SealCard = ({
  item,
  supportsFilingAccount,
  sealTypeList,
  switching,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddFilingAccount,
  onEditFilingAccount,
  onDeleteFilingAccount,
}: SealCardProps) => {
  const { token } = theme.useToken();
  const docs = item.instrumentTypeCodeList ?? item.instrumentTypeCodes ?? [];
  const rangeLabel =
    item.startNum != null && item.endNum != null
      ? `${item.startNum} - ${item.endNum}`
      : '全部资产';
  const sealId = String(item.id);
  const shortSealId =
    sealId.length > 12 ? `${sealId.slice(0, 8)}...${sealId.slice(-4)}` : sealId;
  const enabled = item.status === '1';

  return (
    <div className="rounded-xl border border-solid border-zinc-100 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-solid border-zinc-100 bg-zinc-50">
            {item.sealUrl ? (
              <Image
                src={item.sealUrl}
                alt={item.sealName}
                width={64}
                height={64}
                style={{ objectFit: 'contain' }}
                preview={{ src: item.sealUrl }}
              />
            ) : (
              <PictureOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
            )}
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <span
                className="truncate text-base font-semibold text-zinc-900"
                title={item.sealName}
              >
                {item.sealName}
              </span>
            </div>
            <Tooltip title={sealId}>
              <span className="font-mono text-xs text-zinc-400">
                编号 {shortSealId}
              </span>
            </Tooltip>
          </div>
        </div>
        <Tooltip title={enabled ? '停用印章' : '启用印章'}>
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
          <span className="text-xs font-medium text-zinc-400">资产范围</span>
          <span className="font-medium text-zinc-900">{rangeLabel}</span>
        </div>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
          <span className="flex-shrink-0 text-xs font-medium leading-6 text-zinc-400">
            适用文书
          </span>
          {docs.length > 0 ? (
            <Space size={[4, 4]} wrap>
              {docs.map((code) => (
                <Tag
                  key={code}
                  variant="filled"
                  className="!mr-0"
                  style={{
                    backgroundColor: token.colorPrimaryBg,
                    borderColor: token.colorPrimaryBorder,
                    color: token.colorPrimaryText,
                  }}
                >
                  {pickInstrumentTypeName(sealTypeList, code)}
                </Tag>
              ))}
            </Space>
          ) : (
            <span className="text-zinc-400">未配置</span>
          )}
        </div>
        {supportsFilingAccount ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">立案账号</span>
            {item.lawyerUsername ? (
              <span className="flex min-w-0 items-center gap-1">
                <span className="min-w-0 truncate text-right text-zinc-900">
                  {item.lawyerUsername}
                  {item.accountIdentity ? (
                    <span className="ml-1 text-zinc-400">
                      {item.accountIdentity}
                    </span>
                  ) : null}
                </span>
                <Tooltip title="编辑立案账号">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEditFilingAccount(item)}
                  />
                </Tooltip>
                <Tooltip title="删除立案账号">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDeleteFilingAccount(item)}
                  />
                </Tooltip>
              </span>
            ) : (
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => onAddFilingAccount(item)}
              >
                添加立案账号
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="-mx-4 -mb-4 mt-4 grid grid-cols-2 overflow-hidden rounded-b-xl border-t border-solid border-zinc-100 bg-zinc-50/50">
        <div className="flex h-12 items-center justify-center">
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

export default SealCard;
