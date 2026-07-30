import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Form, message, Select, Space, Tag, Tooltip } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RecovListPage,
  RecovListStack,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import {
  createVoiceEnrollment,
  listVoiceProfiles,
} from '@/services/ruoyi/ai-call-voices';
import type {
  AiCallVoiceProfile,
  VoiceEnrollmentRequest,
  VoiceProfileQuery,
  VoiceStatus,
} from '@/services/ruoyi/ai-call-voices.types';
import { ACTIVE_VOICE_STATUSES, getVoiceStatusMeta } from './domain';
import VoiceEnrollmentModal from './VoiceEnrollmentModal';

type VoiceFilters = {
  voiceType?: string;
  gender?: string;
  status?: VoiceStatus;
};

const matchesFilters = (profile: AiCallVoiceProfile, filters: VoiceFilters) =>
  (!filters.voiceType || profile.voiceType === filters.voiceType) &&
  (!filters.gender || profile.gender === filters.gender) &&
  (!filters.status || profile.status === filters.status);

const statusOptions: Array<{ label: string; value: VoiceStatus }> = [
  { label: '创建中', value: 'CREATING' },
  { label: '可用', value: 'ENABLED' },
  { label: '创建失败', value: 'CREATE_FAILED' },
  { label: '删除中', value: 'DELETING' },
  { label: '删除失败', value: 'DELETE_FAILED' },
  { label: '已删除', value: 'DELETED' },
];

export const createIdempotencyKey = (prefix: string) =>
  globalThis.crypto?.randomUUID?.() ||
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type PendingEnrollment = {
  file: File;
  requestJson: string;
  key: string;
};

