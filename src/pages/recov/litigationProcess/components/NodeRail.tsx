import { ProCard } from '@ant-design/pro-components';
import { Spin, Typography } from 'antd';
import type { CSSProperties } from 'react';
import type {
  LitigationNodeStatVO,
  LitigationNodeType,
} from '@/services/ruoyi/litigation-process';
import { NODE_VISUAL_MAP } from '../_shared';

const { Text } = Typography;

type NodeRailProps = {
  nodes: LitigationNodeStatVO[];
  activeNodeType: LitigationNodeType;
  activeNodeDesc?: string;
  total: number;
  loading?: boolean;
  onNodeChange: (nodeType: LitigationNodeType) => void;
};

const getNodeThemeStyle = (nodeType: LitigationNodeType): CSSProperties => {
  const visual = NODE_VISUAL_MAP[nodeType];
  return {
    ['--node-accent' as string]: visual.accent,
    ['--node-line' as string]: visual.line,
    ['--node-soft' as string]: visual.soft,
    ['--node-shadow' as string]: visual.shadow,
  };
};

const NodeRail = ({
  nodes,
  activeNodeType,
  activeNodeDesc,
  total,
  loading,
  onNodeChange,
}: NodeRailProps) => {
  const activeIndex = nodes.findIndex(
    (item) => item.nodeType === activeNodeType,
  );

  return (
    <ProCard
      title="案件推进节点"
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          当前节点：{activeNodeDesc || '-'} · {total} 条
        </Text>
      }
    >
      <Spin spinning={loading}>
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex min-w-max items-start gap-0 pr-2">
            {nodes.map((node, index) => {
              const isCurrent = activeNodeType === node.nodeType;
              const isPassed = activeIndex >= 0 && index < activeIndex;
              const visual = NODE_VISUAL_MAP[node.nodeType];

              return (
                <div key={node.nodeType} className="inline-flex items-center">
                  <button
                    type="button"
                    className="group w-[108px] border-0 bg-transparent p-0 text-center md:w-[120px]"
                    style={getNodeThemeStyle(node.nodeType)}
                    onClick={() => onNodeChange(node.nodeType)}
                  >
                    <span
                      className="inline-flex h-[26px] min-w-[42px] items-center justify-center rounded-full px-2.5 text-xs font-bold transition-all"
                      style={{
                        background:
                          isCurrent || isPassed
                            ? `linear-gradient(135deg, ${visual.accent} 0%, ${visual.line} 100%)`
                            : visual.soft,
                        color: isCurrent || isPassed ? '#fff' : visual.accent,
                        boxShadow:
                          isCurrent || isPassed
                            ? `0 10px 18px ${visual.shadow}`
                            : undefined,
                      }}
                    >
                      {node.count}
                    </span>
                    <span
                      className="mx-auto mt-3 flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-white/70 text-[22px] transition-all"
                      style={{
                        background:
                          isCurrent || isPassed
                            ? `linear-gradient(135deg, ${visual.accent} 0%, ${visual.line} 100%)`
                            : visual.soft,
                        color: isCurrent || isPassed ? '#fff' : visual.accent,
                        boxShadow:
                          isCurrent || isPassed
                            ? `0 16px 28px ${visual.shadow}`
                            : '0 12px 24px rgba(148, 163, 184, 0.12)',
                      }}
                    >
                      {visual.icon}
                    </span>
                    <span
                      className="mt-3.5 block px-1.5 text-[13px] font-extrabold leading-snug transition-colors"
                      style={{
                        color: isCurrent || isPassed ? '#0f172a' : '#475569',
                      }}
                    >
                      {node.nodeDesc}
                    </span>
                  </button>
                  {index !== nodes.length - 1 ? (
                    <span
                      className="mx-1 mt-[37px] hidden h-0.5 w-10 rounded-full md:inline-block md:w-14"
                      style={{
                        background:
                          isPassed || isCurrent
                            ? `linear-gradient(90deg, ${visual.accent} 0%, ${visual.line} 100%)`
                            : 'linear-gradient(90deg, #dbeafe 0%, #c7d2fe 100%)',
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </Spin>
    </ProCard>
  );
};

export default NodeRail;
