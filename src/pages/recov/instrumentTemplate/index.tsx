import {
  FileTextOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Empty,
  Grid,
  Modal,
  message,
  Space,
  Spin,
  Splitter,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import TemplateEditor from '@/components/TemplateEditor';
import type {
  TemplateEditorFeatures,
  TemplateVariable,
} from '@/components/TemplateEditor/types';
import { renderRecovSingleLineText } from '@/pages/recov/components/RecovFilterControls';
import { RecovListPage } from '@/pages/recov/components/RecovListLayout';
import {
  getInstrumentTypeTemplate,
  getInstrumentTypeTemplateImpact,
  type InstrumentTypeTemplateDetail,
  type InstrumentTypeTemplateListItem,
  listInstrumentTypeTemplates,
  saveInstrumentTypeTemplate,
  validateInstrumentTypeTemplate,
} from '@/services/ruoyi/instrumentTypeTemplate';
import {
  listTemplateVariables,
  normalizeTemplateVariables,
} from '@/services/ruoyi/templateVariable';
import './index.css';

const { Text, Title } = Typography;

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

  const selectedId = stringifyId(selectedRecord?.id);

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
    const html = templateHtml.trim();
    if (!html) {
      messageApi.warning('模板HTML不能为空');
      return;
    }

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
