import {
  findRuoyiMenuByPath,
  type RuoyiMenuContext,
  type RuoyiMenuDataItem,
  resolveRuoyiMenuContext,
} from '@/adapters/ruoyi/menu';
import { resolveRouteAuthorization } from '@/app/authorization';

export const resolveTenantSwitchNextPath = (
  currentPath: string,
  menuData: RuoyiMenuDataItem[],
  menuContext: RuoyiMenuContext = resolveRuoyiMenuContext(
    currentPath,
    menuData,
  ),
) =>
  resolveRouteAuthorization(currentPath, []) === 'allowed' ||
  findRuoyiMenuByPath(currentPath, menuData)
    ? currentPath
    : menuContext.homePath || '/';
