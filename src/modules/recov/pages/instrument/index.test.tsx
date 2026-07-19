import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');
const workspaceSource = readFileSync(
  join(__dirname, 'components/DocumentPreviewWorkspace.tsx'),
  'utf8',
);
const styles = readFileSync(join(__dirname, 'index.css'), 'utf8');
const workspaceStyles = readFileSync(
  join(__dirname, 'components/DocumentPreviewWorkspace.css'),
  'utf8',
);

describe('/instrument-list presentation conventions', () => {
  it('sanitizes and sandboxes every HTML document preview', () => {
    expect(source).toContain('buildInstrumentPreviewDocument(html)');
    expect(source).toContain('sandbox=""');
    expect(workspaceSource).toContain(
      'sanitizeInstrumentPreviewDocument(html)',
    );
    expect(workspaceSource).toContain('sandbox=""');
  });

  it('keeps filters and list tools in the unified recov toolbar', () => {
    expect(source).toContain('className="recov-table-toolbar"');
    expect(source).toContain("justifyContent: 'space-between'");
    expect(source).not.toContain('extra={');
  });

  it('hides the bulk more-actions menu from all document task tabs', () => {
    const toolbarStart = source.indexOf('className="recov-table-toolbar"');
    const toolbarEnd = source.indexOf('</section>', toolbarStart);
    const toolbarSource = source.slice(toolbarStart, toolbarEnd);

    expect(toolbarSource).not.toContain('<Dropdown');
    expect(toolbarSource).not.toContain('open={instrumentToolbarOpen}');
    expect(toolbarSource).not.toContain('trigger={[]}');
    expect(toolbarSource).not.toContain('instrumentToolbarMenuItems');
    expect(toolbarSource).toContain('instrument-list-toolbar-row');
    expect(toolbarSource).not.toContain('更多操作');
    expect(toolbarSource).not.toContain(
      '<Button\n                        icon={<FileDoneOutlined />}',
    );
    expect(toolbarSource).not.toContain(
      '<Button\n                        type="primary"\n                        icon={<PlusOutlined />}',
    );
    expect(toolbarSource).not.toContain(
      '<Button\n                      icon={<SyncOutlined />}',
    );
    expect(toolbarSource).not.toContain(
      '<Button\n                      icon={<RetweetOutlined />}',
    );
  });

  it('uses the stable bordered recov table style for the main list', () => {
    const rowKeyIndex = source.indexOf('rowKey={getGroupRowKey}');
    const tableStart = source.lastIndexOf('<Table', rowKeyIndex);
    const tableEnd = source.indexOf('/>', rowKeyIndex);
    const mainTableSource = source.slice(tableStart, tableEnd);

    expect(mainTableSource).toContain('bordered');
    expect(mainTableSource).toContain(
      'className="recov-stable-pagination-table"',
    );
  });

  it('keeps the main list columns aligned with other debt lists', () => {
    const columnsStart = source.indexOf('const groupColumns: any[] = [');
    const columnsEnd = source.indexOf('];', columnsStart);
    const columnsSource = source.slice(columnsStart, columnsEnd);
    const getColumnSource = (dataIndex: string) => {
      const columnIndex = columnsSource.indexOf(`dataIndex: '${dataIndex}'`);
      const columnStart = columnsSource.lastIndexOf('    {', columnIndex);
      const nextColumnStart = columnsSource.indexOf(
        '\n    {\n      title:',
        columnIndex,
      );
      return columnsSource.slice(
        columnStart,
        nextColumnStart > -1 ? nextColumnStart : columnsSource.length,
      );
    };

    const debtNumberIndex = columnsSource.indexOf("dataIndex: 'debtNumber'");
    const cityIndex = columnsSource.indexOf("dataIndex: 'city'");
    const organizationIndex = columnsSource.indexOf(
      "dataIndex: 'organization'",
    );
    const debtorNameIndex = columnsSource.indexOf("dataIndex: 'debtorName'");
    const groupNameIndex = columnsSource.indexOf(
      "dataIndex: 'displayGroupName'",
    );
    const statusIndex = columnsSource.indexOf("dataIndex: 'status'");
    const debtAmountIndex = columnsSource.indexOf("dataIndex: 'debtAmount'");
    const overdueAmountIndex = columnsSource.indexOf(
      "dataIndex: 'overdueAmount'",
    );

    expect(debtNumberIndex).toBeGreaterThan(-1);
    expect(
      columnsSource.slice(
        debtNumberIndex,
        columnsSource.indexOf('},', debtNumberIndex),
      ),
    ).toContain('width: RECOV_LIST_COLUMN_WIDTH.debtNumber');
    expect(cityIndex).toBeGreaterThan(debtNumberIndex);
    expect(organizationIndex).toBeGreaterThan(cityIndex);
    expect(debtorNameIndex).toBeGreaterThan(organizationIndex);
    expect(groupNameIndex).toBeGreaterThan(debtorNameIndex);
    expect(statusIndex).toBeGreaterThan(groupNameIndex);
    expect(debtAmountIndex).toBeGreaterThan(statusIndex);
    expect(overdueAmountIndex).toBeGreaterThan(debtAmountIndex);
    expect(columnsSource).toContain("'函件类型'");
    expect(getColumnSource('debtAmount')).toContain("title: '逾期金额'");
    expect(getColumnSource('overdueAmount')).toContain(
      "title: '违约（滞纳）金'",
    );
    expect(columnsSource).not.toContain("title: '文书分组'");
    expect(columnsSource).not.toContain("title: '文书进度'");
    expect(getColumnSource('city')).toContain(
      'render: renderRecovSingleLineText',
    );
    expect(getColumnSource('debtorName')).toContain(
      'render: renderRecovSingleLineText',
    );
    expect(getColumnSource('displayGroupName')).toContain(
      'className="instrument-type-cell"',
    );
    expect(getColumnSource('displayGroupName')).toContain(
      'className="instrument-type-cell-text"',
    );
    expect(getColumnSource('displayGroupName')).not.toContain('readyForFiling');
    expect(getColumnSource('displayGroupName')).not.toContain('可立案');
    expect(getColumnSource('status')).toContain(
      'renderInstrumentGroupStatus(record)',
    );
  });

  it('adds a collection letter type filter for collection letters', () => {
    const toolbarStart = source.indexOf('className="recov-table-toolbar"');
    const toolbarEnd = source.indexOf('</section>', toolbarStart);
    const toolbarSource = source.slice(toolbarStart, toolbarEnd);

    expect(source).toContain('LETTER_TYPE_FILTER_OPTIONS');
    expect(source).toContain('displayGroupCode?: string;');
    expect(toolbarSource).toContain("activeCategory === '催收函件'");
    expect(toolbarSource).toContain('name="displayGroupCode"');
    expect(toolbarSource).toContain('placeholder="函件类型"');
    expect(toolbarSource).toContain('options={LETTER_TYPE_FILTER_OPTIONS}');
  });

  it('uses a theme-associated tag color for sealed document status', () => {
    expect(source).toContain("const SEAL_STATUS_TAG_COLOR = 'purple';");
    expect(source).toContain(
      "5: { label: '已盖章', color: SEAL_STATUS_TAG_COLOR }",
    );
    expect(source).toContain(
      "return { label: '部分盖章', color: SEAL_STATUS_TAG_COLOR };",
    );
    expect(source).not.toContain("5: { label: '已盖章', color: 'success' }");
    expect(source).not.toContain(
      "return { label: '部分盖章', color: 'success' };",
    );
  });

  it('avoids antd v6 deprecated props in the page', () => {
    expect(source).not.toContain('optionFilterProp=');
    expect(source).not.toContain('destroyOnClose');
    expect(source).not.toContain('addonAfter=');
    expect(source).not.toContain('message="当前内容未检测到盖章位"');
  });

  it('keeps the document detail preview as a centered paper stage', () => {
    expect(source).toContain('InstrumentDocumentWorkspaceShell');
    expect(workspaceStyles).toContain('.instrument-workspace-shell {');
    expect(workspaceStyles).toContain('.instrument-doc-stage {');
    expect(workspaceStyles).toContain('padding: 24px 32px 36px;');
    expect(workspaceStyles).toContain('display: flex;');
    expect(workspaceStyles).toContain('justify-content: center;');
    expect(workspaceStyles).toContain(
      '.instrument-doc-stage .instrument-preview-frame',
    );
    expect(workspaceStyles).toContain('width: min(880px, 100%);');
    expect(styles).not.toContain('.instrument-doc-stage {');
    expect(styles).not.toContain('.instrument-doc-item {');
    expect(styles).not.toContain('.instrument-doc-main {');
  });

  it('keeps document editing inside the workspace instead of list rows', () => {
    const columnsStart = source.indexOf('const groupColumns: any[] = [');
    const columnsEnd = source.indexOf('];', columnsStart);
    const columnsSource = source.slice(columnsStart, columnsEnd);
    const actionColumnStart = columnsSource.indexOf("title: '操作'");
    const actionColumnSource = columnsSource.slice(actionColumnStart);
    const editorStart = source.indexOf('const openDocumentEditor = async');
    const editorEnd = source.indexOf(
      'const openAddSupplemental =',
      editorStart,
    );
    const editorSource = source.slice(editorStart, editorEnd);
    const actionBarStart = source.indexOf('const workspaceActionBar =');
    const actionBarEnd = source.indexOf('\n  return (', actionBarStart);
    const actionBarSource = source.slice(actionBarStart, actionBarEnd);

    expect(actionColumnSource).not.toContain("key: 'edit'");
    expect(actionColumnSource).not.toContain("label: '编辑文书'");
    expect(actionColumnSource).not.toContain('openGroupEditor(record)');
    expect(editorSource).toContain("setWorkspaceMode('edit')");
    expect(editorSource).toContain("setEditMode('edit')");
    expect(editorSource).toContain('setEditingRecord(record)');
    expect(editorSource).toContain('setEditorValue(getEditableDocumentHtml');
    expect(source).toContain('const canEditSelectedDocument =');
    expect(source).toContain('!selectedDocumentIsCollectionLetter');
    expect(source).toContain("activeCategory === '催收函件'");
    expect(source).toContain('isDeliveryGroup(selectedDocumentGroupCode)');
    expect(actionBarSource).toContain('title="编辑文书"');
    expect(actionBarSource).toContain('{canEditSelectedDocument ? (');
    expect(actionBarSource).toContain('void openDocumentEditor(');
    expect(actionBarSource).toContain('selectedDocumentDetail');
  });

  it('keeps list row actions focused on document and delivery detail', () => {
    const columnsStart = source.indexOf('const groupColumns: any[] = [');
    const columnsEnd = source.indexOf('];', columnsStart);
    const columnsSource = source.slice(columnsStart, columnsEnd);
    const actionColumnStart = columnsSource.indexOf("title: '操作'");
    const actionColumnSource = columnsSource.slice(actionColumnStart);

    expect(actionColumnSource).toContain("label: '查看文书'");
    expect(actionColumnSource).not.toContain("key: 'add'");
    expect(actionColumnSource).not.toContain("label: '新增补充文书'");
    expect(actionColumnSource).not.toContain('openAddSupplemental(record)');
    expect(actionColumnSource).not.toContain("key: 'run'");
    expect(actionColumnSource).not.toContain("label: '生成盖章'");
    expect(actionColumnSource).not.toContain(
      "submitAction('run', 'group', record)",
    );
    expect(actionColumnSource).not.toContain(
      'canShowInstrumentGroupFlowDetail(record)',
    );
    expect(actionColumnSource).not.toContain("'处理异常'");
    expect(actionColumnSource).not.toContain("'查看进度'");
    expect(actionColumnSource).not.toContain('openFlowDetail(record)');
  });

  it('truncates long document header metadata instead of expanding the toolbar', () => {
    expect(source).toContain('workspaceMetaItems');
    expect(source).toContain('className="instrument-workspace-meta-item"');
    expect(source).toContain('className="instrument-workspace-meta-value"');
    expect(workspaceStyles).toContain('.instrument-workspace-meta-item {');
    expect(workspaceStyles).toContain('.instrument-workspace-meta-value {');
    expect(workspaceStyles).toContain('text-overflow: ellipsis;');
  });

  it('warns when a sealed document preview still only shows the seal placeholder', () => {
    expect(source).toContain('selectedDocumentPreviewHasSealPlaceholder');
    expect(source).toContain('selectedDocumentSealPreviewMismatch');
    expect(source).toContain('workspaceFilePreview.fileUrl');
    expect(source).toContain('盖章未显示');
    expect(source).toContain('盖章文件未加载，当前仅展示正文占位预览');
  });

  it('does not reuse selected sealed document status while adding supplemental documents', () => {
    const derivedStart = source.indexOf('const selectedDocumentStatusCode =');
    const derivedEnd = source.indexOf(
      'const workspaceMetaItems =',
      derivedStart,
    );
    const derivedSource = source.slice(derivedStart, derivedEnd);
    const titleStart = source.indexOf(
      'className="instrument-workspace-title-main"',
    );
    const titleEnd = source.indexOf(
      'className="instrument-workspace-meta"',
      titleStart,
    );
    const titleSource = source.slice(titleStart, titleEnd);
    const addStart = source.indexOf('const openAddSupplemental =');
    const addEnd = source.indexOf('const insertSealPlaceholder =', addStart);
    const addSource = source.slice(addStart, addEnd);

    expect(source).toContain('const isAddingSupplementalDocument =');
    expect(derivedSource).toContain('!isAddingSupplementalDocument');
    expect(derivedSource).toContain(
      'const workspaceLastSaved = isAddingSupplementalDocument',
    );
    expect(derivedSource).toContain('? undefined');
    expect(titleSource).toContain(
      '{!isAddingSupplementalDocument && selectedDocument ? (',
    );
    expect(addSource).toContain('setSelectedDocument(null)');
    expect(addSource).toContain('setSelectedDocumentDetail(null)');
    expect(addSource).toContain(
      "setWorkspaceFilePreview({ loading: false, fileUrl: '' })",
    );
  });

  it('uses the sealed PDF file for the workspace preview before falling back to HTML', () => {
    expect(source).toContain('selectedDocumentPdfOssId');
    expect(source).toContain('listOssByIds(selectedDocumentPdfOssId)');
    expect(source).toContain('<InstrumentDocumentPreviewStage');
    expect(source).toContain('pdfUrl={workspaceFilePreview.fileUrl}');
    expect(source).toContain('html={renderPreviewHtml(selectedDocumentHtml)}');
  });

  it('keeps the document preview modal focused on the document body', () => {
    const modalStart = source.indexOf('title="查看文书"');
    const modalEnd = source.indexOf('title="送达详情"', modalStart);
    const modalSource = source.slice(modalStart, modalEnd);

    expect(modalSource).toContain('<PdfPreview');
    expect(modalSource).not.toContain('<Descriptions');
    expect(modalSource).not.toContain('文书名称');
    expect(modalSource).not.toContain('关联债务');
  });

  it('shows matched plaintiff materials with subdued applicability metadata', () => {
    const standingStart = source.indexOf(
      'className="instrument-standing-section"',
    );
    const standingEnd = source.indexOf(
      'className="instrument-doc-list"',
      standingStart,
    );
    const standingSource = source.slice(standingStart, standingEnd);

    expect(source).toContain('formatStandingApplicability');
    expect(standingSource).toContain(
      'className="instrument-standing-title-row"',
    );
    expect(standingSource).toContain('适用资产：');
    expect(standingSource).not.toContain("{item.matched ? '已匹配' : '缺失'}");
    expect(standingSource).not.toContain('<Tag color="blue">全部资产</Tag>');
    expect(styles).toContain('.instrument-standing-applicability');
  });

  it('keeps sealed document preview actions focused on valid next steps', () => {
    const actionBarStart = source.indexOf('const workspaceActionBar =');
    const actionBarEnd = source.indexOf('\n  return (', actionBarStart);
    const actionBarSource = source.slice(actionBarStart, actionBarEnd);

    expect(source).toContain('const canRunSelected =');
    expect(source).toContain('!selectedDocumentIsSealed');
    expect(actionBarSource).toContain('{canRunSelected ? (');
    expect(actionBarSource).toContain('生成盖章');
    expect(actionBarSource).not.toContain('title="送达详情"');
  });

  it('keeps the document workspace header limited to supported information and actions', () => {
    const metaStart = source.indexOf('const workspaceMetaItems =');
    const metaEnd = source.indexOf('const canRunSelected =', metaStart);
    const metaSource = source.slice(metaStart, metaEnd);
    const titleStart = source.indexOf(
      'className="instrument-workspace-title-main"',
    );
    const titleEnd = source.indexOf(
      'className="instrument-workspace-meta"',
      titleStart,
    );
    const titleSource = source.slice(titleStart, titleEnd);
    const actionBarStart = source.indexOf('const workspaceActionBar =');
    const actionBarEnd = source.indexOf('\n  return (', actionBarStart);
    const actionBarSource = source.slice(actionBarStart, actionBarEnd);

    expect(metaSource).not.toContain("label: '逾期金额'");
    expect(titleSource).not.toContain('currentRevisionNo');
    expect(titleSource).not.toContain('<Tag>V');
    expect(actionBarSource).not.toContain('title="修改文书"');
    expect(actionBarSource).not.toContain('title="删除文书"');
  });

  it('hides the technical seal blocker status in the document workspace', () => {
    const headerStart = source.indexOf(
      'className="instrument-workspace-title-wrap"',
    );
    const headerEnd = source.indexOf(
      'className="instrument-workspace-meta"',
      headerStart,
    );
    const headerSource = source.slice(headerStart, headerEnd);
    const navStart = source.indexOf('workspaceDocuments.map((item) => {');
    const navEnd = source.indexOf('{item.errorMessage ? (', navStart);
    const navSource = source.slice(navStart, navEnd);

    expect(source).toContain('shouldShowWorkspaceDocumentStatusTag');
    expect(headerSource).toContain('shouldShowWorkspaceDocumentStatusTag(');
    expect(headerSource).toContain('selectedDocumentStatusCode');
    expect(navSource).toContain('shouldShowWorkspaceDocumentStatusTag(');
    expect(navSource).toContain('item.status');
    expect(source).toContain('item.errorMessage');
  });

  it('keeps edited documents on draft preview until the regenerated seal file is ready', () => {
    const saveStart = source.indexOf('const doSaveDocument = async');
    const saveEnd = source.indexOf(
      'const handleSaveDocument = async',
      saveStart,
    );
    const saveSource = source.slice(saveStart, saveEnd);
    const pdfStart = source.indexOf('const selectedDocumentPdfOssId =');
    const pdfEnd = source.indexOf('useEffect(() => {', pdfStart);
    const pdfSource = source.slice(pdfStart, pdfEnd);

    expect(source).toContain('buildLocalEditedDocumentPreview');
    expect(saveSource).toContain('buildLocalEditedDocumentPreview(');
    expect(saveSource).toContain('setSelectedDocument(nextPreviewDetail)');
    expect(saveSource).toContain(
      'setSelectedDocumentDetail(nextPreviewDetail)',
    );
    expect(saveSource).toContain(
      "setWorkspaceFilePreview({ loading: false, fileUrl: '' })",
    );
    expect(pdfSource).toContain('selectedDocumentHasPendingRevision');
    expect(pdfSource).toContain('!selectedDocumentHasPendingRevision');
  });

  it('requires concrete seal selection for supplemental documents', () => {
    expect(source).toContain('sealIds?: string[];');
    expect(source).toContain('fetchSealOptions');
    expect(source).toContain('mode="multiple"');
    expect(source).toContain('name="sealIds"');
    expect(source).toContain('请选择签章印章');
    expect(source).toContain('handleSealSelectionChange');
  });

  it('hides the linked debt selector when the editor debt is locked', () => {
    const editorFormStart = source.indexOf(
      'className="instrument-editor-form"',
    );
    const editorFormEnd = source.indexOf('<Tabs', editorFormStart);
    const editorFormSource = source.slice(editorFormStart, editorFormEnd);

    expect(editorFormSource).toContain('editorDebtLocked ? (');
    expect(editorFormSource).toContain('name="debtorName" hidden');
    expect(editorFormSource).toContain('!editorDebtLocked ? (');
    expect(editorFormSource).toContain('label="关联债务"');
  });

  it('builds supplemental seal placeholder group with seal codes', () => {
    const defaultTemplateStart = source.indexOf(
      'const buildDefaultSupplementalHtml',
    );
    const defaultTemplateEnd = source.indexOf(
      'const previewViewerStyle',
      defaultTemplateStart,
    );
    const defaultTemplateSource = source.slice(
      defaultTemplateStart,
      defaultTemplateEnd,
    );

    expect(defaultTemplateSource).toContain(
      'buildSealPlaceholderParagraphHtml',
    );
    expect(source).toContain('data-seal-placeholder="seal_group"');
    expect(source).toContain('data-seal-codes');
    expect(source).not.toContain('data-seal-id');
    expect(source).not.toContain('data-seal-name');
    expect(source).toContain('selectedSealIds');
    expect(source).toContain('resolveSelectedSeals');
    expect(defaultTemplateSource).not.toContain('{{debtorName}}');
    expect(defaultTemplateSource).not.toContain('{{debtNumber}}');
    expect(defaultTemplateSource).not.toContain('<h2');
  });

  it('updates one backend seal placeholder instead of appending duplicate blocks', () => {
    const sealHelperStart = source.indexOf('const ensureSealPlaceholderBlock');
    const sealHelperEnd = source.indexOf(
      'const buildDefaultSupplementalHtml',
      sealHelperStart,
    );
    const sealHelperSource = source.slice(sealHelperStart, sealHelperEnd);

    expect(source).toContain('SEAL_PLACEHOLDER_ELEMENT_REGEXP');
    expect(source).toContain('EMPTY_SEAL_PLACEHOLDER_BLOCK_REGEXP');
    expect(source).toContain('stripAdditionalSealPlaceholders');
    expect(
      sealHelperSource.indexOf('SEAL_PLACEHOLDER_ELEMENT_REGEXP.test(html)'),
    ).toBeLessThan(
      sealHelperSource.indexOf('SEAL_PLACEHOLDER_BLOCK_REGEXP.test(html)'),
    );
    expect(sealHelperSource).toContain(
      'SEAL_PLACEHOLDER_ELEMENT_REGEXP.test(html)',
    );
    expect(sealHelperSource).toContain(
      'replace(SEAL_PLACEHOLDER_ELEMENT_REGEXP, nextPlaceholderHtml)',
    );
  });

  it('persists concrete seal ids in supplemental template json', () => {
    const saveStart = source.indexOf('const doSaveDocument = async');
    const saveEnd = source.indexOf('const buildRunParams = (', saveStart);
    const saveSource = source.slice(saveStart, saveEnd);

    expect(source).toContain(
      'const buildTemplateJson = (instrumentName: string, sealIds: string[])',
    );
    expect(saveSource).toContain(
      'const selectedSealIds = values.sealIds ?? []',
    );
    expect(saveSource).toContain('buildTemplateJson(');
    expect(saveSource).toContain('selectedSealIds');
    expect(saveSource).toContain(
      'ensureSealPlaceholderBlock(editorValue, selectedSeals)',
    );
  });

  it('opens delivery detail directly from letter rows instead of navigating to delivery management', () => {
    expect(source).toContain('getDeliveryTaskByBusiness');
    expect(source).toContain('setDeliveryDetailOpen(true)');
    expect(source).toContain("label: '送达详情'");
    expect(source).toContain('openDeliveryDetail(');
    expect(source).toContain('record.displayGroupCode');
    expect(source).toContain('record.primaryTaskId');
    expect(source).not.toContain('history.push(`/delivery?');
  });

  it('keeps delivery detail focused on recipient contact and status', () => {
    const drawerStart = source.indexOf('title="送达详情"');
    const drawerEnd = source.indexOf('</Drawer>', drawerStart);
    const drawerSource = source.slice(drawerStart, drawerEnd);
    const columnsStart = source.indexOf('const groupColumns: any[] = [');
    const columnsEnd = source.indexOf('];', columnsStart);
    const columnsSource = source.slice(columnsStart, columnsEnd);

    expect(drawerSource).toContain('label="电话"');
    expect(drawerSource).toContain('deliveryDetail.debtorPhone');
    expect(drawerSource).toContain('label="邮件"');
    expect(drawerSource).toContain('deliveryDetail.debtorEmail');
    expect(drawerSource).not.toContain('label="送达文件"');
    expect(drawerSource).not.toContain('label="发送主题"');
    expect(drawerSource).not.toContain('label="发送内容"');
    expect(columnsSource).not.toContain('debtorPhone');
    expect(columnsSource).not.toContain("title: '电话'");
    expect(columnsSource).not.toContain("title: '手机号'");
  });

  it('passes a return marker when jumping to plaintiff standing maintenance', () => {
    const standingStart = source.indexOf('const openStandingManage =');
    const standingEnd = source.indexOf('const openPreview =', standingStart);
    const standingSource = source.slice(standingStart, standingEnd);

    expect(standingSource).toContain(
      "params.set('returnFrom', 'instrument-list')",
    );
    expect(standingSource).toContain(
      "params.set('returnTo', '/instrument-list')",
    );
    expect(standingSource).toContain('history.push(`/sys/standing?');
  });

  it('shows delivery exception details only for failed delivery tasks', () => {
    const exceptionStart = source.indexOf('{shouldShowDeliveryException ? (');
    const exceptionEnd = source.indexOf('</Alert>', exceptionStart);
    const exceptionSource = source.slice(exceptionStart, exceptionEnd);

    expect(source).toContain('const shouldShowDeliveryException =');
    expect(source).toContain('Number(deliveryDetail?.taskStatus) === 3');
    expect(source).toContain('Boolean(deliveryDetail?.errorMessage)');
    expect(source).toContain('{shouldShowDeliveryException ? (');
    expect(exceptionSource).not.toContain('providerResponse');
  });
});
