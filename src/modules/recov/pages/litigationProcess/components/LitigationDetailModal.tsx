import {
  CopyOutlined,
  FileProtectOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Image,
  message,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { normalizeSafeResourceUrl } from '@/shared/security/url';
import type { OssItem } from '@/shared/services/oss';
import { listOssByIds } from '@/shared/services/oss';
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

const { Text, Paragraph } = Typography;

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
  const screenshots = useMemo(
    () => parsedResult?.screenshots?.filter((item) => item.ossId) ?? [],
    [parsedResult],
  );
  const errorMessage = useMemo(() => {
    if (!row) return '';
    return (
      row.failReason ||
      parsedResult?.rejectReason ||
      (row.status === '3' ? parsedResult?.rawSummary || '' : '')
    );
  }, [parsedResult, row]);

  const [ossMap, setOssMap] = useState<Map<string, OssItem>>(new Map());

  useEffect(() => {
    if (!open || !screenshots.length) {
      setOssMap(new Map());
      return;
    }

    const ossIds = screenshots
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
  }, [open, screenshots]);

  const handleCopyErrorMessage = async () => {
    if (!errorMessage) return;
    try {
      await navigator.clipboard.writeText(errorMessage);
      message.success('错误信息已复制');
    } catch {
      message.error('复制失败，请手动选择文本复制');
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={760}
      destroyOnHidden
      title={
        <Space size={12} align="center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
            <FileProtectOutlined style={{ fontSize: 20 }} />
          </span>
          <span className="flex flex-col">
            <Text strong>诉讼详情</Text>
            {row ? (
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                业主名称：{formatText(row.debtorName, '')} · 资产编号：
                {formatDebtNumber(row.debtNumber)}
              </Text>
            ) : null}
          </span>
        </Space>
      }
      styles={{
        body: { padding: 0, background: '#f8fafc' },
      }}
    >
      {row ? (
        <div className="p-6">
          {errorMessage ? (
            <Alert
              type={row.status === '3' ? 'error' : 'warning'}
              showIcon
              className="mb-4"
              title="错误信息"
              description={
                <Space orientation="vertical" size={8} className="w-full">
                  <Paragraph
                    copyable={{ text: errorMessage }}
                    style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
                  >
                    {errorMessage}
                  </Paragraph>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => void handleCopyErrorMessage()}
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
            <Descriptions.Item label="资产编号">
              {formatDebtNumber(row.debtNumber)}
            </Descriptions.Item>
            <Descriptions.Item label="业主名称">
              {formatText(row.debtorName, '')}
            </Descriptions.Item>
            <Descriptions.Item label="所属城市">
              {formatText(row.city, '')}
            </Descriptions.Item>
            <Descriptions.Item label="所属项目">
              {formatText(row.organization, '')}
            </Descriptions.Item>
            <Descriptions.Item label="节点状态">
              <Tag color={getLitigationStatusColor(row.status)}>
                {getLitigationStatusLabel(row.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="逾期金额">
              {formatDisplayMoney(row.debtAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="违约（滞纳）金">
              {formatDisplayMoney(row.overdueAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="逾期天数">
              {row.overdueDays} 天
            </Descriptions.Item>
            <Descriptions.Item label="案号">
              {formatText(row.caseNo, '')}
            </Descriptions.Item>
            <Descriptions.Item label="立案法院">
              {formatText(row.courtName, '')}
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
                {formatText(feeResult.paymentDeadline, '')}
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

          {screenshots.length > 0 ? (
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
              <Text strong>相关材料</Text>
              <div className="mt-3 flex flex-col gap-3">
                {screenshots.map((shot) => {
                  const ossId = String(shot.ossId);
                  const oss = ossMap.get(ossId);
                  const label = shot.name || oss?.originalName || '附件';
                  const safeOssUrl = normalizeSafeResourceUrl(oss?.url);

                  return (
                    <div
                      key={ossId}
                      className="flex flex-col gap-2 rounded-lg border border-[#f1f5f9] p-3"
                    >
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                      {safeOssUrl ? (
                        <>
                          <Image
                            src={safeOssUrl}
                            alt={label}
                            style={{ maxHeight: 240, objectFit: 'contain' }}
                          />
                          <a
                            href={safeOssUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <LinkOutlined /> 打开原图
                          </a>
                        </>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          附件暂不可预览
                        </Text>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
};

export default LitigationDetailModal;
