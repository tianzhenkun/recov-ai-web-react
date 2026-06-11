/**
 * 这个文件作为组件的目录
 * 目的是统一管理对外输出的组件，方便分类
 */
/**
 * 布局组件
 */

import FloatingProcessPanel from './FloatingProcessPanel';
import Footer from './Footer';
import NotificationCenter from './NotificationCenter';
import { DocLink, LangDropdown, VersionDropdown } from './RightContent';
import { AvatarDropdown } from './RightContent/AvatarDropdown';
import SafeHtml from './SafeHtml';
import SiderFooterAction from './SiderFooterAction';
import SseBootstrap from './SseBootstrap';
import TenantSwitch from './TenantSwitch';

/**
 * 业务组件
 */
export { default as ArticleListContent } from './ArticleListContent';
export { default as AvatarList } from './AvatarList';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as OfflineBanner } from './OfflineBanner';
export { Permission, PermissionButton, usePermission } from './Permission';
export { default as StandardFormRow } from './StandardFormRow';
export { default as TableActions } from './TableActions';
export { default as TagSelect } from './TagSelect';

export {
  AvatarDropdown,
  DocLink,
  FloatingProcessPanel,
  Footer,
  LangDropdown,
  NotificationCenter,
  SafeHtml,
  SiderFooterAction,
  SseBootstrap,
  TenantSwitch,
  VersionDropdown,
};
