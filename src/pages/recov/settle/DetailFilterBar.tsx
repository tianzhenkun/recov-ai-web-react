import { SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space } from 'antd';
import {
  RECOV_FILTER_CONTROL_STYLE,
  RECOV_ORGANIZATION_POPUP_WIDTH,
  renderRecovSelectOptionLabel,
} from '@/pages/recov/components/RecovFilterControls';

export type DetailFilterQuery = {
  pageNum?: number;
  pageSize?: number;
  debtNumber?: string;
  city?: string;
  organization?: string;
};

export type DetailFilterBarProps = {
  query: DetailFilterQuery;
  onQueryChange: (next: DetailFilterQuery) => void;
  onSearch: () => void;
};

const DetailFilterBar = ({
  query,
  onQueryChange,
  onSearch,
}: DetailFilterBarProps) => (
  <Space wrap size={8} className="w-full">
    <Input
      allowClear
      placeholder="资产编号"
      style={RECOV_FILTER_CONTROL_STYLE}
      prefix={<SearchOutlined className="text-gray-400" />}
      value={query.debtNumber}
      onChange={(e) =>
        onQueryChange({ ...query, debtNumber: e.target.value || undefined })
      }
      onPressEnter={onSearch}
    />
    <Select
      allowClear
      placeholder="所属城市"
      showSearch
      optionFilterProp="label"
      style={RECOV_FILTER_CONTROL_STYLE}
      value={query.city || undefined}
      options={[{ label: '全部城市', value: '' }]}
      onChange={(city) =>
        onQueryChange({
          ...query,
          city: city || undefined,
          pageNum: 1,
        })
      }
    />
    <Select
      allowClear
      placeholder="所属项目"
      showSearch
      optionFilterProp="label"
      optionRender={(option) => renderRecovSelectOptionLabel(option.label)}
      popupMatchSelectWidth={RECOV_ORGANIZATION_POPUP_WIDTH}
      style={RECOV_FILTER_CONTROL_STYLE}
      value={query.organization || undefined}
      options={[{ label: '全部项目', value: '' }]}
      onChange={(organization) =>
        onQueryChange({
          ...query,
          organization: organization || undefined,
          pageNum: 1,
        })
      }
    />
    <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
      查询
    </Button>
  </Space>
);

export default DetailFilterBar;
