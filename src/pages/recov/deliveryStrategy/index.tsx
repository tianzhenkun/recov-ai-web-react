import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Empty, Modal, message, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type DeliveryStrategyRow,
  type DeliveryWayListRow,
  getDeliveryWay,
  listDeliveryStrategy,
  listDeliveryVariables,
  listDeliveryWay,
  updateDeliveryWay,
} from '@/services/ruoyi/delivery';
import {
  cloneTemplates,
  type FlowDrawerNode,
  normalizeVariables,
  normalizeWayId,
} from './_shared';
import type { DeliveryContentTemplates, DeliveryTemplateTabId } from './_types';
import FlowDrawer from './FlowDrawer';
import StrategyCard from './StrategyCard';
import TemplatePanel from './TemplatePanel';

const DEFAULT_TEMPLATES: DeliveryContentTemplates = {
  sms: {
    enabled: false,
    content: '',
    providerTemplateId: '',
    sortOrder: 10,
    wayName: '智能短信',
  },
  email: {
    enabled: false,
    subject: '',
    html: '',
    providerTemplateId: '',
    sortOrder: 20,
    wayName: '智能邮件',
  },
  express: {
    enabled: false,
    content: '',
    providerTemplateId: '',
    sortOrder: 30,
    wayName: '智能快递',
  },
  call: {
    enabled: false,
    script: '',
    providerTemplateId: '',
    sortOrder: 40,
    wayName: '电话提醒',
  },
};

const DELIVERY_DEFAULT_TABS: DeliveryTemplateTabId[] = [
  'sms',
  'email',
  'express',
  'call',
];

const statusToEnabled = (value: unknown) =>
  value === 1 || value === '1' || value === true;

const findWayByTab = (
  wayRows: DeliveryWayListRow[],
  tab: DeliveryTemplateTabId,
) => wayRows.find((way) => normalizeWayId(way.nodeId) === tab);

const mergeWayIntoTemplates = (
  prev: DeliveryContentTemplates,
  way: DeliveryWayListRow,
): DeliveryContentTemplates => {
  const tab = normalizeWayId(way.nodeId);
  if (!tab) return prev;
  const enabled = statusToEnabled(way.status ?? way.enabled);
  const base = {
    enabled,
    providerTemplateId: way.providerTemplateId ?? '',
    sortOrder: way.sortOrder ?? way.sort ?? null,
    wayName: way.wayName ?? way.nodeName,
  };
  if (tab === 'sms') {
    return {
      ...prev,
      sms: { ...prev.sms, ...base, content: way.contentTemplate ?? '' },
    };
  }
  if (tab === 'email') {
    return {
      ...prev,
      email: {
        ...prev.email,
        ...base,
        subject: way.subjectTemplate ?? '',
        html: way.contentTemplate ?? '',
      },
    };
  }
  if (tab === 'express') {
    return {
      ...prev,
      express: { ...prev.express, ...base, content: way.contentTemplate ?? '' },
    };
  }
  return {
    ...prev,
    call: { ...prev.call, ...base, script: way.contentTemplate ?? '' },
  };
};

const buildTemplatesFromWays = (ways: DeliveryWayListRow[]) =>
  ways.reduce(
    (result, way) => mergeWayIntoTemplates(result, way),
    cloneTemplates(DEFAULT_TEMPLATES),
  );

const getTemplateContent = (
  templates: DeliveryContentTemplates,
  tab: DeliveryTemplateTabId,
) => {
  if (tab === 'sms') return templates.sms.content;
  if (tab === 'email') return templates.email.html;
  if (tab === 'express') return templates.express.content;
  return templates.call.script;
};

const getTemplateEnabled = (
  templates: DeliveryContentTemplates,
  tab: DeliveryTemplateTabId,
) => templates[tab].enabled;

