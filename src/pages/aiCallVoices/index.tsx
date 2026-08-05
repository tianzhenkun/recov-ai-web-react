import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Form,
  Modal,
  message,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RuoyiError } from '@/adapters/ruoyi/response';
import {
  RecovListPage,
  RecovListStack,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import {
  createVoiceEnrollment,
  createVoicePreviewSession,
  deleteTenantVoice,
  getVoiceDeletionCheck,
  listVoiceProfiles,
} from '@/services/ruoyi/ai-call-voices';
import type {
  AiCallVoiceProfile,
  VoiceDeletionCheck,
  VoiceEnrollmentRequest,
  VoiceProfileQuery,
  VoiceStatus,
} from '@/services/ruoyi/ai-call-voices.types';
import { ACTIVE_VOICE_STATUSES, getVoiceStatusMeta } from './domain';
import VoiceEnrollmentModal from './VoiceEnrollmentModal';
import {
  connectVoicePreview,
  type VoicePreviewConnection,
} from './VoicePreview';

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

const DELETABLE_VOICE_STATUSES = new Set<VoiceStatus>([
  'ENABLED',
  'CREATE_FAILED',
  'DELETE_FAILED',
]);

const DEFAULT_PAGE_SIZE = 10;

export const createIdempotencyKey = (prefix: string) =>
  globalThis.crypto?.randomUUID?.() ||
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type PendingEnrollment = {
  file: File;
  requestJson: string;
  key: string;
};

type ActivePreview = {
  profileId: string;
  connection: VoicePreviewConnection;
};

type PreviewState = {
  profileId: string;
  status: 'CONNECTING' | 'PLAYING';
};

type DeletionDialog = {
  profile: AiCallVoiceProfile;
  check: VoiceDeletionCheck;
};

type PendingDeletion = {
  profileId: string;
  key: string;
};

const isKnownDeletionFailure = (error: unknown) => {
  if (error instanceof RuoyiError) return true;
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return false;
  }
  const response = error.response;
  if (!response || typeof response !== 'object') return false;
  return 'status' in response && typeof response.status === 'number';
};

