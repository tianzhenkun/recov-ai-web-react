import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Empty, Spin, Switch } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import {
  type DeliveryStrategyFlowNode,
  type DeliveryWayListRow,
  getDeliveryStrategyFlow,
  updateDeliveryStrategyFlow,
} from '@/services/ruoyi/delivery';
import {
  type FlowDrawerNode,
  normalizeFlowNode,
  pickAvailableWays,
} from './_shared';

export type FlowDrawerProps = {
  open: boolean;
  strategyId: string;
  strategyName: string;
  wayRows: DeliveryWayListRow[];
  onClose: () => void;
  onSaved: (strategyId: string, nodes: FlowDrawerNode[]) => void;
  messageApi: MessageInstance;
};

const FlowDrawer = ({
  open,
  strategyId,
  strategyName,
  wayRows,
  onClose,
  onSaved,
  messageApi,
}: FlowDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nodes, setNodes] = useState<FlowDrawerNode[]>([]);
  const [draggingIndex, setDraggingIndex] = useState(-1);

  const wayMap = useMemo(
    () => new Map(wayRows.map((item) => [item.nodeId, item])),
    [wayRows],
  );

  useEffect(() => {
    if (!open || !strategyId) return;
    let cancelled = false;
    setLoading(true);
    setNodes([]);
    setDraggingIndex(-1);

    (async () => {
      try {
        const res = await getDeliveryStrategyFlow(strategyId);
        if (cancelled) return;
        const raw = res as unknown as {
          data?: { nodes?: DeliveryStrategyFlowNode[] };
          nodes?: DeliveryStrategyFlowNode[];
        };
        const data = (raw?.data ?? raw) as {
          nodes?: DeliveryStrategyFlowNode[];
        };
        const source = Array.isArray(data?.nodes) ? data.nodes : [];
        const seen = new Set<string>();
        const normalized = (source as DeliveryStrategyFlowNode[])
          .map((node) => normalizeFlowNode(node, wayMap))
          .filter((item): item is FlowDrawerNode => {
            if (!item || seen.has(item.nodeId)) return false;
            seen.add(item.nodeId);
            return true;
          });
        setNodes(normalized);
      } catch {
        if (!cancelled) {
          messageApi.error('流程配置加载失败，请稍后重试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, strategyId, wayMap, messageApi]);

  const usedIds = useMemo(
    () => new Set(nodes.map((item) => item.nodeId)),
    [nodes],
  );
  const availableWays = useMemo(
    () => pickAvailableWays(wayRows, usedIds),
    [wayRows, usedIds],
  );

  const addNode = (way: DeliveryWayListRow) => {
    setNodes((prev) => {
      if (prev.some((item) => item.nodeId === way.nodeId)) return prev;
      return [
        ...prev,
        {
          nodeId: way.nodeId,
          nodeName: way.nodeName,
          proceedOnSuccess: false,
        },
      ];
    });
  };

  const removeNode = (idx: number) => {
    setNodes((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleProceed = (idx: number, value: boolean) => {
    setNodes((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, proceedOnSuccess: value } : item,
      ),
    );
  };

  const handleDragStart = (idx: number) => () => {
    setDraggingIndex(idx);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (targetIdx: number) => () => {
    setNodes((prev) => {
      const sourceIdx = draggingIndex;
      if (sourceIdx < 0 || sourceIdx === targetIdx) return prev;
      const next = [...prev];
      const [item] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
    setDraggingIndex(-1);
  };

  const handleDragEnd = () => {
    setDraggingIndex(-1);
  };

  const handleSave = async () => {
    if (!strategyId) return;
    if (nodes.length === 0) {
      messageApi.warning('请至少配置一个送达节点');
      return;
    }
    setSaving(true);
    try {
      await updateDeliveryStrategyFlow(strategyId, {
        strategyId,
        strategyName,
        deliveryObj: strategyName,
        nodes: nodes.map((item) => ({
          nodeId: item.nodeId,
          nodeName: item.nodeName,
          proceedOnSuccess: item.proceedOnSuccess,
        })),
      });
      messageApi.success('流程配置已保存');
      onSaved(strategyId, nodes);
      onClose();
    } catch {
      messageApi.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={
        <div className="flex flex-col">
          <span className="text-base font-bold text-slate-900">流程配置</span>
          <span className="mt-0.5 text-xs text-slate-500">{strategyName}</span>
        </div>
      }
      size={560}
      destroyOnHidden
      mask={{ closable: false }}
      onClose={() => (saving ? undefined : onClose())}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={nodes.length === 0}
            onClick={handleSave}
          >
            保存
          </Button>
        </div>
      }
    >
      <Spin spinning={loading}>
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">可用节点</div>
                <div className="mt-1 text-xs text-slate-500">
                  点击加入当前流程
                </div>
              </div>
              <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-full bg-indigo-100 px-2 text-xs font-bold text-indigo-600">
                {availableWays.length}
              </span>
            </header>
            <div className="flex flex-wrap gap-2">
              {availableWays.length === 0 ? (
                <div className="flex min-h-[34px] items-center text-[13px] text-slate-500">
                  全部可用节点已加入
                </div>
              ) : (
                availableWays.map((way) => (
                  <button
                    key={way.nodeId}
                    type="button"
                    onClick={() => addNode(way)}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 pl-2 pr-3 text-[13px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-100"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-base font-bold leading-none text-indigo-600">
                      <PlusOutlined style={{ fontSize: 12 }} />
                    </span>
                    {way.nodeName}
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">执行顺序</div>
                <div className="mt-1 text-xs text-slate-500">
                  拖动左侧手柄调整顺序
                </div>
              </div>
            </header>
            {nodes.length === 0 ? (
              <div className="flex min-h-[138px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <Empty
                  description="请先加入送达节点"
                  styles={{ image: { height: 50 } }}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {nodes.map((node, idx) => (
                  <div
                    key={node.nodeId}
                    draggable
                    onDragStart={handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={clsx(
                      'flex min-h-[64px] cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-indigo-300 hover:shadow-sm',
                      draggingIndex === idx && 'opacity-55',
                    )}
                  >
                    <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      aria-label="拖拽排序"
                      className="inline-flex h-7 w-7 flex-none cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <HolderOutlined />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-semibold text-slate-900"
                        title={node.nodeName}
                      >
                        {node.nodeName}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {node.nodeId}
                      </div>
                    </div>
                    <div className="inline-flex flex-none items-center gap-2 text-xs text-slate-500">
                      <span>成功后继续</span>
                      <Switch
                        size="small"
                        checked={node.proceedOnSuccess}
                        onChange={(checked) => toggleProceed(idx, checked)}
                      />
                    </div>
                    <Button
                      aria-label="删除节点"
                      type="text"
                      danger
                      shape="circle"
                      icon={<DeleteOutlined />}
                      onClick={() => removeNode(idx)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </Spin>
    </Drawer>
  );
};

export default FlowDrawer;
