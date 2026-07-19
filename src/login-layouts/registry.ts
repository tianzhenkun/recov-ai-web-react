import { type ComponentType, lazy } from 'react';
import catalog from './catalog.json';
import type { LoginLayoutProps } from './types';

const loginLayoutComponents: Record<string, ComponentType<LoginLayoutProps>> = {
  default: lazy(() => import('./default')),
};

export const validateLoginLayoutCode = (value: string) => {
  const code = value.trim();
  if (code.toUpperCase() === 'AUTO') {
    throw new Error('AUTO 是登录布局选择的保留字。');
  }
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(code)) {
    throw new Error('登录布局编码必须符合 [a-z][a-z0-9-]{0,63}。');
  }
  return code;
};

const seenVariants = new Set<string>();
const registeredLayouts = catalog.layouts.map((layout) => {
  const code = validateLoginLayoutCode(layout.code);
  if (seenVariants.has(code)) {
    throw new Error(`登录布局「${code}」重复注册。`);
  }
  seenVariants.add(code);
  if (!loginLayoutComponents[code]) {
    throw new Error(`登录布局「${code}」已声明但未注册组件。`);
  }
  return Object.freeze({ ...layout, code });
});

const unlistedComponents = Object.keys(loginLayoutComponents).filter(
  (code) => !seenVariants.has(code),
);
if (unlistedComponents.length > 0) {
  throw new Error(
    `登录布局组件未写入 catalog：${unlistedComponents.join(', ')}。`,
  );
}

const registeredVariantSet = new Set(
  registeredLayouts.map((layout) => layout.code),
);

export const listLoginLayoutOptions = () =>
  registeredLayouts.map((layout) => ({
    label: layout.label,
    value: layout.code,
  }));

export type LoginLayoutResolution =
  | { ok: true; variant: string }
  | {
      ok: false;
      message: string;
      requestedVariant: string;
      supportedVariants: string[];
    };

export const resolveLoginLayoutVariant = ({
  isProduction,
  localOverride,
  siteVariant,
}: {
  isProduction: boolean;
  localOverride?: string;
  siteVariant?: string;
}): LoginLayoutResolution => {
  const normalizedOverride = localOverride?.trim() || 'AUTO';
  const requestedVariant =
    !isProduction && normalizedOverride.toUpperCase() !== 'AUTO'
      ? normalizedOverride
      : siteVariant?.trim() || 'default';

  if (registeredVariantSet.has(requestedVariant)) {
    return { ok: true, variant: requestedVariant };
  }

  const supportedVariants = registeredLayouts.map((layout) => layout.code);
  return {
    ok: false,
    requestedVariant,
    supportedVariants,
    message: `不支持的登录布局「${requestedVariant}」。当前支持：${supportedVariants.join(', ')}。`,
  };
};

export const getLoginLayoutComponent = (variant: string) =>
  loginLayoutComponents[variant];
