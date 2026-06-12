import { DownloadOutlined, FileSearchOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Modal, Space, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  InstrumentDocumentNavItem,
  InstrumentDocumentPreviewStage,
  InstrumentDocumentWorkspaceShell,
} from '@/pages/recov/instrument/components/DocumentPreviewWorkspace';
import type {
  LitigationFilingMaterialDocumentVO,
  LitigationFilingMaterialMissingItemVO,
} from '@/services/ruoyi/litigation-process';
import type { DisplayRow } from '../_shared';
import { formatDebtNumber, formatText } from '../_shared';
import {
  fetchLitigationFilingMaterials,
  type LitigationFilingMaterialsVO,
} from '../service';

const { Text } = Typography;

type LitigationFilingMaterialsDrawerProps = {
  open: boolean;
  row: DisplayRow | null;
  onClose: () => void;
};

type MaterialNavItem =
  | {
      key: string;
      type: 'document';
      document: LitigationFilingMaterialDocumentVO;
    }
  | {
      key: string;
      type: 'missing';
      missing: LitigationFilingMaterialMissingItemVO;
    };

const buildDocumentKey = (
  document: LitigationFilingMaterialDocumentVO,
  index: number,
) =>
  `document-${document.taskId || document.revisionId || document.instrumentCode || index}`;

const buildMissingKey = (
  item: LitigationFilingMaterialMissingItemVO,
  index: number,
) => `missing-${item.instrumentCode || index}`;

const getMaterialType = (item: MaterialNavItem) =>
  (item.type === 'document'
    ? item.document.materialType
    : item.missing.materialType) || '-';

const getMaterialSubtitle = (item: MaterialNavItem, index: number) => {
  const source = item.type === 'document' ? item.document : item.missing;
  const materialType = source.materialType || '';
  const instrumentName = source.instrumentName || '';

  if (instrumentName && instrumentName !== materialType) return instrumentName;
  if (source.instrumentCode) return source.instrumentCode;
  return `材料 ${index + 1}`;
};

