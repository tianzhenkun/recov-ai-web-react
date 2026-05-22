import { ReloadOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Button, Space, Tag, Tooltip } from 'antd';
import { MATCH_STRATEGIES } from '../_shared';

type MatchToolbarProps = {
  matching: boolean;
  onAutoMatch: () => void;
};

const toolbarCardStyles = {
  body: {
    padding: '12px 16px',
  },
};

const MatchToolbar = ({ matching, onAutoMatch }: MatchToolbarProps) => (
  <ProCard size="small" styles={toolbarCardStyles}>
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Button
        type="primary"
        size="large"
        icon={<ReloadOutlined spin={matching} />}
        loading={matching}
        onClick={onAutoMatch}
      >
        {matching ? '正在匹配...' : '一键匹配律师'}
      </Button>
      <Space size={[8, 8]} wrap>
        {MATCH_STRATEGIES.map((strategy) => (
          <Tooltip key={strategy.key} title={strategy.tooltip}>
            <Tag color="processing">{strategy.label}</Tag>
          </Tooltip>
        ))}
      </Space>
    </div>
  </ProCard>
);

export default MatchToolbar;
