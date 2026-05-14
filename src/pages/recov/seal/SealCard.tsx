import {
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Image, Space, Switch, Tag, Tooltip } from 'antd';
import type { SealTypeVO, SealVO } from '@/services/ruoyi/seal';
import { pickInstrumentTypeName } from './_shared';

export type SealCardProps = {
  item: SealVO;
  isLawyerSeal: boolean;
  sealTypeList: SealTypeVO[];
  switching?: boolean;
  onEdit: (item: SealVO) => void;
  onDelete: (item: SealVO) => void;
  onToggleStatus: (item: SealVO, nextStatus: '0' | '1') => void;
  onAddLawyer: (item: SealVO) => void;
  onEditLawyer: (item: SealVO) => void;
  onDeleteLawyer: (item: SealVO) => void;
};

const SealCard = ({
  item,
  isLawyerSeal,
  sealTypeList,
  switching,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddLawyer,
  onEditLawyer,
  onDeleteLawyer,
}: SealCardProps) => {
  const docs = item.instrumentTypeCodeList ?? item.instrumentTypeCodes ?? [];
  const rangeLabel =
    item.startNum != null && item.endNum != null
      ? `${item.startNum} - ${item.endNum}`
      : '全部资产';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {item.sealUrl ? (
            <Image
              src={item.sealUrl}
              alt={item.sealName}
              width={72}
              height={72}
              style={{ objectFit: 'contain' }}
              preview={{ src: item.sealUrl }}
            />
          ) : (
            <PictureOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <div
            className="truncate text-[15px] font-semibold text-gray-900"
            title={item.sealName}
          >
            {item.sealName}
          </div>
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="flex-shrink-0 text-gray-500">印章编号</span>
            <span className="truncate font-mono text-xs text-gray-500">
              {item.id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="flex-shrink-0 text-gray-500">关联资产</span>
            <span className="truncate font-medium text-blue-600">
              {rangeLabel}
            </span>
          </div>
          {docs.length > 0 ? (
            <div className="flex items-start gap-1.5 text-[13px]">
              <span className="flex-shrink-0 leading-6 text-gray-500">
                关联文书
              </span>
              <Space size={[4, 4]} wrap>
                {docs.map((code) => (
                  <Tag key={code} color="processing">
                    {pickInstrumentTypeName(sealTypeList, code)}
                  </Tag>
                ))}
              </Space>
            </div>
          ) : null}
          {isLawyerSeal ? (
            <div className="flex items-center gap-1.5 text-[13px]">
              <span className="flex-shrink-0 text-gray-500">律师账号</span>
              {item.lawyerUsername ? (
                <span className="flex items-center gap-1">
                  <span className="text-gray-800">{item.lawyerUsername}</span>
                  <Tooltip title="编辑律师账号">
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => onEditLawyer(item)}
                    />
                  </Tooltip>
                  <Tooltip title="删除律师账号">
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onDeleteLawyer(item)}
                    />
                  </Tooltip>
                </span>
              ) : (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => onAddLawyer(item)}
                >
                  添加律师账号
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <Switch
          size="small"
          checked={item.status === '1'}
          loading={switching}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={(checked) => onToggleStatus(item, checked ? '1' : '0')}
        />
        <Space size={4}>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(item)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(item)}
            />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};

export default SealCard;