const buildSavePayload = (
  templates: DeliveryContentTemplates,
  tab: DeliveryTemplateTabId,
  way?: DeliveryWayListRow,
) => {
  const common = {
    wayName: templates[tab].wayName || way?.wayName || way?.nodeName,
    providerTemplateId:
      templates[tab].providerTemplateId ?? way?.providerTemplateId ?? '',
    sortOrder: templates[tab].sortOrder ?? way?.sortOrder ?? way?.sort ?? null,
    status: getTemplateEnabled(templates, tab) ? 1 : 0,
  };
  if (tab === 'email') {
    return {
      ...common,
      subjectTemplate: templates.email.subject,
      contentTemplate: templates.email.html,
    };
  }
  if (tab === 'sms') {
    return {
      ...common,
      subjectTemplate: null,
      contentTemplate: templates.sms.content,
    };
  }
  if (tab === 'express') {
    return {
      ...common,
      subjectTemplate: null,
      contentTemplate: templates.express.content,
    };
  }
  return {
    ...common,
    subjectTemplate: null,
    contentTemplate: templates.call.script,
  };
};

const DeliveryStrategyPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [strategyRows, setStrategyRows] = useState<DeliveryStrategyRow[]>([]);
  const [wayRows, setWayRows] = useState<DeliveryWayListRow[]>([]);
  const [templates, setTemplates] =
    useState<DeliveryContentTemplates>(DEFAULT_TEMPLATES);
  const [savedSnapshot, setSavedSnapshot] =
    useState<DeliveryContentTemplates | null>(null);
  const [variables, setVariables] = useState<
    Array<{ key?: string; label?: string }>
  >([]);

  const [activeTab, setActiveTab] = useState<DeliveryTemplateTabId>('sms');

  const [flowOpen, setFlowOpen] = useState(false);
  const [flowStrategyId, setFlowStrategyId] = useState('');
  const [flowStrategyName, setFlowStrategyName] = useState('');

  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  const templateVariables = useMemo(
    () => normalizeVariables(variables),
    [variables],
  );

  const availableTabs = useMemo<DeliveryTemplateTabId[]>(() => {
    const list: DeliveryTemplateTabId[] = [];
    for (const w of wayRows) {
      const id = normalizeWayId(w.nodeId);
      if (id && !list.includes(id)) list.push(id);
    }
    return list.length > 0 ? list : DELIVERY_DEFAULT_TABS;
  }, [wayRows]);

  const refreshWays = useCallback(async () => {
    const wayRes = await listDeliveryWay();
    const ways = Array.isArray(wayRes.rows) ? wayRes.rows : [];
    setWayRows(ways);
    const nextTemplates = buildTemplatesFromWays(ways);
    setTemplates(nextTemplates);
    setSavedSnapshot(cloneTemplates(nextTemplates));
    return ways;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [strategyRes, wayRes, variableRes] = await Promise.all([
          listDeliveryStrategy(),
          listDeliveryWay(),
          listDeliveryVariables(),
        ]);
        if (cancelled) return;

        const rows = Array.isArray(strategyRes?.rows) ? strategyRes.rows : [];
        const ways = Array.isArray(wayRes?.rows) ? wayRes.rows : [];
        setStrategyRows(rows);
        setWayRows(ways);
        setVariables(variableRes.data ?? []);

        const enabledTabs: DeliveryTemplateTabId[] = [];
        for (const w of ways) {
          const id = normalizeWayId(w.nodeId);
          if (id && !enabledTabs.includes(id)) enabledTabs.push(id);
        }
        const tabsToUse =
          enabledTabs.length > 0 ? enabledTabs : DELIVERY_DEFAULT_TABS;
        setActiveTab(tabsToUse[0]);

        const nextTemplates = buildTemplatesFromWays(ways);
        setTemplates(nextTemplates);
        setSavedSnapshot(cloneTemplates(nextTemplates));
      } catch {
        if (!cancelled) {
          messageApi.error('送达配置加载失败，请稍后重试');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messageApi]);

  const handleSaveTemplates = useCallback(async () => {
    const current = templatesRef.current;
    const way = findWayByTab(wayRows, activeTab);
    const content = getTemplateContent(current, activeTab).trim();
    const enabled = getTemplateEnabled(current, activeTab);
    const providerTemplateId = String(
      current[activeTab].providerTemplateId ?? '',
    ).trim();

    if (!content) {
      messageApi.warning('内容模板不能为空');
      return false;
    }
    if (activeTab === 'email' && enabled && !current.email.subject.trim()) {
      messageApi.warning('邮件启用时必须维护邮件主题');
      return false;
    }
    if ((activeTab === 'sms' || activeTab === 'email') && enabled) {
      if (!providerTemplateId) {
        messageApi.warning('短信/邮件启用时必须维护服务商模板 ID');
        return false;
      }
    }

    setSaving(true);
    try {
      await updateDeliveryWay(
        activeTab,
        buildSavePayload(current, activeTab, way),
      );
      await refreshWays();
      messageApi.success('送达模板已保存');
      return true;
    } catch {
      messageApi.error('保存失败，请稍后重试');
      return false;
    } finally {
      setSaving(false);
    }
  }, [activeTab, messageApi, refreshWays, wayRows]);

  const handleActiveTabChange = useCallback(
    async (next: DeliveryTemplateTabId) => {
      if (next === activeTab) return;
      setActiveTab(next);
      try {
        const detail = await getDeliveryWay(next);
        const way = detail.data;
        if (!way) return;
        setWayRows((prev) => {
          const exists = prev.some((item) => item.nodeId === way.nodeId);
          return exists
            ? prev.map((item) => (item.nodeId === way.nodeId ? way : item))
            : [...prev, way];
        });
        setTemplates((prev) => {
          const merged = mergeWayIntoTemplates(prev, way);
          setSavedSnapshot(cloneTemplates(merged));
          return merged;
        });
      } catch {
        messageApi.error('渠道模板详情加载失败，请稍后重试');
      }
    },
    [activeTab, messageApi],
  );

  const openFlowDrawer = (row: DeliveryStrategyRow) => {
    setFlowStrategyId(row.sceneCode || String(row.id));
    setFlowStrategyName(row.sceneName || row.deliveryObj);
    setFlowOpen(true);
  };

  const handleFlowSaved = (strategyId: string, nodes: FlowDrawerNode[]) => {
    setStrategyRows((prev) =>
      prev.map((row) => {
        if (String(row.id) !== strategyId && row.sceneCode !== strategyId) {
          return row;
        }
        return {
          ...row,
          nodes: nodes.map((item) => ({
            nodeId: item.nodeId,
            nodeName: item.nodeName,
            wayCode: item.nodeId,
            wayName: item.nodeName,
            proceedOnSuccess: item.proceedOnSuccess,
          })),
        };
      }),
    );
  };

  const subTitle = `配置不同业务场景下的送达方式优先级，系统按顺序自动尝试送达，共 ${strategyRows.length} 个场景`;

  return (
    <PageContainer title="全域送达策略" subTitle={subTitle}>
      {messageContextHolder}
      {modalContextHolder}

      <div className="flex flex-col gap-4 pb-4">
        <ProCard>
          <Spin spinning={loading}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-bold text-slate-900">
                  策略优先级配置
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  按业务场景维护送达渠道顺序，配置按钮可打开右侧抽屉编排。
                </div>
              </div>
              <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                {strategyRows.length} 个场景
              </span>
            </div>

            {strategyRows.length === 0 ? (
              <Empty description="暂无策略数据" />
            ) : (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                {strategyRows.map((row) => (
                  <StrategyCard
                    key={row.id}
                    row={row}
                    onConfigure={openFlowDrawer}
                  />
                ))}
              </div>
            )}
          </Spin>
        </ProCard>

        <TemplatePanel
          loading={loading}
          saving={saving}
          templates={templates}
          savedSnapshot={savedSnapshot}
          setTemplates={(updater) => setTemplates((prev) => updater(prev))}
          activeTab={activeTab}
          onActiveTabChange={handleActiveTabChange}
          availableTabs={availableTabs}
          variables={templateVariables}
          onSave={handleSaveTemplates}
          modalApi={modalApi}
          messageApi={messageApi}
        />
      </div>

      <FlowDrawer
        open={flowOpen}
        strategyId={flowStrategyId}
        strategyName={flowStrategyName}
        wayRows={wayRows}
        onClose={() => setFlowOpen(false)}
        onSaved={handleFlowSaved}
        messageApi={messageApi}
      />
    </PageContainer>
  );
};

export default DeliveryStrategyPage;
