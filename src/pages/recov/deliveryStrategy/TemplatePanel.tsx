import { CheckCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Button, Empty, Spin, Tabs, Transfer } from 'antd';
import type { HookAPI } from 'antd/es/modal/useModal';
import { useEffect, useReducer, useRef } from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import type {
  TemplateEditorFeatures,
  TemplateVariable,
} from '@/components/TemplateEditor/types';
import type { DeliveryExpressExcelField } from '@/services/ruoyi/delivery';
import { isTabDirty, TEMPLATE_TAB_ICON, TEMPLATE_TAB_LABEL } from './_shared';
import type { DeliveryContentTemplates, DeliveryTemplateTabId } from './_types';

const PLAIN_FEATURES: TemplateEditorFeatures = {
  textStyle: false,
  color: false,
  align: false,
  image: false,
  table: false,
  variable: true,
};

const EMAIL_FEATURES: TemplateEditorFeatures = {
  textStyle: true,
  color: true,
  backgroundColor: true,
  align: true,
  image: false,
  table: false,
  variable: true,
  fontFamily: true,
  fontSize: true,
};

export type TemplatePanelProps = {
  loading: boolean;
  saving: boolean;
  templates: DeliveryContentTemplates;
  savedSnapshot: DeliveryContentTemplates | null;
  setTemplates: (
    updater: (prev: DeliveryContentTemplates) => DeliveryContentTemplates,
  ) => void;
  activeTab: DeliveryTemplateTabId;
  onActiveTabChange: (tab: DeliveryTemplateTabId) => void;
  availableTabs: DeliveryTemplateTabId[];
  variables: TemplateVariable[];
  expressExcelFields: DeliveryExpressExcelField[];
  onSave: () => Promise<boolean>;
  modalApi: HookAPI;
};

