import {
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Select, Space } from 'antd';
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
  onReset: () => void;
};

const DetailFilterBar = ({
  query,
  onQueryChange,
  onSearch,
  onReset,
}: DetailFilterBarProps) => (
  <Space wrap className="w-full">
    <div className="mr-2 flex shrink-0 items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-1.5">
      <FilterOutlined className="text-indigo-500" />
      <span className="text-xs font-bold text-indigo-700">快速筛选</span>
    </div>
    <Select
      allowClear
      placeholder="所属城市"
      className="!w-36"
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
      className="!w-40"
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
    <Input
      allowClear
      placeholder="资产编号"
      className="!w-40"
      prefix={<SearchOutlined />}
      value={query.debtNumber}
      onChange={(e) =>
        onQueryChange({ ...query, debtNumber: e.target.value || undefined })
      }
      onPressEnter={onSearch}
    />
    <Space className="border-l border-gray-100 pl-4">
      <Button type="primary" className="!rounded-xl" onClick={onSearch}>
        查询
      </Button>
      <Button
        className="!rounded-xl"
        icon={<ReloadOutlined />}
        title="重置筛选"
        onClick={onReset}
      />
    </Space>
  </Space>
);

export default DetailFilterBar;
