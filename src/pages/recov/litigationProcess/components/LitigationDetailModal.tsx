import { CloseOutlined, FileProtectOutlined } from '@ant-design/icons';
import { Modal, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { LitigationNodeType } from '@/services/ruoyi/litigation-process';
import {
  type DisplayRow,
  getLitigationDocTemplates,
  type LitigationDocTemplate,
  renderDocContent,
} from '../_shared';

const { Text, Title } = Typography;

type LitigationDetailModalProps = {
  open: boolean;
  row: DisplayRow | null;
  nodeType: LitigationNodeType;
  onClose: () => void;
};

const LitigationDetailModal = ({
  open,
  row,
  nodeType,
  onClose,
}: LitigationDetailModalProps) => {
  const templates = useMemo(
    () => (row ? getLitigationDocTemplates(nodeType) : []),
    [row, nodeType],
  );

  const [activeDocId, setActiveDocId] = useState('complaint');

  useEffect(() => {
    if (open && templates.length > 0) {
      setActiveDocId(templates[0]?.id ?? 'complaint');
    }
  }, [open, templates]);

  const activeTemplate: LitigationDocTemplate | undefined = templates.find(
    (item) => item.id === activeDocId,
  );

  const content =
    row && activeTemplate ? renderDocContent(activeTemplate, row) : '';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnHidden
      closable={false}
      styles={{
        body: { padding: 0 },
        header: { display: 'none' },
      }}
    >
      <div className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2ff] text-[#4f46e5]">
              <FileProtectOutlined style={{ fontSize: 22 }} />
            </span>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                诉讼材料详情
              </Title>
              {row ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  当事人: {row.debtorName} | {row.caseNo ?? row.id}
                </Text>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-0 bg-transparent text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#475569]"
            onClick={onClose}
            aria-label="关闭"
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      {row ? (
        <>
          <div className="flex flex-wrap items-center gap-3.5 border-b border-[#e2e8f0] bg-white px-6 py-3.5">
            <Text
              type="secondary"
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              诉讼材料:
            </Text>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`h-[30px] rounded-lg border-0 px-3.5 text-[13px] font-bold transition-all ${
                    activeDocId === tpl.id
                      ? 'bg-gradient-to-br from-[#4f46e5] to-[#6366f1] text-white shadow-[0_6px_14px_rgba(79,70,229,0.25)]'
                      : 'bg-transparent text-[#0f172a] hover:bg-[#f1f5f9]'
                  }`}
                  onClick={() => setActiveDocId(tpl.id)}
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[72vh] overflow-y-auto bg-[#f8fafc] p-10">
            <div className="relative mx-auto min-h-[800px] max-w-[680px] border border-[#e2e8f0] bg-white px-14 py-16 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
              <h1
                className="mb-10 text-center text-[22px] font-bold tracking-[0.2em] text-[#0f172a]"
                style={{ fontFamily: 'SimSun, Songti SC, serif' }}
              >
                {activeTemplate?.title}
              </h1>
              <pre
                className="whitespace-pre-wrap text-sm leading-8 text-[#334155]"
                style={{ fontFamily: 'SimSun, Songti SC, serif' }}
              >
                {content}
              </pre>
              {activeTemplate ? (
                <div className="pointer-events-none absolute bottom-20 right-[72px] h-[120px] w-[120px]">
                  <div
                    className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full border-[3px] border-[rgba(220,38,38,0.7)] ${
                      activeTemplate.courtIssued ? '' : ''
                    }`}
                    style={{ transform: 'rotate(-12deg)' }}
                  >
                    <span className="max-w-[90px] text-center text-[9px] font-bold leading-snug text-[rgba(220,38,38,0.7)]">
                      {activeTemplate.courtIssued
                        ? (row.courtName ?? '人民法院')
                        : '物业服务有限公司'}
                    </span>
                    <span className="text-base leading-none text-[rgba(220,38,38,0.7)]">
                      ★
                    </span>
                    <span className="text-[9px] font-bold text-[rgba(220,38,38,0.7)]">
                      {activeTemplate.courtIssued ? '立案专用章' : '电子专用章'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  );
};

export default LitigationDetailModal;
