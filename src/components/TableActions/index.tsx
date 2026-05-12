import { MoreOutlined } from '@ant-design/icons';
import {
  Button,
  Dropdown,
  type MenuProps,
  Space,
  Tooltip,
  type TooltipProps,
} from 'antd';
import type React from 'react';
import { usePermission } from '@/components/Permission';
import type { PermissionRequirement } from '@/utils/permission';

export type TableActionItem = PermissionRequirement & {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
};

export type TableActionsProps = {
  actions: TableActionItem[];
  maxVisible?: number;
  moreLabel?: string;
  tooltipPlacement?: TooltipProps['placement'];
};

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  paddingInline: 0,
};

export const TableActions = ({
  actions,
  maxVisible = 2,
  moreLabel = '更多',
  tooltipPlacement = 'top',
}: TableActionsProps) => {
  const { canAccess } = usePermission();
  const allowedActions = actions.filter((action) =>
    canAccess({
      roles: action.roles,
      permissions: action.permissions,
      mode: action.mode,
    }),
  );
  const visibleActions = allowedActions.slice(0, maxVisible);
  const overflowActions = allowedActions.slice(maxVisible);

  if (allowedActions.length === 0) return null;

  const menuItems = overflowActions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled || action.loading,
  })) satisfies MenuProps['items'];

  return (
    <Space size={4} wrap={false}>
      {visibleActions.map((action) => (
        <Tooltip
          key={action.key}
          placement={tooltipPlacement}
          title={action.label}
        >
          <Button
            aria-label={action.label}
            danger={action.danger}
            disabled={action.disabled}
            icon={action.icon}
            loading={action.loading}
            size="small"
            style={iconButtonStyle}
            type="link"
            onClick={action.onClick}
          />
        </Tooltip>
      ))}
      {overflowActions.length > 0 && (
        <Dropdown
          placement="bottomRight"
          trigger={['click']}
          menu={{
            items: menuItems,
            onClick: ({ key }) => {
              const action = overflowActions.find((item) => item.key === key);
              if (!action || action.disabled || action.loading) return;
              action.onClick();
            },
          }}
        >
          <Button
            aria-label={moreLabel}
            icon={<MoreOutlined />}
            size="small"
            style={iconButtonStyle}
            type="link"
          />
        </Dropdown>
      )}
    </Space>
  );
};

export default TableActions;
