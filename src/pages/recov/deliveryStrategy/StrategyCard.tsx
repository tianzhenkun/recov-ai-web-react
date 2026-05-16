import { SettingOutlined } from '@ant-design/icons';
import { Button, Tag, Tooltip } from 'antd';
import type { DeliveryStrategyRow } from '@/services/ruoyi/delivery';
import { channelIcon, docIcon } from './_shared';

export type StrategyCardProps = {
  row: DeliveryStrategyRow;
  onConfigure: (row: DeliveryStrategyRow) => void;
};

const StrategyCard = ({ row, onConfigure }: StrategyCardProps) => {
  const DocIcon = docIcon(String(row.id));
  const nodes = row.nodes ?? [];

  return (
    <article className="flex min-h-[152px] w-full min-w-0 flex-col gap-4 rounded-xl border border-solid border-zinc-100 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-solid border-zinc-200 bg-zinc-50 text-zinc-500">
          <DocIcon className="text-xl" />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-base font-semibold text-zinc-900"
            title={row.deliveryObj}
          >
            {row.deliveryObj}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {nodes.length} 个节点
          </div>
        </div>
        <Tooltip title="配置流程">
          <Button
            aria-label="配置流程"
            type="text"
            shape="circle"
            className="flex-shrink-0"
            icon={<SettingOutlined />}
            onClick={() => onConfigure(row)}
          />
        </Tooltip>
      </div>

      {nodes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {nodes.map((node, idx) => {
            const ChannelIcon = channelIcon(node.nodeName);
            return (
              <span
                key={`${row.id}-${node.nodeId}`}
                className="inline-flex items-center"
              >
                <Tag
                  variant="outlined"
                  icon={<ChannelIcon />}
                  className="!mr-0 !inline-flex !h-8 !items-center !rounded-md !border-zinc-200 !px-2.5 !text-zinc-700"
                >
                  {node.nodeName}
                </Tag>
                {idx < nodes.length - 1 ? (
                  <span className="mx-1 text-xs text-zinc-400">→</span>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[40px] items-center rounded-lg border border-dashed border-zinc-200 px-3 text-[13px] text-zinc-500">
          暂未配置节点
        </div>
      )}
    </article>
  );
};

export default StrategyCard;
