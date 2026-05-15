import { CheckCircleOutlined } from '@ant-design/icons';
import { Button, Input, Spin, Switch } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { HookAPI } from 'antd/es/modal/useModal';
import clsx from 'clsx';
import { useMemo, useRef } from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import type {
  TemplateEditorFeatures,
  TemplateVariable,
} from '@/components/TemplateEditor/types';
import {
  computePhoneSeconds,
  computeSmsBillCount,
  isTabDirty,
  renderTemplateForDisplay,
  TEMPLATE_TAB_ICON,
  TEMPLATE_TAB_LABEL,
} from './_shared';
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
  onSave: () => Promise<boolean>;
  modalApi: HookAPI;
  messageApi: MessageInstance;
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
  onSave,
  modalApi,
}: TemplatePanelProps) => {
  const ActiveIcon = TEMPLATE_TAB_ICON[activeTab];
  const dirty = isTabDirty(savedSnapshot, templates, activeTab);
  const pendingTabRef = useRef<DeliveryTemplateTabId | null>(null);

  const smsCharCount = useMemo(
    () => renderTemplateForDisplay(templates.sms.content, variables).length,
    [templates.sms.content, variables],
  );
  const callSeconds = useMemo(
    () => computePhoneSeconds(templates.call.script, variables),
    [templates.call.script, variables],
  );

  const updateActiveMeta = (
    patch: Partial<DeliveryContentTemplates[DeliveryTemplateTabId]>,
  ) => {
    setTemplates(
      (prev) =>
        ({
          ...prev,
          [activeTab]: { ...prev[activeTab], ...patch },
        }) as DeliveryContentTemplates,
    );
  };

  const handleTabClick = (nextTab: DeliveryTemplateTabId) => {
    if (nextTab === activeTab || saving) return;
    if (!isTabDirty(savedSnapshot, templates, activeTab)) {
      void onActiveTabChange(nextTab);
      return;
    }
    pendingTabRef.current = nextTab;
    modalApi.confirm({
      title: '未保存提示',
      content: '当前渠道内容已修改但未保存，是否先保存再切换？',
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

  const handleSmsContentChange = (value: string) =>
    setTemplates((prev) => ({
      ...prev,
      sms: { ...prev.sms, content: value },
    }));

  const handleEmailSubjectChange = (value: string) =>
    setTemplates((prev) => ({
      ...prev,
      email: { ...prev.email, subject: value },
    }));

  const handleEmailHtmlChange = (value: string) =>
    setTemplates((prev) => ({
      ...prev,
      email: { ...prev.email, html: value },
    }));

  const handleExpressContentChange = (value: string) =>
    setTemplates((prev) => ({
      ...prev,
      express: { ...prev.express, content: value },
    }));

  const handleCallScriptChange = (value: string) =>
    setTemplates((prev) => ({
      ...prev,
      call: { ...prev.call, script: value },
    }));

  const renderMeta = () => {
    const template = templates[activeTab];
    const needProvider = activeTab === 'sms' || activeTab === 'email';
    return (
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-700 md:justify-start">
          <span className="font-semibold">启用状态</span>
          <Switch
            aria-label={`${TEMPLATE_TAB_LABEL[activeTab]}启用状态`}
            checked={template.enabled}
            onChange={(checked) => updateActiveMeta({ enabled: checked })}
          />
        </div>
        {needProvider ? (
          <Input
            allowClear
            value={template.providerTemplateId ?? ''}
            addonBefore="服务商模板 ID"
            placeholder="启用短信/邮件时必填"
            onChange={(event) =>
              updateActiveMeta({ providerTemplateId: event.target.value })
            }
          />
        ) : (
          <div className="flex items-center text-xs text-slate-500">
            非短信/邮件渠道仅需维护内容模板。
          </div>
        )}
      </div>
    );
  };

  const renderSms = () => (
    <div className="flex flex-col gap-4">
      {renderMeta()}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">短信内容</span>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>当前字数: {smsCharCount}</span>
            <span>计费条数: {computeSmsBillCount(smsCharCount)} 条</span>
          </div>
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
      {renderMeta()}
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

  const renderExpress = () => (
    <div className="flex flex-col gap-4">
      {renderMeta()}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">
            快递内容模板
          </span>
        </div>
        <TemplateEditor
          value={templates.express.content}
          onChange={handleExpressContentChange}
          outputType="text"
          placeholder="请输入快递送达内容模板"
          variables={variables}
          features={PLAIN_FEATURES}
          height={260}
        />
      </div>
    </div>
  );

  const renderCall = () => (
    <div className="flex flex-col gap-4">
      {renderMeta()}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">
            电话提醒话术
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>预计时长: {callSeconds} 秒</span>
          </div>
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
    <Spin spinning={loading}>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-900">
              送达内容模板
            </div>
            <div className="mt-1 text-xs text-slate-500">
              按渠道维护公共送达文案，变量来自后端配置接口。
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            <ActiveIcon style={{ fontSize: 14 }} />
            {TEMPLATE_TAB_LABEL[activeTab]}
          </span>
        </header>

        <div
          role="tablist"
          aria-label="送达模板"
          className="mb-4 flex flex-wrap gap-2"
        >
          {availableTabs.map((tabId) => {
            const Icon = TEMPLATE_TAB_ICON[tabId];
            const isActive = tabId === activeTab;
            return (
              <button
                key={tabId}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => handleTabClick(tabId)}
                className={clsx(
                  'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition',
                  isActive
                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600',
                )}
              >
                <Icon style={{ fontSize: 14 }} />
                {TEMPLATE_TAB_LABEL[tabId]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-sm">
            <ActiveIcon style={{ color: '#4f46e5' }} />
            <span className="font-semibold text-slate-900">内容编辑器</span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs text-slate-500">
              {TEMPLATE_TAB_LABEL[activeTab]}
            </span>
          </div>
          {dirty ? (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={saving}
              onClick={onSave}
            >
              保存配置
            </Button>
          ) : null}
        </div>

        <div className="mt-4">{renderContent()}</div>
      </div>
    </Spin>
  );
};

export default TemplatePanel;
