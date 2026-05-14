import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Empty, Modal, message, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  type DeliveryStrategyRow,
  type DeliveryWayListRow,
  listDeliveryStrategy,
  listDeliveryWay,
} from '@/services/ruoyi/delivery';
import {
  type DeliveryContentTemplates,
  type DeliveryRetrySettings,
  type DeliveryTemplateTabId,
  getDeliveryTemplatesMock,
  getDeliveryWayTemplateMock,
  updateDeliveryTemplatesMock,
} from './_mock';
import {
  cloneTemplates,
  EMAIL_VARS_FALLBACK,
  type FlowDrawerNode,
  normalizeDictVariables,
  normalizeWayId,
  PHONE_VARS_FALLBACK,
  SMS_VARS_FALLBACK,
} from './_shared';
import FlowDrawer from './FlowDrawer';
import StrategyCard from './StrategyCard';
import TemplatePanel from './TemplatePanel';

const DEFAULT_TEMPLATES: DeliveryContentTemplates = {
  sms: { enabled: true, content: '' },
  email: { enabled: true, subject: '', html: '', attachPdf: true },
  express: { enabled: true, company: '', note: '' },
  phone: { enabled: true, script: '' },
};

const DEFAULT_RETRY: DeliveryRetrySettings = {
  enabled: true,
  waitHours: 24,
  maxRetriesPerChannel: 3,
};

const DELIVERY_DEFAULT_TABS: DeliveryTemplateTabId[] = ['sms', 'email'];

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
  const [retrySettings, setRetrySettings] =
    useState<DeliveryRetrySettings>(DEFAULT_RETRY);

  const [activeTab, setActiveTab] = useState<DeliveryTemplateTabId>('sms');

  const [flowOpen, setFlowOpen] = useState(false);
  const [flowStrategyId, setFlowStrategyId] = useState('');
  const [flowStrategyName, setFlowStrategyName] = useState('');

  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  const smsDict = useRuoyiDict('ai_delivery_sms_vars');
  const emailDict = useRuoyiDict('ai_delivery_email_vars');
  const phoneDict = useRuoyiDict('ai_delivery_phone_vars');

  const smsVariables = useMemo(
    () => normalizeDictVariables(smsDict.options, SMS_VARS_FALLBACK),
    [smsDict.options],
  );
  const emailVariables = useMemo(
    () => normalizeDictVariables(emailDict.options, EMAIL_VARS_FALLBACK),
    [emailDict.options],
  );
  const phoneVariables = useMemo(
    () => normalizeDictVariables(phoneDict.options, PHONE_VARS_FALLBACK),
    [phoneDict.options],
  );

  const availableTabs = useMemo<DeliveryTemplateTabId[]>(() => {
    const list: DeliveryTemplateTabId[] = [];
    for (const w of wayRows) {
      const id = normalizeWayId(w.nodeId);
      if (id && !list.includes(id)) list.push(id);
    }
    return list.length > 0 ? list : DELIVERY_DEFAULT_TABS;
  }, [wayRows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [mockRes, strategyRes, wayRes] = await Promise.all([
          getDeliveryTemplatesMock(),
          listDeliveryStrategy(),
          listDeliveryWay(),
        ]);
        if (cancelled) return;

        setRetrySettings({ ...mockRes.retry });

        const rows = Array.isArray(strategyRes?.rows) ? strategyRes.rows : [];
        setStrategyRows(rows);

        const ways = Array.isArray(wayRes?.rows) ? wayRes.rows : [];
        setWayRows(ways);

        const enabledTabs: DeliveryTemplateTabId[] = [];
        for (const w of ways) {
          const id = normalizeWayId(w.nodeId);
          if (id && !enabledTabs.includes(id)) enabledTabs.push(id);
        }
        const tabsToUse =
          enabledTabs.length > 0 ? enabledTabs : DELIVERY_DEFAULT_TABS;
        const initialTab = tabsToUse[0];
        setActiveTab(initialTab);

        const partial = await getDeliveryWayTemplateMock(initialTab);
        if (cancelled) return;
        const merged: DeliveryContentTemplates = {
          ...mockRes.templates,
          [initialTab]: partial,
        };
        setTemplates(merged);
        setSavedSnapshot(cloneTemplates(merged));
      } catch {
        if (!cancelled) {
          messageApi.error('数据加载失败，请稍后重试');
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
    setSaving(true);
    try {
      const snapshot = cloneTemplates(templatesRef.current);
      await updateDeliveryTemplatesMock({
        templates: snapshot,
        retry: { ...retrySettings },
      });
      setSavedSnapshot(snapshot);
      messageApi.success('配置已保存（mock）');
      return true;
    } catch {
      messageApi.error('保存失败，请稍后重试（mock）');
      return false;
    } finally {
      setSaving(false);
    }
  }, [messageApi, retrySettings]);

  const handleActiveTabChange = useCallback(
    async (next: DeliveryTemplateTabId) => {
      if (next === activeTab) return;
      const partial = await getDeliveryWayTemplateMock(next);
      const merged: DeliveryContentTemplates = {
        ...templatesRef.current,
        [next]: partial,
      };
      setActiveTab(next);
      setTemplates(merged);
      setSavedSnapshot(cloneTemplates(merged));
    },
    [activeTab],
  );

  const openFlowDrawer = (row: DeliveryStrategyRow) => {
    setFlowStrategyId(String(row.id));
    setFlowStrategyName(row.deliveryObj);
    setFlowOpen(true);
  };

  const handleFlowSaved = (strategyId: string, nodes: FlowDrawerNode[]) => {
    setStrategyRows((prev) =>
      prev.map((row) => {
        if (String(row.id) !== strategyId) return row;
        return {
          ...row,
          nodes: nodes.map((item) => ({
            nodeId: item.nodeId,
            nodeName: item.nodeName,
            proceedOnSuccess: item.proceedOnSuccess,
          })),
        };
      }),
    );
  };

  const subTitle = `配置不同业务场景下的送达方式优先级，系统按顺序自动尝试送达 · 共 ${strategyRows.length} 个场景`;

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
                  按业务对象维护送达节点顺序，配置按钮可打开右侧抽屉编排。
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
          smsVariables={smsVariables}
          emailVariables={emailVariables}
          phoneVariables={phoneVariables}
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
