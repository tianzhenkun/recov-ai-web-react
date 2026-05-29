import { ReloadOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Button } from 'antd';

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
    <div className="flex items-center">
      <Button
        type="primary"
        size="large"
        icon={<ReloadOutlined spin={matching} />}
        loading={matching}
        onClick={onAutoMatch}
      >
        {matching ? '正在匹配...' : '一键匹配律师'}
      </Button>
    </div>
  </ProCard>
);

export default MatchToolbar;
