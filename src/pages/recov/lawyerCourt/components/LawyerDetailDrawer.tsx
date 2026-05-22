import { StarOutlined } from '@ant-design/icons';
import { Descriptions, Drawer, Space, Tag, Typography } from 'antd';
import type { MatchedLawyerRowVO } from '@/services/ruoyi/lawyer-court';
import { formatDisplayMoney } from '../_shared';

const { Text, Paragraph } = Typography;

type LawyerDetailDrawerProps = {
  open: boolean;
  row: MatchedLawyerRowVO | null;
  onClose: () => void;
};

const LawyerDetailDrawer = ({
  open,
  row,
  onClose,
}: LawyerDetailDrawerProps) => (
  <Drawer
    title={row ? `${row.lawyerName} · 律师详情` : '律师详情'}
    size={520}
    open={open}
    onClose={onClose}
    destroyOnHidden
  >
    {row ? (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Space align="center" size={12}>
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
            style={{ background: '#1677ff14', color: '#1677ff' }}
          >
            {row.lawyerName.slice(0, 1)}
          </div>
          <div>
            <Text strong style={{ fontSize: 18 }}>
              {row.lawyerName}
            </Text>
            <div>
              <Text type="secondary">{row.firm}</Text>
            </div>
          </div>
          <Tag icon={<StarOutlined />} color="gold">
            {row.rating} 评分
          </Tag>
          <Tag color="blue">{row.caseCount} 案件经验</Tag>
        </Space>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="联系电话">{row.phone}</Descriptions.Item>
          <Descriptions.Item label="电子邮箱">{row.email}</Descriptions.Item>
          <Descriptions.Item label="执业区域">{row.region}</Descriptions.Item>
          <Descriptions.Item label="匹配状态">
            <Tag color="success">{row.status}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Descriptions title="匹配案件详情" column={2} size="small" bordered>
          <Descriptions.Item label="匹配资产">{row.assetNo}</Descriptions.Item>
          <Descriptions.Item label="匹配项目">{row.project}</Descriptions.Item>
          <Descriptions.Item label="匹配城市">{row.city}</Descriptions.Item>
          <Descriptions.Item label="案涉业主">
            {row.ownerName}
          </Descriptions.Item>
          <Descriptions.Item label="匹配案号" span={2}>
            {row.caseNo}
          </Descriptions.Item>
          <Descriptions.Item label="涉案金额" span={2}>
            <Text strong style={{ color: '#1677ff' }}>
              {formatDisplayMoney(row.amount)}
            </Text>
          </Descriptions.Item>
        </Descriptions>

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            律师简介
          </Text>
          <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
            {row.bio}
          </Paragraph>
        </div>
      </Space>
    ) : null}
  </Drawer>
);

export default LawyerDetailDrawer;