const TemplatePanel = ({
  loading,
  saving,
  templates,
  savedSnapshot,
  setTemplates,
  activeTab,
  onActiveTabChange,
  availableTabs,
  variables,
  expressExcelFields,
  onSave,
  modalApi,
}: TemplatePanelProps) => {
  const hasEnabledTabs = availableTabs.length > 0;
  const pendingTabRef = useRef<DeliveryTemplateTabId | null>(null);
  const editedTabsRef = useRef<Set<DeliveryTemplateTabId>>(new Set());
  const [, bumpDirtyState] = useReducer((value: number) => value + 1, 0);

  const isDirtyTab = (tab: DeliveryTemplateTabId) =>
    hasEnabledTabs &&
    editedTabsRef.current.has(tab) &&
    isTabDirty(savedSnapshot, templates, tab);

  const dirty = isDirtyTab(activeTab);

  useEffect(() => {
    const nextEditedTabs = new Set<DeliveryTemplateTabId>();
    for (const tab of editedTabsRef.current) {
      if (isTabDirty(savedSnapshot, templates, tab)) {
        nextEditedTabs.add(tab);
      }
    }

    if (
      nextEditedTabs.size === editedTabsRef.current.size &&
      [...nextEditedTabs].every((tab) => editedTabsRef.current.has(tab))
    ) {
      return;
    }

    editedTabsRef.current = nextEditedTabs;
    bumpDirtyState();
  }, [savedSnapshot, templates]);

  const markTabEdited = (tab: DeliveryTemplateTabId) => {
    if (editedTabsRef.current.has(tab)) return;
    editedTabsRef.current.add(tab);
    bumpDirtyState();
  };

  const handleTabClick = (nextTab: DeliveryTemplateTabId) => {
    if (nextTab === activeTab || saving) return;
    if (!isDirtyTab(activeTab)) {
      void onActiveTabChange(nextTab);
      return;
    }
    pendingTabRef.current = nextTab;
    modalApi.confirm({
      title: '未保存提示',
      content: '当前渠道配置已修改但未保存，是否先保存再切换？',
      okText: '保存并切换',
      cancelText: '不保存切换',
      closable: false,
      maskClosable: false,
      keyboard: false,
      okButtonProps: { loading: saving },
      onOk: async () => {
        const target = pendingTabRef.current;
        pendingTabRef.current = null;
        if (!target) return;
        const ok = await onSave();
        if (ok) await onActiveTabChange(target);
      },
      onCancel: () => {
        const target = pendingTabRef.current;
        pendingTabRef.current = null;
        if (!target) return;
        void onActiveTabChange(target);
      },
    });
  };

  const handleSmsContentChange = (value: string) => {
    markTabEdited('sms');
    setTemplates((prev) => ({
      ...prev,
      sms: { ...prev.sms, content: value },
    }));
  };

  const handleEmailSubjectChange = (value: string) => {
    markTabEdited('email');
    setTemplates((prev) => ({
      ...prev,
      email: { ...prev.email, subject: value },
    }));
  };

  const handleEmailHtmlChange = (value: string) => {
    markTabEdited('email');
    setTemplates((prev) => ({
      ...prev,
      email: { ...prev.email, html: value },
    }));
  };

  const handleExpressExcelFieldsChange = (nextKeys: string[]) => {
    markTabEdited('express');
    setTemplates((prev) => ({
      ...prev,
      express: {
        ...prev.express,
        excelFields: nextKeys,
      },
    }));
  };

  const handleCallScriptChange = (value: string) => {
    markTabEdited('call');
    setTemplates((prev) => ({
      ...prev,
      call: { ...prev.call, script: value },
    }));
  };

  const renderSms = () => (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">短信内容</span>
        </div>
        <TemplateEditor
          value={templates.sms.content}
          onChange={handleSmsContentChange}
          outputType="text"
          placeholder="请输入短信模板"
          variables={variables}
          features={PLAIN_FEATURES}
          height={260}
        />
      </div>
    </div>
  );

  const renderEmail = () => (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">邮件主题</span>
        </div>
        <TemplateEditor
          value={templates.email.subject}
          onChange={handleEmailSubjectChange}
          outputType="text"
          placeholder="请输入邮件主题"
          variables={variables}
          features={PLAIN_FEATURES}
          height={72}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">邮件正文</span>
        </div>
        <TemplateEditor
          value={templates.email.html}
          onChange={handleEmailHtmlChange}
          outputType="html"
          placeholder="请输入邮件内容，可插入变量占位"
          variables={variables}
          features={EMAIL_FEATURES}
          height={320}
        />
      </div>
    </div>
  );

  const renderExpress = () => {
    const transferItems = expressExcelFields.map((field) => ({
      key: field.key,
      title: field.label,
    }));

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-solid border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-xl text-emerald-600">
                <FileExcelOutlined />
              </span>
              <div className="leading-snug">
                <div className="text-base font-semibold text-slate-900">
                  Excel导出字段
                </div>
                <div className="mt-0.5 text-xs text-slate-500">智能快递</div>
              </div>
            </div>
            <span className="inline-flex items-center rounded-md bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
              {templates.express.excelFields.length} 列
            </span>
          </div>
          <div className="overflow-x-auto">
            <Transfer
              oneWay
              className="min-w-[620px]"
              dataSource={transferItems}
              targetKeys={templates.express.excelFields}
              titles={['可选字段', '导出字段']}
              locale={{
                itemUnit: '列',
                itemsUnit: '列',
                notFoundContent: '暂无字段',
                searchPlaceholder: '搜索字段',
              }}
              listStyle={() => ({
                flex: 1,
                height: 220,
                minWidth: 280,
              })}
              render={(item) => item.title}
              showSearch={expressExcelFields.length > 8}
              onChange={(nextTargetKeys) =>
                handleExpressExcelFieldsChange(nextTargetKeys.map(String))
              }
            />
          </div>
        </div>
      </div>
    );
  };

  const renderCall = () => (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">
            电话提醒话术
          </span>
        </div>
        <TemplateEditor
          value={templates.call.script}
          onChange={handleCallScriptChange}
          outputType="text"
          placeholder="请输入电话提醒话术"
          variables={variables}
          features={PLAIN_FEATURES}
          height={260}
        />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'sms':
        return renderSms();
      case 'email':
        return renderEmail();
      case 'express':
        return renderExpress();
      default:
        return renderCall();
    }
  };

  return (
    <ProCard
      title="送达模板配置"
      extra={
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={saving}
          disabled={!dirty || !hasEnabledTabs}
          onClick={onSave}
        >
          保存配置
        </Button>
      }
    >
      <Spin spinning={loading}>
        {hasEnabledTabs ? (
          <Tabs
            activeKey={activeTab}
            onChange={(key) => handleTabClick(key as DeliveryTemplateTabId)}
            items={availableTabs.map((tabId) => {
              const Icon = TEMPLATE_TAB_ICON[tabId];
              return {
                key: tabId,
                icon: <Icon />,
                label: TEMPLATE_TAB_LABEL[tabId],
                children: tabId === activeTab ? renderContent() : null,
              };
            })}
          />
        ) : (
          <Empty description="暂无启用渠道" />
        )}
      </Spin>
    </ProCard>
  );
};

export default TemplatePanel;
