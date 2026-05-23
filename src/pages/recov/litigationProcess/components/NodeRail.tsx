import { ProCard } from '@ant-design/pro-components';
import { Badge, Spin, Typography, theme } from 'antd';
import type {
  LitigationNodeStatVO,
  LitigationNodeType,
} from '@/services/ruoyi/litigation-process';
import { DEFAULT_NODE_TYPE, NODE_VISUAL_MAP } from '../_shared';

const { Text } = Typography;

const getNodeVisual = (nodeType: LitigationNodeType) =>
  NODE_VISUAL_MAP[nodeType] ?? NODE_VISUAL_MAP[DEFAULT_NODE_TYPE];

type NodeRailProps = {
  nodes: LitigationNodeStatVO[];
  activeNodeType: LitigationNodeType;
  activeNodeDesc?: string;
  total: number;
  loading?: boolean;
  onNodeChange: (nodeType: LitigationNodeType) => void;
};

const NodeRail = ({
  nodes,
  activeNodeType,
  activeNodeDesc,
  total,
  loading,
  onNodeChange,
}: NodeRailProps) => {
  const { token } = theme.useToken();

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
        <div className="relative pb-1 pt-3">
          <div
            className="absolute left-[3.8%] right-[3.8%] top-[34px] h-px"
            style={{ background: '#eef0f4' }}
          />
          <div
            aria-label="案件推进节点"
            className="relative grid grid-cols-12 items-start gap-0"
            role="tablist"
          >
            {nodes.map((node) => {
              const isCurrent = activeNodeType === node.nodeType;
              const visual = getNodeVisual(node.nodeType);

              return (
                <button
                  key={node.nodeType}
                  aria-selected={isCurrent}
                  role="tab"
                  type="button"
                  className="min-w-0 border-0 bg-transparent px-0.5 text-center"
                  onClick={() => onNodeChange(node.nodeType)}
                >
                  <Badge count={node.count} showZero size="small">
                    <span
                      className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-full border text-[20px] transition-colors"
                      style={{
                        background: isCurrent
                          ? token.colorPrimaryBg
                          : token.colorBgContainer,
                        borderColor: isCurrent
                          ? token.colorPrimaryBorder
                          : token.colorBorderSecondary,
                        boxShadow: isCurrent
                          ? token.boxShadowSecondary
                          : '0 2px 8px rgba(15, 23, 42, 0.04)',
                        color: isCurrent
                          ? token.colorPrimary
                          : token.colorTextTertiary,
                      }}
                    >
                      <span className="leading-none">{visual.icon}</span>
                    </span>
                  </Badge>
                  <span
                    className="mt-3 block break-words px-0.5 text-sm font-bold leading-snug transition-colors"
                    style={{
                      color: isCurrent
                        ? token.colorPrimary
                        : token.colorTextHeading,
                    }}
                  >
                    {node.nodeDesc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Spin>
    </ProCard>
  );
};

export default NodeRail;
