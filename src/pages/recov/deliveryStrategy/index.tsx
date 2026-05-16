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
  isDeliveryWayEnabled,
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

const findWayByTab = (
  wayRows: DeliveryWayListRow[],
  tab: DeliveryTemplateTabId,
) => wayRows.find((way) => normalizeWayId(way.nodeId) === tab);

const getEnabledTemplateTabs = (ways: DeliveryWayListRow[]) => {
  const list: DeliveryTemplateTabId[] = [];
  for (const way of ways) {
    const id = normalizeWayId(way.nodeId);
    if (id && isDeliveryWayEnabled(way) && !list.includes(id)) {
      list.push(id);
    }
  }
  return list;
};

const mergeWayIntoTemplates = (
  prev: DeliveryContentTemplates,
  way: DeliveryWayListRow,
): DeliveryContentTemplates => {
  const tab = normalizeWayId(way.nodeId);
  if (!tab) return prev;
  const enabled = isDeliveryWayEnabled(way);
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

const buildSavePayload = (
  templates: DeliveryContentTemplates,
  tab: DeliveryTemplateTabId,
  way?: DeliveryWayListRow,
) => {
  const common = {
    wayName: templates[tab].wayName || way?.wayName || way?.nodeName,
    sortOrder: templates[tab].sortOrder ?? way?.sortOrder ?? way?.sort ?? null,
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
    return getEnabledTemplateTabs(wayRows);
  }, [wayRows]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, availableTabs]);

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

        const enabledTabs = getEnabledTemplateTabs(ways);
        if (enabledTabs.length > 0) {
          setActiveTab(enabledTabs[0]);
        }

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

    if (!content) {
      messageApi.warning('内容模板不能为空');
      return false;
    }
    if (activeTab === 'email' && !current.email.subject.trim()) {
      messageApi.warning('邮件主题不能为空');
      return false;
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

  return (
    <PageContainer breadcrumbRender={false} title="全域送达策略">
      {messageContextHolder}
      {modalContextHolder}

      <div className="flex flex-col gap-4 pb-4">
        <ProCard title="策略优先级配置">
          <Spin spinning={loading}>
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
