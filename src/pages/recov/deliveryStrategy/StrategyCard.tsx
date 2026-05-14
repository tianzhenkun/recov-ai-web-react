import { SettingOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import type { DeliveryStrategyRow } from '@/services/ruoyi/delivery';
import { channelColor, channelIcon, docIcon } from './_shared';

export type StrategyCardProps = {
  row: DeliveryStrategyRow;
  onConfigure: (row: DeliveryStrategyRow) => void;
};

const StrategyCard = ({ row, onConfigure }: StrategyCardProps) => {
  const DocIcon = docIcon(String(row.id));
  const nodes = row.nodes ?? [];

  return (
    <article className="flex min-h-[152px] w-full min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50">
          <DocIcon style={{ fontSize: 20, color: '#4f46e5' }} />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-base font-bold text-slate-900"
            title={row.deliveryObj}
          >
            {row.deliveryObj}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {nodes.length} 个节点
          </div>
        </div>
        <Tooltip title="配置流程">
          <Button
            aria-label="配置流程"
            type="default"
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
                <span className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-700">
                  <ChannelIcon
                    style={{
                      fontSize: 14,
                      color: channelColor(node.nodeName),
                    }}
                  />
                  {node.nodeName}
                </span>
                {idx < nodes.length - 1 ? (
                  <span className="mx-1 text-xs text-slate-400">→</span>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[40px] items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-500">
          暂未配置节点
        </div>
      )}
    </article>
  );
};

export default StrategyCard;
