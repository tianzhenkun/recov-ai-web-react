import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Alert, Button, Drawer, Empty, Spin, Switch, Tag } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import {
  type DeliveryStrategyFlowNode,
  type DeliveryWayListRow,
  getDeliveryStrategyFlow,
  updateDeliveryStrategyFlow,
} from '@/modules/recov/services/delivery';
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
  const disabledNodeIds = useMemo(
    () =>
      new Set(
        nodes
          .filter((item) => wayMap.get(item.nodeId)?.enabled === false)
          .map((item) => item.nodeId),
      ),
    [nodes, wayMap],
  );
  const disabledNodeNames = useMemo(() => {
    const names = nodes
      .filter((item) => disabledNodeIds.has(item.nodeId))
      .map((item) => item.nodeName);
    return Array.from(new Set(names));
  }, [disabledNodeIds, nodes]);

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
    if (disabledNodeNames.length > 0) {
      messageApi.warning(`请先移除停用渠道：${disabledNodeNames.join('、')}`);
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
          {disabledNodeNames.length > 0 ? (
            <Alert
              showIcon
              type="warning"
              title="流程包含停用渠道"
              description={
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>请先移除：</span>
                  {disabledNodeNames.map((name) => (
                    <Tag key={name} color="warning" className="!mr-0">
                      {name}
                    </Tag>
                  ))}
                </div>
              }
            />
          ) : null}

          <section className="rounded-xl border border-solid border-zinc-100 bg-white p-4">
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900">
                  可用节点
                </div>
              </div>
            </header>
            <div className="flex flex-wrap gap-2">
              {availableWays.length === 0 ? (
                <div className="flex min-h-[34px] items-center text-[13px] text-zinc-500">
                  全部可用节点已加入
                </div>
              ) : (
                availableWays.map((way) => (
                  <button
                    key={way.nodeId}
                    type="button"
                    onClick={() => addNode(way)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-solid border-zinc-200 bg-white px-2.5 text-[13px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <PlusOutlined className="text-xs text-zinc-500" />
                    {way.nodeName}
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-solid border-zinc-100 bg-white p-4">
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900">
                  执行顺序
                </div>
              </div>
            </header>
            {nodes.length === 0 ? (
              <div className="flex min-h-[138px] items-center justify-center rounded-lg border border-dashed border-zinc-200">
                <Empty
                  description="请先加入送达节点"
                  styles={{ image: { height: 50 } }}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {nodes.map((node, idx) => {
                  const disabled = disabledNodeIds.has(node.nodeId);
                  return (
                    <div
                      key={node.nodeId}
                      draggable
                      onDragStart={handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                      className={clsx(
                        'flex min-h-[64px] cursor-grab items-center gap-2 rounded-lg border border-solid border-zinc-200 bg-white px-3 py-2.5 transition hover:border-zinc-300 hover:shadow-sm',
                        disabled && 'border-amber-300 bg-amber-50/40',
                        draggingIndex === idx && 'opacity-55',
                      )}
                    >
                      <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        aria-label="拖拽排序"
                        className="inline-flex h-7 w-7 flex-none cursor-grab items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                      >
                        <HolderOutlined />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div
                          className="flex min-w-0 items-center gap-2"
                          title={node.nodeName}
                        >
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {node.nodeName}
                          </span>
                          {disabled ? (
                            <Tag color="warning" className="!mr-0 shrink-0">
                              已停用
                            </Tag>
                          ) : null}
                        </div>
                      </div>
                      <div className="inline-flex flex-none items-center gap-2 text-xs text-zinc-500">
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
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </Spin>
    </Drawer>
  );
};

export default FlowDrawer;
