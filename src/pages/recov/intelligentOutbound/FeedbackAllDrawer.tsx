import { EyeOutlined, ReloadOutlined, TagOutlined } from '@ant-design/icons';
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
import { toDebtFeedbackItem } from './_shared';
import { getAiCallDebtFeedbackPage } from './service';

const { Paragraph, Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const MAX_VISIBLE_TAGS = 3;

type FeedbackAllDrawerProps = {
  open: boolean;
  onClose: () => void;
  onItemClick: (item: FeedbackItem) => void;
};

const feedbackTypeColor = (feedbackType: string) => {
  if (feedbackType === '正向') return 'success';
  if (feedbackType === '负向') return 'error';
  return 'default';
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
        width: 120,
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        key: 'project',
        dataIndex: 'project',
        title: '项目',
        width: 180,
        ellipsis: true,
        render: (value: string) => (
          <Tooltip title={value}>
            <Text>{value}</Text>
          </Tooltip>
        ),
      },
      {
        key: 'summary',
        dataIndex: 'summary',
        title: '通话语义概要',
        minWidth: 360,
        render: (value: string) => (
          <Paragraph
            ellipsis={{ rows: 2, tooltip: value }}
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
        render: (value: string) => (
          <Tag color={feedbackTypeColor(value)} style={{ marginInlineEnd: 0 }}>
            {value}
          </Tag>
        ),
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
        width: 220,
        render: (tags: string[]) => {
          const visibleTags = (tags || []).slice(0, MAX_VISIBLE_TAGS);
          const hiddenTags = (tags || []).slice(MAX_VISIBLE_TAGS);
          if (visibleTags.length === 0) return <Text type="secondary">-</Text>;
          return (
            <Space size={[4, 4]} wrap>
              <TagOutlined style={{ color: token.colorTextTertiary }} />
              {visibleTags.map((tag) => (
                <Tooltip key={tag} title={tag}>
                  <Tag
                    style={{
                      maxWidth: 88,
                      marginInlineEnd: 0,
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
                  <Tag style={{ marginInlineEnd: 0 }}>+{hiddenTags.length}</Tag>
                </Tooltip>
              ) : null}
            </Space>
          );
        },
      },
      {
        key: 'startedAt',
        dataIndex: 'startedAt',
        title: '最近反馈时间',
        width: 170,
        render: (value: string) => (
          <Text type="secondary">{value || '未记录'}</Text>
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
    [onItemClick, token.colorTextSecondary, token.colorTextTertiary],
  );

  return (
    <Drawer
      title="用户反馈与语义分析"
      open={open}
      width="min(1040px, 92vw)"
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
        scroll={{ x: 1280 }}
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
