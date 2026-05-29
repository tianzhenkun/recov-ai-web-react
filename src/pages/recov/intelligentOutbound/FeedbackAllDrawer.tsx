import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  Drawer,
  Empty,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FeedbackItem } from './_shared';
import { formatDuration, toDebtFeedbackItem } from './_shared';
import { getAiCallDebtFeedbackPage } from './service';

const { Paragraph, Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const MAX_VISIBLE_TAGS = 3;

type FeedbackAllDrawerProps = {
  open: boolean;
  onClose: () => void;
  onItemClick: (item: FeedbackItem) => void;
};

const renderSingleLineText = (
  value: string,
  options?: { strong?: boolean; secondary?: boolean },
) => {
  const text = value || '';
  if (!text) return <Text type="secondary">-</Text>;
  return (
    <Tooltip title={text}>
      <Text
        strong={options?.strong}
        type={options?.secondary ? 'secondary' : undefined}
        className="block max-w-full truncate"
      >
        {text}
      </Text>
    </Tooltip>
  );
};

const FeedbackAllDrawer = ({
  open,
  onClose,
  onItemClick,
}: FeedbackAllDrawerProps) => {
  const { token } = theme.useToken();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const loadList = useCallback(async (pageNum: number, pageSize: number) => {
    setLoading(true);
    try {
      const res = await getAiCallDebtFeedbackPage({
        pageNum,
        pageSize,
        analysisStatus: '2',
      });
      setItems((res.rows || []).map(toDebtFeedbackItem));
      setTotal(Number(res.total || 0));
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadList(page.pageNum, page.pageSize);
  }, [loadList, open, page.pageNum, page.pageSize]);

  const columns = useMemo<ColumnsType<FeedbackItem>>(
    () => [
      {
        key: 'ownerName',
        dataIndex: 'ownerName',
        title: '债务人',
        fixed: 'left',
        width: 160,
        ellipsis: true,
        render: (value: string) =>
          renderSingleLineText(value, { strong: true }),
      },
      {
        key: 'project',
        dataIndex: 'project',
        title: '项目',
        width: 180,
        ellipsis: true,
        render: (value: string) => renderSingleLineText(value),
      },
      {
        key: 'summary',
        dataIndex: 'summary',
        title: '通话语义概要',
        width: 300,
        ellipsis: true,
        render: (value: string) => (
          <Paragraph
            ellipsis={{ rows: 1, tooltip: value }}
            style={{
              marginBottom: 0,
              color: token.colorTextSecondary,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {value}
          </Paragraph>
        ),
      },
      {
        key: 'feedbackType',
        dataIndex: 'feedbackType',
        title: '倾向',
        width: 96,
        render: (value: string) => {
          const tone =
            value === '正向'
              ? {
                  color: token.colorPrimary,
                  backgroundColor: token.colorPrimaryBg,
                  borderColor: token.colorPrimaryBorder,
                }
              : value === '负向'
                ? {
                    color: token.colorError,
                    backgroundColor: token.colorErrorBg,
                    borderColor: token.colorErrorBorder,
                  }
                : {
                    color: token.colorTextSecondary,
                    backgroundColor: token.colorFillQuaternary,
                    borderColor: token.colorBorderSecondary,
                  };
          return (
            <Tag style={{ marginInlineEnd: 0, ...tone }}>{value || '中性'}</Tag>
          );
        },
      },
      {
        key: 'feedbackRecordCount',
        dataIndex: 'feedbackRecordCount',
        title: '反馈次数',
        width: 96,
        render: (value: number) => <Text>{Number(value || 0)} 次</Text>,
      },
      {
        key: 'semanticTags',
        dataIndex: 'semanticTags',
        title: '标签',
        width: 210,
        ellipsis: true,
        render: (tags: string[]) => {
          const visibleTags = (tags || []).slice(0, MAX_VISIBLE_TAGS);
          const hiddenTags = (tags || []).slice(MAX_VISIBLE_TAGS);
          if (visibleTags.length === 0) return <Text type="secondary">-</Text>;
          return (
            <Space size={[4, 4]} wrap>
              {visibleTags.map((tag) => (
                <Tooltip key={tag} title={tag}>
                  <Tag
                    style={{
                      maxWidth: 88,
                      marginInlineEnd: 0,
                      color: token.colorTextSecondary,
                      backgroundColor: token.colorFillQuaternary,
                      borderColor: token.colorBorderSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tag}
                  </Tag>
                </Tooltip>
              ))}
              {hiddenTags.length > 0 ? (
                <Tooltip title={hiddenTags.join('、')}>
                  <Tag
                    style={{
                      marginInlineEnd: 0,
                      color: token.colorTextSecondary,
                      backgroundColor: token.colorFillQuaternary,
                      borderColor: token.colorBorderSecondary,
                    }}
                  >
                    +{hiddenTags.length}
                  </Tag>
                </Tooltip>
              ) : null}
            </Space>
          );
        },
      },
      {
        key: 'startTime',
        dataIndex: 'startTime',
        title: '开始时间',
        width: 160,
        ellipsis: true,
        render: (value: string) =>
          renderSingleLineText(value, { secondary: true }),
      },
      {
        key: 'endTime',
        dataIndex: 'endTime',
        title: '结束时间',
        width: 160,
        ellipsis: true,
        render: (value: string) =>
          renderSingleLineText(value, { secondary: true }),
      },
      {
        key: 'durationSeconds',
        dataIndex: 'durationSeconds',
        title: '通话时长',
        width: 110,
        render: (value: number) => (
          <Text type="secondary">
            {Number(value || 0) > 0 ? formatDuration(value) : '-'}
          </Text>
        ),
      },
      {
        key: 'actions',
        title: '操作',
        fixed: 'right',
        align: 'center',
        width: 80,
        render: (_, record) => (
          <Tooltip title="查看详情">
            <Button
              aria-label="查看详情"
              icon={<EyeOutlined />}
              size="small"
              type="link"
              onClick={(event) => {
                event.stopPropagation();
                onItemClick(record);
              }}
            />
          </Tooltip>
        ),
      },
    ],
    [
      onItemClick,
      token.colorBorderSecondary,
      token.colorError,
      token.colorErrorBg,
      token.colorErrorBorder,
      token.colorFillQuaternary,
      token.colorPrimary,
      token.colorPrimaryBg,
      token.colorPrimaryBorder,
      token.colorTextSecondary,
    ],
  );

  return (
    <Drawer
      title="用户反馈与语义分析"
      open={open}
      size="min(1180px, 94vw)"
      destroyOnHidden
      onClose={onClose}
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void loadList(page.pageNum, page.pageSize)}
        >
          刷新
        </Button>
      }
      styles={{
        body: {
          padding: 16,
        },
      }}
    >
      <Table<FeedbackItem>
        rowKey="id"
        loading={loading}
        size="middle"
        dataSource={items}
        columns={columns}
        tableLayout="fixed"
        scroll={{ x: 1420 }}
        locale={{ emptyText: <Empty description="暂无用户反馈" /> }}
        onRow={(record) => ({
          onClick: () => onItemClick(record),
        })}
        pagination={{
          current: page.pageNum,
          pageSize: page.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
          onChange: (pageNum, pageSize) => {
            setPage({ pageNum, pageSize });
          },
        }}
      />
    </Drawer>
  );
};

export default FeedbackAllDrawer;