const LitigationFilingMaterialsDrawer = ({
  open,
  row,
  onClose,
}: LitigationFilingMaterialsDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] =
    useState<LitigationFilingMaterialsVO | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    if (!open || !row?.id) {
      setMaterials(null);
      setLoadError('');
      setLoading(false);
      setSelectedKey('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setSelectedKey('');

    void (async () => {
      try {
        const result = await fetchLitigationFilingMaterials(row.id);
        if (cancelled) return;
        setMaterials(result);
      } catch {
        if (cancelled) return;
        setMaterials(null);
        setLoadError('立案材料加载失败');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, row?.id]);

  const navItems = useMemo<MaterialNavItem[]>(() => {
    if (!materials) return [];
    return [
      ...materials.documents.map((document, index) => ({
        key: buildDocumentKey(document, index),
        type: 'document' as const,
        document,
      })),
      ...materials.missingItems.map((missing, index) => ({
        key: buildMissingKey(missing, index),
        type: 'missing' as const,
        missing,
      })),
    ];
  }, [materials]);

  const materialTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    navItems.forEach((item) => {
      const materialType = getMaterialType(item);
      counts.set(materialType, (counts.get(materialType) ?? 0) + 1);
    });

    return counts;
  }, [navItems]);

  useEffect(() => {
    if (!open) return;
    if (!navItems.length) {
      setSelectedKey('');
      return;
    }
    if (!navItems.some((item) => item.key === selectedKey)) {
      setSelectedKey(navItems[0].key);
    }
  }, [navItems, open, selectedKey]);

  const selectedItem =
    navItems.find((item) => item.key === selectedKey) ?? navItems[0];
  const selectedDocument =
    selectedItem?.type === 'document' ? selectedItem.document : undefined;
  const selectedMissing =
    selectedItem?.type === 'missing' ? selectedItem.missing : undefined;

  const workspaceMetaItems = [
    {
      label: '业主名称',
      value: formatText(materials?.debtorName || row?.debtorName),
    },
    {
      label: '资产编号',
      value: formatDebtNumber(materials?.debtNumber ?? row?.debtNumber),
    },
    {
      label: '所属城市',
      value: formatText(materials?.city || row?.city),
    },
    {
      label: '所属项目',
      value: formatText(materials?.organization || row?.organization),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="min(1280px, calc(100vw - 48px))"
      centered
      destroyOnHidden
      footer={null}
      loading={loading}
      title={null}
      styles={{
        body: { padding: 0, background: '#fff' },
      }}
    >
      <div className="instrument-workspace litigation-filing-workspace">
        <div className="instrument-workspace-header litigation-filing-workspace-header">
          <div className="instrument-workspace-title-wrap">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
              <FileSearchOutlined style={{ fontSize: 20 }} />
            </span>
            <div className="instrument-workspace-title-main">
              <Text strong className="instrument-workspace-title">
                立案材料
              </Text>
              <div className="instrument-workspace-meta">
                {workspaceMetaItems.map((item) => (
                  <span
                    key={item.label}
                    className="instrument-workspace-meta-item"
                  >
                    <span className="instrument-workspace-meta-label">
                      {item.label}：
                    </span>
                    <span className="instrument-workspace-meta-value">
                      {item.value}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loadError ? (
          <Alert type="error" showIcon className="m-4" title={loadError} />
        ) : null}

        {materials ? (
          <InstrumentDocumentWorkspaceShell
            className="litigation-filing-workspace-shell"
            sidebarDefaultSize={288}
            sidebarMin={240}
            sidebarMax={380}
            sidebar={
              <div
                data-testid="filing-material-type-list"
                className="instrument-doc-nav"
              >
                {navItems.length > 0 ? (
                  navItems.map((item, index) => {
                    const active = item.key === selectedKey;
                    const materialType = getMaterialType(item);
                    const isDuplicatedType =
                      (materialTypeCounts.get(materialType) ?? 0) > 1;
                    return (
                      <InstrumentDocumentNavItem
                        key={item.key}
                        active={active}
                        title={materialType}
                        subtitle={
                          isDuplicatedType
                            ? getMaterialSubtitle(item, index)
                            : undefined
                        }
                        onClick={() => setSelectedKey(item.key)}
                      />
                    );
                  })
                ) : (
                  <Empty description="暂无立案材料" />
                )}
              </div>
            }
            mainClassName="litigation-filing-preview-pane"
          >
            <div
              data-testid="filing-material-preview-pane"
              className="flex min-h-0 flex-1 flex-col"
            >
              {selectedDocument ? (
                <>
                  <div
                    className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e2e8f0] p-4"
                    data-testid="filing-material-preview-heading"
                  >
                    <div className="min-w-0">
                      <Text strong>{selectedDocument.materialType}</Text>
                    </div>

                    <Space size={4} wrap={false}>
                      <Button
                        href={selectedDocument.publicUrl}
                        target="_blank"
                        disabled={
                          !selectedDocument.publicUrl ||
                          !selectedDocument.downloadable
                        }
                        icon={<DownloadOutlined />}
                        size="small"
                        type="link"
                      >
                        下载
                      </Button>
                    </Space>
                  </div>

                  <InstrumentDocumentPreviewStage
                    emptyDescription="暂无可预览文件"
                    fileName={selectedDocument.instrumentName}
                    pdfHeight="auto"
                    pdfOssId={selectedDocument.ossId || undefined}
                    pdfUrl={
                      selectedDocument.publicUrl &&
                      (selectedDocument.viewable ||
                        selectedDocument.downloadable)
                        ? selectedDocument.publicUrl
                        : undefined
                    }
                  />
                </>
              ) : selectedMissing ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8">
                  <Alert
                    type="error"
                    showIcon
                    title="缺失材料"
                    description={selectedMissing.reason || '缺少必需立案材料'}
                  />
                  <Empty
                    description={`${selectedMissing.materialType || selectedMissing.instrumentName} 暂无可预览文件`}
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                  <Empty description="暂无可预览材料" />
                </div>
              )}
            </div>
          </InstrumentDocumentWorkspaceShell>
        ) : null}
      </div>
    </Modal>
  );
};

export default LitigationFilingMaterialsDrawer;
