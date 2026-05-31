import {
  findRuoyiMenuByPath,
  type RuoyiMenuContext,
  type RuoyiMenuDataItem,
  resolveRuoyiMenuContext,
} from '@/adapters/ruoyi/menu';

export const resolveTenantSwitchNextPath = (
  currentPath: string,
  menuData: RuoyiMenuDataItem[],
  menuContext: RuoyiMenuContext = resolveRuoyiMenuContext(
    currentPath,
    menuData,
  ),
) =>
  findRuoyiMenuByPath(currentPath, menuData)
    ? currentPath
    : menuContext.homePath || '/';
