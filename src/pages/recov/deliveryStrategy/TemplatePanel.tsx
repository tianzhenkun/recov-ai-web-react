import {
  CheckCircleOutlined,
  DownloadOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { Button, Spin, Switch } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { HookAPI } from 'antd/es/modal/useModal';
import clsx from 'clsx';
import { useMemo, useRef } from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import type {
  TemplateEditorFeatures,
  TemplateVariable,
} from '@/components/TemplateEditor/types';
import type { DeliveryContentTemplates, DeliveryTemplateTabId } from './_mock';
import {
  computePhoneSeconds,
  computeSmsBillCount,
  isTabDirty,
  renderTemplateForDisplay,
  TEMPLATE_TAB_ICON,
  TEMPLATE_TAB_LABEL,
} from './_shared';

const PLAIN_FEATURES: TemplateEditorFeatures = {
  textStyle: false,
  color: false,
  align: false,
  variable: true,
};

const EMAIL_FEATURES: TemplateEditorFeatures = {
  textStyle: true,
  color: true,
  backgroundColor: true,
  align: true,
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
  smsVariables: TemplateVariable[];
  emailVariables: TemplateVariable[];
  phoneVariables: TemplateVariable[];
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
  smsVariables,
  emailVariables,
  phoneVariables,
  onSave,
  modalApi,
  messageApi,
}: TemplatePanelProps) => {
  const ActiveIcon = TEMPLATE_TAB_ICON[activeTab];
  const dirty = isTabDirty(savedSnapshot, templates, activeTab);
  const pendingTabRef = useRef<DeliveryTemplateTabId | null>(null);

  const smsCharCount = useMemo(
    () => renderTemplateForDisplay(templates.sms.content, smsVariables).length,
    [templates.sms.content, smsVariables],
  );
  const phoneSeconds = useMemo(
    () => computePhoneSeconds(templates.phone.script, phoneVariables),
    [templates.phone.script, phoneVariables],
  );

  const handleTabClick = (nextTab: DeliveryTemplateTabId) => {
    if (nextTab === activeTab || saving) return;
    if (!isTabDirty(savedSnapshot, templates, activeTab)) {
      void onActiveTabChange(nextTab);
      return;
    }
    pendingTabRef.current = nextTab;
    modalApi.confirm({
      title: '未保存提醒',
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

  const handleEmailAttachToggle = (checked: boolean) =>
    setTemplates((prev) => ({
      ...prev,
      email: { ...prev.email, attachPdf: checked },
    }));

  const handlePhoneScriptChange = (value: string) =>
    setTemplates((prev) => ({
      ...prev,
      phone: { ...prev.phone, script: value },
    }));

  const triggerExpressExport = () => {
    modalApi.confirm({
      title: '导出收件人信息',
      content: '确认导出收件人信息（CSV）吗？（mock）',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        messageApi.success('导出任务已创建（mock）');
      },
    });
  };

  const triggerExpressPrint = () => {
    modalApi.confirm({
      title: '批量打印面单',
      content: '确认批量打印面单吗？（mock）',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        messageApi.success('打印任务已创建（mock）');
      },
    });
  };

  const renderSms = () => (
    <div className="flex flex-col gap-4">
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
          variables={smsVariables}
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
          variables={emailVariables}
          features={PLAIN_FEATURES}
          height={72}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">邮件正文</span>
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            <span id="delivery-email-attach-pdf">附带 PDF 附件</span>
            <Switch
              size="small"
              aria-labelledby="delivery-email-attach-pdf"
              checked={templates.email.attachPdf}
              onChange={handleEmailAttachToggle}
            />
          </span>
        </div>
        <TemplateEditor
          value={templates.email.html}
          onChange={handleEmailHtmlChange}
          outputType="html"
          placeholder="请输入邮件内容（可用变量占位）"
          variables={emailVariables}
          features={EMAIL_FEATURES}
          height={320}
        />
      </div>
    </div>
  );

  const renderExpress = () => (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 md:grid-cols-[64px_minmax(0,1fr)] md:items-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
          <ActiveIcon style={{ fontSize: 28, color: '#f59e0b' }} />
        </span>
        <div>
          <div className="text-base font-bold text-slate-900">快递履约触达</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            根据收件人信息生成面单与寄件备注，支持顺丰、京东、EMS 等渠道配置。
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={triggerExpressExport}
        >
          导出收件人信息
        </Button>
        <Button icon={<PrinterOutlined />} onClick={triggerExpressPrint}>
          批量打印面单
        </Button>
      </div>
    </div>
  );

  const renderPhone = () => (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">
            语音提醒脚本
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>预计时长: {phoneSeconds} 秒</span>
            <span>语音引擎: 标准女声</span>
          </div>
        </div>
        <TemplateEditor
          value={templates.phone.script}
          onChange={handlePhoneScriptChange}
          outputType="text"
          placeholder="请输入电话提醒话术"
          variables={phoneVariables}
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
        return renderPhone();
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
              按送达渠道维护触达文案，变量由字典统一提供。
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
            <span className="text-xs text-slate-400">·</span>
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
