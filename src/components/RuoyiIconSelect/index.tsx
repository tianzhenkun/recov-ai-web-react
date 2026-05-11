import { Select, type SelectProps, Space } from 'antd';
import type React from 'react';
import { RuoyiIcon, ruoyiMenuIconNames } from '@/utils/ruoyiIcons';

type IconOption = {
  value: string;
  label: React.ReactNode;
  searchText: string;
};

const iconOptions: IconOption[] = ruoyiMenuIconNames.map((iconName) => ({
  value: iconName,
  searchText: iconName,
  label: (
    <Space size={8}>
      <RuoyiIcon icon={iconName} />
      <span>{iconName}</span>
    </Space>
  ),
}));

const filterIconOption: SelectProps<string>['filterOption'] = (
  input,
  option,
) => {
  const iconOption = option as IconOption | undefined;
  return Boolean(
    iconOption?.searchText.toLowerCase().includes(input.trim().toLowerCase()),
  );
};

const RuoyiIconSelect = (props: SelectProps<string>) => (
  <Select
    allowClear
    showSearch
    placeholder="请选择菜单图标"
    filterOption={filterIconOption}
    options={iconOptions}
    {...props}
  />
);

export default RuoyiIconSelect;
