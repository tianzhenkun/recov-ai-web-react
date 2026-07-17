import { DownloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { message, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import TableActions from '@/components/TableActions';
import {
  downloadLicenseFile,
  type LicenseIssue,
  type LicenseProductGrant,
  listLicenseIssues,
} from '@/services/ruoyi/license';

type IssueRecordManagementProps = {
  reloadToken: number;
};

type IssueSearchParams = {
  current?: number;
  pageSize?: number;
  deploymentId?: string;
};

const issueTypeMeta: Record<string, { label: string; color: string }> = {
  INITIAL: { label: '首次签发', color: 'blue' },
  RENEWAL: { label: '续期', color: 'green' },
  PRODUCT_CHANGE: { label: '产品调整', color: 'purple' },
  REPLACEMENT: { label: '替换', color: 'gold' },
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const renderProductGrant = (grant: LicenseProductGrant) => {
  const validity = grant.validUntil
    ? `${dayjs(grant.validFrom).format('YYYY-MM-DD HH:mm')} 至 ${dayjs(
        grant.validUntil,
      ).format('YYYY-MM-DD HH:mm')}`
    : `${dayjs(grant.validFrom).format('YYYY-MM-DD HH:mm')} 起永久`;

  return (
    <Tooltip key={grant.productCode} title={validity}>
      <Tag color={grant.validUntil ? 'processing' : 'success'}>
        {grant.productCode} · {grant.validUntil ? '限时' : '永久'}
      </Tag>
    </Tooltip>
  );
};

const IssueRecordManagement = ({ reloadToken }: IssueRecordManagementProps) => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();

  useEffect(() => {
    if (reloadToken > 0) actionRef.current?.reload?.();
  }, [reloadToken]);

  const columns: ProColumns<LicenseIssue>[] = [
    {
      title: 'Deployment ID',
      dataIndex: 'deploymentId',
      width: 300,
      render: (_, record) => (
        <Typography.Text copyable code>
          {record.deploymentId || '-'}
        </Typography.Text>
      ),
    },
    {
      title: 'License ID',
      dataIndex: 'licenseId',
      search: false,
      width: 300,
      render: (_, record) => (
        <Typography.Text copyable code>
          {record.licenseId || '-'}
        </Typography.Text>
      ),
    },
    {
      title: 'Revision',
      dataIndex: 'licenseRevision',
      search: false,
      align: 'center',
      width: 96,
    },
    {
      title: '签发类型',
      dataIndex: 'issueType',
      search: false,
      width: 108,
      render: (_, record) => {
        const meta = issueTypeMeta[record.issueType || ''] || {
          label: record.issueType || '-',
          color: 'default',
        };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '产品授权',
      dataIndex: 'products',
      search: false,
      width: 260,
      render: (_, record) =>
        record.products?.length ? record.products.map(renderProductGrant) : '-',
    },
    {
      title: '签发原因',
      dataIndex: 'issueReason',
      search: false,
      ellipsis: true,
      width: 220,
    },
    {
      title: '签发时间',
      dataIndex: 'issuedAt',
      valueType: 'dateTime',
      search: false,
      width: 176,
    },
    {
      title: '文件摘要',
      dataIndex: 'documentSha256',
      search: false,
      width: 200,
      render: (_, record) => (
        <Typography.Text copyable ellipsis style={{ maxWidth: 180 }}>
          {record.documentSha256 || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 72,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'download',
              label: '下载license.lic',
              icon: <DownloadOutlined />,
              disabled: !record.id,
              permissions: 'system:license:download',
              onClick: async () => {
                if (!record.id) return;
                try {
                  await downloadLicenseFile(String(record.id));
                } catch (error) {
                  messageApi.error(
                    getErrorMessage(error, 'license.lic下载失败'),
                  );
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      {messageContextHolder}
      <ProTable<LicenseIssue, IssueSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.id)}
        columns={columns}
        search={{ labelWidth: 112 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1740 }}
        request={async (params) => {
          const response = await listLicenseIssues({
            pageNum: params.current || 1,
            pageSize: params.pageSize || 10,
            deploymentId: params.deploymentId,
          });
          return {
            data: response.rows || [],
            total: response.total || 0,
            success: true,
          };
        }}
      />
    </>
  );
};

export default IssueRecordManagement;
