import { CheckCircleOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Button, Empty, Spin, Tabs } from 'antd';
import type { HookAPI } from 'antd/es/modal/useModal';
import { useRef } from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import type {
  TemplateEditorFeatures,
  TemplateVariable,
} from '@/components/TemplateEditor/types';
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
  onSave,
  modalApi,
}: TemplatePanelProps) => {
  const hasEnabledTabs = availableTabs.length > 0;
  const dirty = hasEnabledTabs
    ? isTabDirty(savedSnapshot, templates, activeTab)
    : false;
  const pendingTabRef = useRef<DeliveryTemplateTabId | null>(null);

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

  const renderExpress = () => (
    <div className="flex flex-col gap-4">
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
      title="送达内容模板"
      extra={
        dirty ? (
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            loading={saving}
            onClick={onSave}
          >
            保存配置
          </Button>
        ) : null
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
