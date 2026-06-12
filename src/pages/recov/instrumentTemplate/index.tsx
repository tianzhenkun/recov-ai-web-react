import {
  FileTextOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Empty,
  Grid,
  Input,
  Modal,
  message,
  Space,
  Spin,
  Splitter,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import TemplateEditor, {
  type TemplateEditorHandle,
} from '@/components/TemplateEditor';
import type {
  TemplateEditorFeatures,
  TemplateVariable,
} from '@/components/TemplateEditor/types';
import {
  ensureSealPlaceholderHtml,
  htmlToEditorHtml,
  serializeHtmlWithVariableTokens,
} from '@/components/TemplateEditor/utils/templateVariable';
import { renderRecovSingleLineText } from '@/pages/recov/components/RecovFilterControls';
import { RecovListPage } from '@/pages/recov/components/RecovListLayout';
import {
  getInstrumentTypeTemplate,
  getInstrumentTypeTemplateImpact,
  type InstrumentTypeTemplateDetail,
  type InstrumentTypeTemplateListItem,
  listInstrumentTypeTemplates,
  modifyInstrumentTypeTemplate,
  saveInstrumentTypeTemplate,
  validateInstrumentTypeTemplate,
} from '@/services/ruoyi/instrumentTypeTemplate';
import {
  listTemplateVariables,
  normalizeTemplateVariables,
} from '@/services/ruoyi/templateVariable';
import './index.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

const SEAL_PLACEHOLDER_OPTIONS = [
  { label: '公司章', value: 'company_seal' },
  { label: '律师章', value: 'lawyer_seal' },
  { label: '律所章', value: 'law_firm_seal' },
];

const EDITOR_FEATURES: TemplateEditorFeatures = {
  textStyle: true,
  color: true,
  backgroundColor: true,
  align: true,
  list: true,
  image: false,
  table: false,
  variable: true,
  fontFamily: true,
  fontSize: true,
};

const compactText = (value?: string | null) =>
  value === null || value === undefined || value === '' ? '-' : value;

const stringifyId = (value?: number | string | null) =>
  value === undefined || value === null ? '' : String(value);

const escapeHtmlAttribute = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const buildSealPlaceholderHtml = (sealCodes: string[]) =>
  `<p style="text-align:right;margin-top:32px;"><span class="instrument-seal-placeholder" data-seal-placeholder="seal_group" data-seal-codes="${escapeHtmlAttribute(
    sealCodes.join(','),
  )}" data-width-mm="36" data-height-mm="36" style="display:inline-flex;align-items:center;justify-content:center;gap:6mm;width:auto;min-width:36mm;height:36mm;border:1px dashed #cbd5e1;border-radius:4px;vertical-align:middle;"></span></p>`;

const stripSealPlaceholders = (html: string) => {
  const source = html || '';
  if (typeof DOMParser === 'undefined') {
    return source
      .replace(
        /<p\b[^>]*>\s*<span\b[^>]*\bdata-seal-placeholder\b[^>]*><\/span>\s*<\/p>/gi,
        '',
      )
      .replace(/<span\b[^>]*\bdata-seal-placeholder\b[^>]*><\/span>/gi, '');
  }
  const document = new DOMParser().parseFromString(source, 'text/html');
  document.querySelectorAll('[data-seal-placeholder]').forEach((node) => {
    const parent = node.parentElement;
    node.remove();
    if (
      parent?.tagName.toLowerCase() === 'p' &&
      !parent.textContent?.trim() &&
      !parent.querySelector('img,table,span:not(:empty)')
    ) {
      parent.remove();
    }
  });
  return document.body.innerHTML;
};

const normalizeAiModifiedTemplateHtml = (
  html: string,
  variables: TemplateVariable[],
  sourceHtml: string,
) =>
  serializeHtmlWithVariableTokens(
    ensureSealPlaceholderHtml(
      htmlToEditorHtml(html, variables, { enableVariables: true }),
      sourceHtml,
    ),
  ).trim();

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const InstrumentTemplatePage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const screens = Grid.useBreakpoint();
  const isNarrow = !screens.md;

  const [templates, setTemplates] = useState<InstrumentTypeTemplateListItem[]>(
    [],
  );
  const [selectedRecord, setSelectedRecord] =
    useState<InstrumentTypeTemplateListItem | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<InstrumentTypeTemplateDetail | null>(null);
  const [templateHtml, setTemplateHtml] = useState('');
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sealPickerOpen, setSealPickerOpen] = useState(false);
  const [selectedSealCodes, setSelectedSealCodes] = useState<string[]>([
    'company_seal',
  ]);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModifyRequirement, setAiModifyRequirement] = useState('');
  const [aiModifying, setAiModifying] = useState(false);
  const [aiModifiedTemplateHtml, setAiModifiedTemplateHtml] = useState('');

  const selectedId = stringifyId(selectedRecord?.id);
  const mainEditorRef = useRef<TemplateEditorHandle>(null);

  const getCurrentTemplateHtml = () => {
    const editorHtml = mainEditorRef.current?.getValue().trim();
    const editorDomHtml = mainEditorRef.current?.getDomHtml().trim();
    const sealSourceHtml = editorDomHtml || templateHtml;
    if (!editorHtml) return templateHtml.trim();
    return ensureSealPlaceholderHtml(editorHtml, sealSourceHtml).trim();
  };

  const loadVariables = useCallback(async () => {
    try {
      const response = await listTemplateVariables();
      setVariables(normalizeTemplateVariables(response.data));
    } catch (error) {
      messageApi.error(getErrorMessage(error, '获取模板变量失败'));
    }
  }, [messageApi]);

  const loadTemplates = useCallback(async () => {
    setListLoading(true);
    try {
      const response = await listInstrumentTypeTemplates();
      const data = response.data ?? [];
      setTemplates(data);
      setSelectedRecord((current) => {
        if (!data.length) return null;
        const currentId = stringifyId(current?.id);
        return (
          data.find((item) => stringifyId(item.id) === currentId) ?? data[0]
        );
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error, '获取文书模板列表失败'));
    } finally {
      setListLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void loadVariables();
  }, [loadVariables]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      setTemplateHtml('');
      return undefined;
    }

    let active = true;
    setSelectedDetail(null);
    setTemplateHtml('');
    setDetailLoading(true);

    getInstrumentTypeTemplate(selectedId)
      .then((response) => {
        if (!active) return;
        const detail = response.data ?? null;
        setSelectedDetail(detail);
        setTemplateHtml(detail?.templateHtml ?? '');
      })
      .catch((error) => {
        if (!active) return;
        messageApi.error(getErrorMessage(error, '获取文书模板详情失败'));
      })
      .finally(() => {
        if (!active) return;
        setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [messageApi, selectedId]);

  useEffect(() => {
    setAiModalOpen(false);
    setAiModifyRequirement('');
    setAiModifiedTemplateHtml('');
  }, [selectedId]);

  const handleTemplateHtmlChange = (value: string) => {
    setTemplateHtml(value);
  };

  const insertSealPlaceholder = (sealCodes: string[]) => {
    setTemplateHtml((current) => {
      const source = stripSealPlaceholders(current?.trim() ? current : '');
      return `${source || '<p></p>'}${buildSealPlaceholderHtml(sealCodes)}`;
    });
  };

  const saveTemplate = async () => {
    if (!selectedDetail) return;
    const html = getCurrentTemplateHtml();
    if (!html) {
      messageApi.warning('模板HTML不能为空');
      return;
    }
    setTemplateHtml(html);

    setSaving(true);
    try {
      await validateInstrumentTypeTemplate({
        templateHtml: html,
        requireSealPlaceholder: Number(selectedDetail.status) === 1,
      });
      const impactResponse = await getInstrumentTypeTemplateImpact(
        selectedDetail.id,
      );
      const impactCount = Number(
        impactResponse.data?.ungeneratedBuiltinTaskCount ?? 0,
      );
      setSaving(false);

      modalApi.confirm({
        title: '保存文书模板',
        content: `本次修改只影响后续尚未生成正文的内置文书任务，已生成或已盖章文书不会自动变更。当前预计影响 ${impactCount} 个未生成任务。`,
        okText: '确认保存',
        cancelText: '取消',
        onOk: async () => {
          setSaving(true);
          try {
            await saveInstrumentTypeTemplate(selectedDetail.id, {
              templateHtml: html,
            });
            setSelectedDetail((current) =>
              current ? { ...current, templateHtml: html } : current,
            );
            messageApi.success('保存成功');
            await loadTemplates();
          } catch (error) {
            messageApi.error(getErrorMessage(error, '保存文书模板失败'));
          } finally {
            setSaving(false);
          }
        },
      });
    } catch (error) {
      messageApi.error(getErrorMessage(error, '模板检查失败'));
      setSaving(false);
    }
  };

  const openAiModifyModal = () => {
    if (!selectedRecord) return;
    setAiModalOpen(true);
    setAiModifiedTemplateHtml('');
    setAiModifyRequirement((current) =>
      current.trim()
        ? current
        : `请基于当前${selectedRecord.name}模板进行修改，语气正式，结构更清晰，保留全部变量和签章位。`,
    );
  };

  const handleModifyTemplate = async () => {
    if (!selectedRecord || !selectedDetail) return;
    const requirement = aiModifyRequirement.trim();
    const currentTemplateHtml = getCurrentTemplateHtml();
    if (!requirement) {
      messageApi.warning('请输入修改要求');
      return;
    }
    if (!currentTemplateHtml) {
      messageApi.warning('当前模板内容不能为空');
      return;
    }
    setTemplateHtml(currentTemplateHtml);

    setAiModifying(true);
    try {
      const response = await modifyInstrumentTypeTemplate(selectedDetail.id, {
        requirement,
        currentTemplateHtml,
      });
      const modifiedHtml = response.data?.templateHtml?.trim();
      if (!modifiedHtml) {
        messageApi.warning('AI 修改结果为空，请重新修改');
        return;
      }
      const normalizedModifiedHtml = normalizeAiModifiedTemplateHtml(
        modifiedHtml,
        variables,
        currentTemplateHtml,
      );
      if (!normalizedModifiedHtml) {
        messageApi.warning('AI 修改结果为空，请重新修改');
        return;
      }
      setAiModifiedTemplateHtml(normalizedModifiedHtml);
      if (!modifiedHtml.includes('data-seal-placeholder')) {
        messageApi.warning('AI 修改结果未返回签章位，已保留原签章位');
      }
      const warnings = response.data?.warnings?.filter(Boolean) ?? [];
      if (warnings.length) {
        messageApi.warning(warnings.join('；'));
      }
    } catch (error) {
      messageApi.error(getErrorMessage(error, '修改模板失败'));
    } finally {
      setAiModifying(false);
    }
  };

  const handleApplyModifiedTemplate = () => {
    if (!aiModifiedTemplateHtml) return;

    const applyTemplate = () => {
      setTemplateHtml(aiModifiedTemplateHtml);
      setAiModalOpen(false);
      messageApi.info('已应用修改，请确认后保存');
    };

    const savedTemplateHtml = selectedDetail?.templateHtml ?? '';
    const currentTemplateHtml = getCurrentTemplateHtml();
    const hasUnsavedEditorChange =
      currentTemplateHtml !== savedTemplateHtml.trim();

    if (!hasUnsavedEditorChange) {
      applyTemplate();
      return;
    }

    modalApi.confirm({
      title: '应用 AI 修改',
      content: '应用后将替换当前编辑区内容，尚未保存的编辑内容不会保留。',
      okText: '应用修改',
      cancelText: '取消',
      onOk: applyTemplate,
    });
  };

  return (
    <RecovListPage breadcrumbRender={false} title="文书模板维护">
      {messageContextHolder}
      {modalContextHolder}
      <Modal
        title="插入签章位"
        open={sealPickerOpen}
        okText="插入"
        cancelText="取消"
        onCancel={() => setSealPickerOpen(false)}
        onOk={() => {
          if (!selectedSealCodes.length) {
            messageApi.warning('请选择印章');
            return;
          }
          insertSealPlaceholder(selectedSealCodes);
          setSealPickerOpen(false);
        }}
      >
        <Checkbox.Group
          options={SEAL_PLACEHOLDER_OPTIONS}
          value={selectedSealCodes}
          onChange={(values) =>
            setSelectedSealCodes(values.map((value) => String(value)))
          }
        />
      </Modal>
      <Modal
        title="AI 修改模板"
        open={aiModalOpen}
        width={isNarrow ? '96vw' : 1120}
        centered
        destroyOnHidden
        mask={{ closable: false }}
        wrapClassName="instrument-template-ai-modal-wrap"
        onCancel={() => setAiModalOpen(false)}
        footer={
          <Space wrap className="instrument-template-ai-footer">
            <Button onClick={() => setAiModalOpen(false)}>取消</Button>
            <Button
              loading={aiModifying}
              disabled={!selectedDetail}
              onClick={() => void handleModifyTemplate()}
            >
              {aiModifiedTemplateHtml ? '重新修改' : '开始修改'}
            </Button>
            <Button
              type="primary"
              disabled={!aiModifiedTemplateHtml || aiModifying}
              onClick={handleApplyModifiedTemplate}
            >
              应用修改
            </Button>
          </Space>
        }
      >
        <div className="instrument-template-ai-layout">
          <div className="instrument-template-ai-form">
            <div className="instrument-template-ai-field">
              <Text strong>修改要求</Text>
              <TextArea
                value={aiModifyRequirement}
                rows={4}
                maxLength={600}
                showCount
                allowClear
                disabled={aiModifying}
                placeholder="例如：语气更正式，强化还款提醒和法律后果，保留全部变量和签章位"
                onChange={(event) => setAiModifyRequirement(event.target.value)}
              />
            </div>
          </div>

          <div className="instrument-template-ai-preview">
            <div className="instrument-template-ai-preview-header">
              <Text strong>修改草稿</Text>
              <Text type="secondary">
                {aiModifying
                  ? '修改中'
                  : aiModifiedTemplateHtml
                    ? '可编辑'
                    : '暂无草稿'}
              </Text>
            </div>
            {aiModifying ? (
              <div className="instrument-template-ai-preview-loading">
                <Spin description="AI 正在根据修改要求修改模板" />
              </div>
            ) : aiModifiedTemplateHtml ? (
              <TemplateEditor
                className="instrument-template-ai-preview-editor"
                value={aiModifiedTemplateHtml}
                outputType="html"
                variables={variables}
                features={EDITOR_FEATURES}
                height={isNarrow ? 360 : 460}
                onChange={setAiModifiedTemplateHtml}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无修改草稿"
              />
            )}
          </div>
        </div>
      </Modal>
      <div className="instrument-template-workbench">
        <Splitter orientation={isNarrow ? 'vertical' : 'horizontal'}>
          <Splitter.Panel
            defaultSize={isNarrow ? 260 : 340}
            min={isNarrow ? 220 : 280}
            max={isNarrow ? 420 : 460}
          >
            <aside className="instrument-template-sidebar">
              <div className="instrument-template-sidebar-header">
                <Title level={5}>模板列表</Title>
                <Text type="secondary">共 {templates.length} 条</Text>
              </div>
              <Spin spinning={listLoading}>
                {templates.length ? (
                  <div className="instrument-template-list">
                    {templates.map((item) => {
                      const active = stringifyId(item.id) === selectedId;
                      return (
                        <button
                          key={stringifyId(item.id)}
                          type="button"
                          className={`instrument-template-list-item${
                            active
                              ? ' instrument-template-list-item-active'
                              : ''
                          }`}
                          onClick={() => setSelectedRecord(item)}
                        >
                          <span className="instrument-template-list-main">
                            <Text strong ellipsis>
                              {renderRecovSingleLineText(item.name)}
                            </Text>
                          </span>
                          <Text
                            type="secondary"
                            className="instrument-template-list-sub"
                          >
                            {compactText(item.category)}
                          </Text>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无文书模板"
                  />
                )}
              </Spin>
            </aside>
          </Splitter.Panel>

          <Splitter.Panel>
            <section className="instrument-template-editor-panel">
              {selectedRecord ? (
                <>
                  <div className="instrument-template-editor-header">
                    <div className="instrument-template-title-wrap">
                      <Space size={8} wrap>
                        <FileTextOutlined />
                        <Tooltip title={selectedRecord.name}>
                          <Title
                            level={4}
                            className="instrument-template-title"
                          >
                            {selectedRecord.name}
                          </Title>
                        </Tooltip>
                      </Space>
                    </div>
                    <Space
                      size={8}
                      wrap
                      className="instrument-template-actions"
                    >
                      <Button
                        icon={<RobotOutlined />}
                        disabled={detailLoading || !selectedDetail}
                        onClick={openAiModifyModal}
                      >
                        AI 修改
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        disabled={detailLoading || !selectedDetail}
                        onClick={() => void saveTemplate()}
                      >
                        保存
                      </Button>
                    </Space>
                  </div>

                  <Spin spinning={detailLoading}>
                    <div className="instrument-template-editor-body">
                      <div className="instrument-template-editor-toolbar">
                        <Button
                          icon={<SafetyCertificateOutlined />}
                          onClick={() => setSealPickerOpen(true)}
                        >
                          插入签章位
                        </Button>
                      </div>
                      <TemplateEditor
                        ref={mainEditorRef}
                        value={templateHtml}
                        outputType="html"
                        placeholder="请输入文书模板内容..."
                        variables={variables}
                        features={EDITOR_FEATURES}
                        height={isNarrow ? 460 : 640}
                        onChange={handleTemplateHtmlChange}
                      />
                    </div>
                  </Spin>
                </>
              ) : (
                <div className="instrument-template-empty-stage">
                  <Empty description="请选择文书模板" />
                </div>
              )}
            </section>
          </Splitter.Panel>
        </Splitter>
      </div>
    </RecovListPage>
  );
};

export default InstrumentTemplatePage;
