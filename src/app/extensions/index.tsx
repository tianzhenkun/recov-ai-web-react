import React, { Suspense, useEffect, useState } from 'react';
import {
  getCachedRuoyiRoutes,
  subscribeRuoyiMenuCatalog,
} from '@/adapters/ruoyi/menu';
import { resolveRouteAuthorization } from '@/app/authorization';
import type { RuoyiRoute } from '@/app/menu';
import { loadFlowEventExtension } from '@/modules/recov/extensions/loadFlowEventExtension';
import {
  type FloatingProcessPanelDefaultMode,
  getStoredFloatingProcessPanelDefaultMode,
  setStoredFloatingProcessPanelDefaultMode,
} from '@/modules/recov/extensions/preferences';

const LazyFlowEventExtension = React.lazy(loadFlowEventExtension);

export type { FloatingProcessPanelDefaultMode };
export {
  getStoredFloatingProcessPanelDefaultMode,
  setStoredFloatingProcessPanelDefaultMode,
};

export const AppExtensions = ({
  authorizedRoutes,
  contextKey,
  floatingProcessPanelDefaultMode,
  signedIn,
}: {
  authorizedRoutes?: RuoyiRoute[];
  contextKey: string;
  floatingProcessPanelDefaultMode: FloatingProcessPanelDefaultMode;
  signedIn: boolean;
}) => {
  const [publishedRoutes, setPublishedRoutes] = useState<RuoyiRoute[]>(() =>
    authorizedRoutes === undefined ? getCachedRuoyiRoutes() : authorizedRoutes,
  );

  useEffect(() => {
    if (authorizedRoutes !== undefined) {
      setPublishedRoutes(authorizedRoutes);
      return undefined;
    }

    setPublishedRoutes(getCachedRuoyiRoutes());
    return subscribeRuoyiMenuCatalog(setPublishedRoutes);
  }, [authorizedRoutes, contextKey]);

  const effectiveRoutes = authorizedRoutes ?? publishedRoutes;
  const flowEventsEnabled =
    signedIn &&
    resolveRouteAuthorization('/flow-events', effectiveRoutes) === 'allowed';

  if (!flowEventsEnabled) return null;

  return (
    <Suspense fallback={null}>
      <LazyFlowEventExtension
        contextKey={contextKey}
        defaultMode={floatingProcessPanelDefaultMode}
        enabled
      />
    </Suspense>
  );
};