const AiCallVoicesPage = () => {
  const actionRef = useRef<ActionType>(null);
  const appliedFiltersRef = useRef<VoiceFilters>({});
  const optimisticProfileRef = useRef<AiCallVoiceProfile | undefined>(
    undefined,
  );
  const pendingEnrollmentRef = useRef<PendingEnrollment | undefined>(undefined);
  const pendingDeletionRef = useRef<PendingDeletion | undefined>(undefined);
  const deletionFlowProfileIdRef = useRef<string | undefined>(undefined);
  const deletionSubmitLockedRef = useRef(false);
  const locallyDeletingProfilesRef = useRef<Map<string, VoiceStatus>>(
    new Map(),
  );
  const activePreviewRef = useRef<ActivePreview | undefined>(undefined);
  const pendingPreviewProfileIdRef = useRef<string | undefined>(undefined);
  const previewQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const [filterForm] = Form.useForm<VoiceFilters>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [hasActiveRows, setHasActiveRows] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [pollRevision, setPollRevision] = useState(0);
  const [deletionDialog, setDeletionDialog] = useState<
    DeletionDialog | undefined
  >(undefined);
  const [deletionCheckLoadingId, setDeletionCheckLoadingId] = useState<
    string | undefined
  >(undefined);
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [locallyDeletingProfileIds, setLocallyDeletingProfileIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const [previewState, setPreviewState] = useState<PreviewState | undefined>(
    undefined,
  );

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

  useEffect(
    () => () => {
      mountedRef.current = false;
      void previewQueueRef.current
        .then(async () => {
          const activePreview = activePreviewRef.current;
          activePreviewRef.current = undefined;
          await activePreview?.connection.disconnect();
        })
        .catch(() => undefined);
    },
    [],
  );

  const handlePreview = (profile: AiCallVoiceProfile) => {
    if (
      profile.status !== 'ENABLED' ||
      !profile.canPreview ||
      !profile.voice ||
      pendingPreviewProfileIdRef.current === profile.id
    ) {
      return;
    }

    const providerVoice = profile.voice;
    pendingPreviewProfileIdRef.current = profile.id;
    setPreviewState({
      profileId: profile.id,
      status: 'CONNECTING',
    });

    const operation = previewQueueRef.current.then(async () => {
      const activePreview = activePreviewRef.current;
      if (activePreview?.profileId === profile.id) {
        activePreviewRef.current = undefined;
        await activePreview.connection.disconnect();
        if (mountedRef.current) {
          setPreviewState(undefined);
        }
        return;
      }

      if (activePreview) {
        activePreviewRef.current = undefined;
        await activePreview.connection.disconnect();
      }

      try {
        const session = await createVoicePreviewSession(providerVoice);
        const connection = await connectVoicePreview(session);
        if (!mountedRef.current) {
          await connection.disconnect();
          return;
        }
        activePreviewRef.current = {
          profileId: profile.id,
          connection,
        };
        setPreviewState({
          profileId: profile.id,
          status: 'PLAYING',
        });
      } catch (error) {
        if (mountedRef.current) {
          setPreviewState(undefined);
          messageApi.error(
            error instanceof Error ? error.message : '试听失败，请稍后重试',
          );
        }
      } finally {
        if (pendingPreviewProfileIdRef.current === profile.id) {
          pendingPreviewProfileIdRef.current = undefined;
        }
      }
    });
    previewQueueRef.current = operation.catch(() => undefined);
  };

  const closeDeletionDialog = () => {
    if (deletionSubmitLockedRef.current) return;
    if (pendingDeletionRef.current?.profileId === deletionDialog?.profile.id) {
      pendingDeletionRef.current = undefined;
    }
    deletionFlowProfileIdRef.current = undefined;
    setDeletionDialog(undefined);
  };

  const requestDeletionCheck = async (profile: AiCallVoiceProfile) => {
    if (
      deletionFlowProfileIdRef.current ||
      profile.scope !== 'TENANT' ||
      !profile.canDelete ||
      !DELETABLE_VOICE_STATUSES.has(profile.status) ||
      locallyDeletingProfilesRef.current.has(profile.id)
    ) {
      return;
    }

    deletionFlowProfileIdRef.current = profile.id;
    setDeletionCheckLoadingId(profile.id);
    try {
      const check = await getVoiceDeletionCheck(profile.id);
      setDeletionDialog({ profile, check });
    } catch (error) {
      deletionFlowProfileIdRef.current = undefined;
      messageApi.error(
        error instanceof Error ? error.message : '删除检查失败，请稍后重试',
      );
    } finally {
      setDeletionCheckLoadingId(undefined);
    }
  };

  const confirmDeletion = async () => {
    if (!deletionDialog?.check.deletable || deletionSubmitLockedRef.current) {
      return;
    }

    const { profile } = deletionDialog;
    deletionSubmitLockedRef.current = true;
    setDeletionSubmitting(true);
    let pendingDeletion = pendingDeletionRef.current;
    if (!pendingDeletion || pendingDeletion.profileId !== profile.id) {
      pendingDeletion = {
        profileId: profile.id,
        key: createIdempotencyKey('voice-deletion'),
      };
      pendingDeletionRef.current = pendingDeletion;
    }

    try {
      await deleteTenantVoice(profile.id, pendingDeletion.key);
      pendingDeletionRef.current = undefined;
      const nextLocallyDeleting = new Map(locallyDeletingProfilesRef.current);
      nextLocallyDeleting.set(profile.id, profile.status);
      locallyDeletingProfilesRef.current = nextLocallyDeleting;
      setLocallyDeletingProfileIds(new Set(nextLocallyDeleting.keys()));
      setHasActiveRows(true);
      setPollRevision((revision) => revision + 1);
      setDeletionDialog(undefined);
      deletionFlowProfileIdRef.current = undefined;
      messageApi.success('音色删除任务已受理');
    } catch (error) {
      if (isKnownDeletionFailure(error)) {
        pendingDeletionRef.current = undefined;
      }
      messageApi.error(
        error instanceof Error ? error.message : '删除失败，请稍后重试',
      );
    } finally {
      deletionSubmitLockedRef.current = false;
      setDeletionSubmitting(false);
    }
  };

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
          const status = locallyDeletingProfileIds.has(profile.id)
            ? 'DELETING'
            : profile.status;
          const meta = getVoiceStatusMeta(status);
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
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 100,
        render: (_value, profile) => {
          const isLocallyDeleting = locallyDeletingProfileIds.has(profile.id);
          const canPreview =
            !isLocallyDeleting &&
            profile.status === 'ENABLED' &&
            profile.canPreview &&
            Boolean(profile.voice);
          const canDelete =
            !isLocallyDeleting &&
            profile.scope === 'TENANT' &&
            profile.canDelete &&
            DELETABLE_VOICE_STATUSES.has(profile.status);
          const isCurrentPreview = previewState?.profileId === profile.id;
          if (!canPreview && !canDelete) return null;
          return (
            <Space size={4}>
              {canPreview ? (
                <Button
                  disabled={
                    isCurrentPreview && previewState.status === 'CONNECTING'
                  }
                  loading={
                    isCurrentPreview && previewState.status === 'CONNECTING'
                  }
                  type="link"
                  onClick={() => handlePreview(profile)}
                >
                  {isCurrentPreview ? '停止试听' : '试听'}
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  danger
                  loading={deletionCheckLoadingId === profile.id}
                  type="link"
                  onClick={() => requestDeletionCheck(profile)}
                >
                  删除
                </Button>
              ) : null}
            </Space>
          );
        },
      },
    ],
    [deletionCheckLoadingId, locallyDeletingProfileIds, previewState],
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
              colon={false}
              form={filterForm}
              layout="inline"
              onFinish={applyFilters}
            >
              <Form.Item label="类型" name="voiceType">
                <Select
                  allowClear
                  aria-label="类型"
                  options={[
                    { label: '内置', value: '内置' },
                    { label: '自定义复刻', value: '自定义复刻' },
                  ]}
                  placeholder="全部类型"
                  style={{ width: 160 }}
                />
              </Form.Item>
              <Form.Item label="性别" name="gender">
                <Select
                  allowClear
                  aria-label="性别"
                  options={[
                    { label: '未知', value: '未知' },
                    { label: '女声', value: '女声' },
                    { label: '男声', value: '男声' },
                  ]}
                  placeholder="全部性别"
                  style={{ width: 160 }}
                />
              </Form.Item>
              <Form.Item label="状态" name="status">
                <Select
                  allowClear
                  aria-label="状态"
                  options={statusOptions}
                  placeholder="全部状态"
                  style={{ width: 160 }}
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
              defaultPageSize: DEFAULT_PAGE_SIZE,
              hideOnSinglePage: false,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            request={async (params) => {
              const filters = appliedFiltersRef.current;
              const query: VoiceProfileQuery = {
                pageNum: params.current || 1,
                pageSize: params.pageSize || DEFAULT_PAGE_SIZE,
                includeDeleted: filters.status === 'DELETED',
                ...filters,
              };
              const result = await listVoiceProfiles(query).finally(() => {
                setPollRevision((revision) => revision + 1);
              });
              const nextLocallyDeleting = new Map(
                locallyDeletingProfilesRef.current,
              );
              for (const [profileId, previousStatus] of nextLocallyDeleting) {
                const serverProfile = result.rows.find(
                  (profile) => profile.id === profileId,
                );
                if (!serverProfile || serverProfile.status !== previousStatus) {
                  nextLocallyDeleting.delete(profileId);
                }
              }
              if (
                nextLocallyDeleting.size !==
                locallyDeletingProfilesRef.current.size
              ) {
                locallyDeletingProfilesRef.current = nextLocallyDeleting;
                setLocallyDeletingProfileIds(
                  new Set(nextLocallyDeleting.keys()),
                );
              }
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
                ) ||
                  rows.some((profile) => nextLocallyDeleting.has(profile.id)),
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

      <Modal
        cancelButtonProps={{ disabled: deletionSubmitting }}
        cancelText="取消"
        closable={!deletionSubmitting}
        confirmLoading={deletionSubmitting}
        destroyOnHidden
        footer={deletionDialog?.check.deletable ? undefined : null}
        mask={{ closable: !deletionSubmitting }}
        okButtonProps={{ danger: true }}
        okText="确认删除"
        open={Boolean(deletionDialog)}
        title={deletionDialog?.check.deletable ? '删除音色' : '无法删除音色'}
        onCancel={closeDeletionDialog}
        onOk={confirmDeletion}
      >
        {deletionDialog?.check.deletable ? (
          <Alert
            description={
              <Space orientation="vertical" size={4}>
                <span>
                  已有 {deletionDialog.check.historicalTaskCount}{' '}
                  个历史任务使用过该音色。
                </span>
                <span>删除后不可用于新任务，此操作不可恢复。</span>
              </Space>
            }
            showIcon
            title={`确认删除音色“${deletionDialog.profile.displayName}”吗？`}
            type="error"
          />
        ) : deletionDialog ? (
          <Alert
            description={
              <Space orientation="vertical" size={4}>
                <span>
                  当前有 {deletionDialog.check.blockingTaskCount}{' '}
                  个任务仍在引用该音色。
                </span>
                <span>
                  阻塞任务 ID：
                  {deletionDialog.check.blockingTaskIds.join('、') || '—'}
                </span>
              </Space>
            }
            showIcon
            title="该音色暂时无法删除"
            type="warning"
          />
        ) : null}
      </Modal>
    </RecovListPage>
  );
};

export default AiCallVoicesPage;