const AiCallVoicesPage = () => {
  const actionRef = useRef<ActionType>(null);
  const appliedFiltersRef = useRef<VoiceFilters>({});
  const optimisticProfileRef = useRef<AiCallVoiceProfile | undefined>(
    undefined,
  );
  const pendingEnrollmentRef = useRef<PendingEnrollment | undefined>(undefined);
  const [filterForm] = Form.useForm<VoiceFilters>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [hasActiveRows, setHasActiveRows] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [pollRevision, setPollRevision] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!hasActiveRows || !pageVisible) return;
    const timer = window.setTimeout(() => {
      void actionRef.current?.reload();
    }, 2_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [hasActiveRows, pageVisible, pollRevision]);

  const columns = useMemo<ProColumns<AiCallVoiceProfile>[]>(
    () => [
      {
        title: '音色',
        dataIndex: 'displayName',
        width: 220,
        render: (_value, profile) => (
          <Space orientation="vertical" size={0}>
            <span className="font-medium">{profile.displayName}</span>
            <span className="text-gray-500">{profile.voice || '—'}</span>
          </Space>
        ),
      },
      {
        title: '类型',
        dataIndex: 'voiceType',
        width: 120,
      },
      {
        title: '性别',
        dataIndex: 'gender',
        width: 100,
      },
      {
        title: '适用模型',
        dataIndex: 'targetModel',
        width: 240,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (_value, profile) => {
          const meta = getVoiceStatusMeta(profile.status);
          return (
            <Tooltip title={profile.errorMessage || undefined}>
              <Tag color={meta.color}>{meta.label}</Tag>
            </Tooltip>
          );
        },
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        width: 180,
      },
    ],
    [],
  );

  const applyFilters = (values: VoiceFilters) => {
    appliedFiltersRef.current = values;
    void actionRef.current?.reloadAndRest?.();
  };

  const resetFilters = () => {
    filterForm.resetFields();
    appliedFiltersRef.current = {};
    void actionRef.current?.reloadAndRest?.();
  };

  const getOrCreateEnrollmentKey = (
    request: VoiceEnrollmentRequest,
    file: File,
  ) => {
    const requestJson = JSON.stringify(request);
    let pending = pendingEnrollmentRef.current;
    if (
      !pending ||
      pending.file !== file ||
      pending.requestJson !== requestJson
    ) {
      pending = {
        file,
        requestJson,
        key: createIdempotencyKey('voice-enrollment'),
      };
      pendingEnrollmentRef.current = pending;
    }
    return pending.key;
  };

  const closeCreateModal = () => {
    pendingEnrollmentRef.current = undefined;
    setCreateModalOpen(false);
  };

  const submitEnrollment = async (
    request: VoiceEnrollmentRequest,
    file: File,
  ) => {
    const key = getOrCreateEnrollmentKey(request, file);
    try {
      const accepted = await createVoiceEnrollment({ file, request }, key);
      pendingEnrollmentRef.current = undefined;
      const now = new Date().toISOString();
      optimisticProfileRef.current = {
        id: accepted.voiceProfileId,
        scope: 'TENANT',
        voice: null,
        displayName: accepted.displayName,
        voiceType: '自定义复刻',
        gender: request.gender,
        language: request.language,
        targetModel: 'qwen3.5-omni-plus-realtime',
        status: accepted.status,
        errorMessage: null,
        canPreview: false,
        canDelete: false,
        createdAt: now,
        updatedAt: now,
      };
      setCreateModalOpen(false);
      messageApi.success('音色复刻任务已受理');
      void actionRef.current?.reloadAndRest?.();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : '提交失败，请稍后重试',
      );
    }
  };

  return (
    <RecovListPage breadcrumbRender={false} title="音色管理">
      {messageContextHolder}
      <RecovListStack>
        <h2 className="m-0 text-xl font-semibold">音色管理</h2>

        <RecovTableCard className="recov-toolbar-card">
          <div className="flex w-full flex-wrap items-start justify-between gap-3">
            <Form<VoiceFilters>
              form={filterForm}
              layout="inline"
              onFinish={applyFilters}
            >
              <Form.Item label="类型" name="voiceType">
                <Select
                  allowClear
                  aria-label="类型"
                  className="w-36"
                  options={[
                    { label: '内置', value: '内置' },
                    { label: '自定义复刻', value: '自定义复刻' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="性别" name="gender">
                <Select
                  allowClear
                  aria-label="性别"
                  className="w-32"
                  options={[
                    { label: '未知', value: '未知' },
                    { label: '女声', value: '女声' },
                    { label: '男声', value: '男声' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="状态" name="status">
                <Select
                  allowClear
                  aria-label="状态"
                  className="w-36"
                  options={statusOptions}
                />
              </Form.Item>
              <Form.Item>
                <Space size={8}>
                  <Button
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    type="primary"
                  >
                    查询
                  </Button>
                  <Button onClick={resetFilters}>重置</Button>
                </Space>
              </Form.Item>
            </Form>

            <Space size={8} wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => actionRef.current?.reload()}
              >
                刷新
              </Button>
              <Button
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => {
                  pendingEnrollmentRef.current = undefined;
                  setCreateModalOpen(true);
                }}
              >
                创建自定义音色
              </Button>
            </Space>
          </div>
        </RecovTableCard>

        <RecovTableCard>
          <ProTable<AiCallVoiceProfile>
            actionRef={actionRef}
            className="recov-stable-pagination-table"
            columns={columns}
            options={false}
            pagination={{
              defaultPageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            request={async (params) => {
              const filters = appliedFiltersRef.current;
              const query: VoiceProfileQuery = {
                pageNum: params.current || 1,
                pageSize: params.pageSize || 20,
                includeDeleted: filters.status === 'DELETED',
                ...filters,
              };
              const result = await listVoiceProfiles(query).finally(() => {
                setPollRevision((revision) => revision + 1);
              });
              const optimisticProfile = optimisticProfileRef.current;
              const serverHasOptimistic = Boolean(
                optimisticProfile &&
                  result.rows.some(
                    (profile) => profile.id === optimisticProfile.id,
                  ),
              );
              if (serverHasOptimistic) {
                optimisticProfileRef.current = undefined;
              }
              const includeOptimistic = Boolean(
                optimisticProfile &&
                  !serverHasOptimistic &&
                  matchesFilters(optimisticProfile, filters),
              );
              const rows =
                optimisticProfile && includeOptimistic
                  ? [
                      optimisticProfile,
                      ...result.rows.filter(
                        (profile) => profile.id !== optimisticProfile.id,
                      ),
                    ]
                  : result.rows;
              setHasActiveRows(
                rows.some((profile) =>
                  ACTIVE_VOICE_STATUSES.has(profile.status),
                ),
              );
              return {
                data: rows,
                total:
                  result.total +
                  (optimisticProfile && includeOptimistic ? 1 : 0),
                success: true,
              };
            }}
            rowKey="id"
            scroll={{ x: 1000 }}
            search={false}
          />
        </RecovTableCard>
      </RecovListStack>

      <VoiceEnrollmentModal
        onCancel={closeCreateModal}
        onSubmit={submitEnrollment}
        open={createModalOpen}
      />
    </RecovListPage>
  );
};

export default AiCallVoicesPage;
