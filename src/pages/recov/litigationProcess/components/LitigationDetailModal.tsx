import {
  CloseOutlined,
  CopyOutlined,
  FileProtectOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Image,
  Modal,
  message,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { OssItem } from '@/services/ruoyi/oss';
import { listOssByIds } from '@/services/ruoyi/oss';
import {
  type DisplayRow,
  formatDebtNumber,
  formatDisplayMoney,
  formatText,
  getFeeStatusColor,
  getFeeStatusLabel,
  getLitigationStatusColor,
  getLitigationStatusLabel,
  parseFeeResult,
  parseLitigationResult,
} from '../_shared';

const { Text, Title, Paragraph } = Typography;

type LitigationDetailModalProps = {
  open: boolean;
  row: DisplayRow | null;
  onClose: () => void;
};

const LitigationDetailModal = ({
  open,
  row,
  onClose,
}: LitigationDetailModalProps) => {
  const parsedResult = useMemo(
    () => (row ? parseLitigationResult(row.result) : undefined),
    [row],
  );
  const feeResult = useMemo(
    () => (row ? parseFeeResult(row.result) : undefined),
    [row],
  );

  const [ossMap, setOssMap] = useState<Map<string, OssItem>>(new Map());

  useEffect(() => {
    if (!open || !parsedResult?.screenshots?.length) {
      setOssMap(new Map());
      return;
    }

    const ossIds = parsedResult.screenshots
      .map((item) => item.ossId)
      .filter((id): id is string => Boolean(id));

    if (!ossIds.length) {
      setOssMap(new Map());
      return;
    }

    void (async () => {
      try {
        const response = await listOssByIds(
          Array.from(new Set(ossIds)).join(','),
        );
        const items = Array.isArray(response.data) ? response.data : [];
        setOssMap(
          new Map(
            items
              .filter((item) => item.ossId !== undefined && item.ossId !== null)
              .map((item) => [String(item.ossId), item]),
          ),
        );
      } catch {
        setOssMap(new Map());
      }
    })();
  }, [open, parsedResult]);

  const handleCopyFailReason = async () => {
    if (!row?.failReason) return;
    try {
      await navigator.clipboard.writeText(row.failReason);
      message.success('失败原因已复制');
    } catch {
      message.error('复制失败，请手动选择文本复制');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
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
                诉讼详情
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
        <div className="max-h-[72vh] overflow-y-auto bg-[#f8fafc] p-6">
          {row.status === '3' && row.failReason ? (
            <Alert
              type="error"
              showIcon
              className="mb-4"
              message="节点处理失败"
              description={
                <Space direction="vertical" size={8} className="w-full">
                  <Paragraph
                    copyable={{ text: row.failReason }}
                    style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
                  >
                    {row.failReason}
                  </Paragraph>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => void handleCopyFailReason()}
                  >
                    复制错误信息
                  </Button>
                </Space>
              }
            />
          ) : null}

          <Descriptions
            bordered
            size="small"
            column={2}
            title="基本信息"
            className="mb-4 bg-white"
          >
            <Descriptions.Item label="诉讼记录 ID">{row.id}</Descriptions.Item>
            <Descriptions.Item label="资产编号">
              {formatDebtNumber(row.debtNumber)}
            </Descriptions.Item>
            <Descriptions.Item label="所属城市">{row.city}</Descriptions.Item>
            <Descriptions.Item label="所属项目">
              {row.organization}
            </Descriptions.Item>
            <Descriptions.Item label="当事人">
              {row.debtorName}
            </Descriptions.Item>
            <Descriptions.Item label="节点状态">
              <Tag color={getLitigationStatusColor(row.status)}>
                {getLitigationStatusLabel(row.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="债务金额">
              {formatDisplayMoney(row.debtAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="滞纳/违约金额">
              {formatDisplayMoney(row.overdueAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="逾期天数">
              {row.overdueDays} 天
            </Descriptions.Item>
            <Descriptions.Item label="案号">
              {formatText(row.caseNo)}
            </Descriptions.Item>
            <Descriptions.Item label="立案法院" span={2}>
              {formatText(row.courtName)}
            </Descriptions.Item>
          </Descriptions>

          {feeResult ? (
            <Descriptions
              bordered
              size="small"
              column={2}
              title="缴费信息"
              className="mb-4 bg-white"
            >
              <Descriptions.Item label="缴费金额">
                {formatDisplayMoney(feeResult.paymentAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="缴费截止日期">
                {formatText(feeResult.paymentDeadline)}
              </Descriptions.Item>
              <Descriptions.Item label="剩余天数">
                {feeResult.remainingDays} 天
              </Descriptions.Item>
              <Descriptions.Item label="缴费状态">
                <Tag color={getFeeStatusColor(feeResult.paid)}>
                  {getFeeStatusLabel(feeResult.paid)}
                </Tag>
              </Descriptions.Item>
              {feeResult.warningMessage ? (
                <Descriptions.Item label="预警信息" span={2}>
                  {feeResult.warningMessage}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          ) : null}

          {parsedResult?.rawSummary ? (
            <div className="mb-4 rounded-lg border border-[#e2e8f0] bg-white p-4">
              <Text strong>业务摘要</Text>
              <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                {parsedResult.rawSummary}
              </Paragraph>
            </div>
          ) : null}

          {parsedResult?.attributes &&
          Object.keys(parsedResult.attributes).length > 0 ? (
            <Descriptions
              bordered
              size="small"
              column={1}
              title="扩展属性"
              className="mb-4 bg-white"
            >
              {Object.entries(parsedResult.attributes).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : null}

          {parsedResult?.screenshots && parsedResult.screenshots.length > 0 ? (
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
              <Text strong>相关截图</Text>
              <div className="mt-3 flex flex-col gap-3">
                {parsedResult.screenshots.map((shot) => {
                  const ossId = shot.ossId ? String(shot.ossId) : '';
                  const oss = ossId ? ossMap.get(ossId) : undefined;
                  const label =
                    shot.name ||
                    oss?.originalName ||
                    `附件_${ossId || 'unknown'}`;

                  return (
                    <div
                      key={ossId || label}
                      className="flex flex-col gap-2 rounded-lg border border-[#f1f5f9] p-3"
                    >
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                      {oss?.url ? (
                        <Image
                          src={oss.url}
                          alt={label}
                          style={{ maxHeight: 240, objectFit: 'contain' }}
                        />
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ossId: {ossId || '-'}
                        </Text>
                      )}
                      {oss?.url ? (
                        <a href={oss.url} target="_blank" rel="noreferrer">
                          <LinkOutlined /> 打开原图
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {row.result && !parsedResult ? (
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
              <Text strong>节点结果（原始）</Text>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-[#475569]">
                {row.result}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
};

export default LitigationDetailModal;
