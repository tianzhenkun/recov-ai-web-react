import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import { Button, Empty, Modal, message, Spin, Tabs } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { RecovListPage } from '@/pages/recov/components/RecovListLayout';
import { downloadOss, listOssByIds } from '@/services/ruoyi/oss';
import {
  delStanding,
  listStanding,
  retryStandingParse,
  type StandingCode,
  type StandingVO,
  updateStandingStatus,
} from '@/services/ruoyi/standing';
import {
  attachStandingFile,
  pickUsedRangesInSameType,
  STANDING_TYPES,
} from './_shared';
import StandingCard from './StandingCard';
import StandingFormDrawer from './StandingFormDrawer';

type StandingMap = Record<StandingCode, StandingVO[]>;

const emptyStandingMap = (): StandingMap => ({
  PLAINTIFF_LICENSE: [],
  LEGAL_REP_ID_CARD: [],
  LEGAL_REP_CERT: [],
});

const DEFAULT_STANDING_CODE = STANDING_TYPES[0].code;

const isSafeInternalPath = (path?: string | null) =>
  Boolean(path?.startsWith('/') && !path.startsWith('//'));

type DrawerState = {
  open: boolean;
  mode: 'add' | 'edit';
  standingCode?: StandingCode;
  editingId?: number | string;
};

const SmartStandingPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { search: locationSearch } = useLocation();

  const [loading, setLoading] = useState(false);
  const [standingDataMap, setStandingDataMap] = useState<StandingMap>(
    emptyStandingMap(),
  );
  const [switchingId, setSwitchingId] = useState<number | string | null>(null);
  const [retryingId, setRetryingId] = useState<number | string | null>(null);
  const [activeStandingCode, setActiveStandingCode] = useState<StandingCode>(
    DEFAULT_STANDING_CODE,
  );
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    mode: 'add',
  });

  const confirmDelete = useDeleteConfirm({ modal: modalApi, messageApi });

  const { returnTo, showInstrumentReturn } = useMemo(() => {
    const params = new URLSearchParams(locationSearch);
    return {
      returnTo: params.get('returnTo') || '/instrument-list',
      showInstrumentReturn: params.get('returnFrom') === 'instrument-list',
    };
  }, [locationSearch]);

  const loadAllStandings = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        STANDING_TYPES.map((item) =>
          listStanding({
            standingCode: item.code,
            pageNum: 1,
            pageSize: 1000,
          }),
        ),
      );

      const nextMap = emptyStandingMap();
      const ossIdSet = new Set<string>();
      STANDING_TYPES.forEach((item, index) => {
        const rows = (results[index]?.rows ?? []) as StandingVO[];
        nextMap[item.code] = rows;
        rows.forEach((row) => {
          if (row.standingOssId != null && row.standingOssId !== '') {
            ossIdSet.add(String(row.standingOssId));
          }
        });
      });

      if (ossIdSet.size > 0) {
        try {
          const ossRes = await listOssByIds(Array.from(ossIdSet).join(','));
          const ossMap = new Map<string, { url?: string; name?: string }>();
          (ossRes.data ?? []).forEach((oss) => {
            if (oss.ossId != null) {
              ossMap.set(String(oss.ossId), {
                url: oss.url,
                name: oss.originalName || oss.fileName,
              });
            }
          });
          STANDING_TYPES.forEach((item) => {
            nextMap[item.code] = attachStandingFile(nextMap[item.code], ossMap);
          });
        } catch {
          messageApi.error('获取 PDF 文件信息失败');
        }
      }

      setStandingDataMap(nextMap);
    } catch {
      messageApi.error('获取主体资格材料失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void loadAllStandings();
  }, [loadAllStandings]);

  useEffect(() => {
    const params = new URLSearchParams(locationSearch);
    const standingCode = params.get('standingCode') || undefined;
    if (STANDING_TYPES.some((item) => item.code === standingCode)) {
      setActiveStandingCode(standingCode as StandingCode);
    }
  }, [locationSearch]);

  const handleAdd = () => {
    setDrawerState({
      open: true,
      mode: 'add',
      standingCode: activeStandingCode,
    });
  };

  const handleEdit = (record: StandingVO) => {
    setDrawerState({
      open: true,
      mode: 'edit',
      standingCode: record.standingCode as StandingCode,
      editingId: record.id,
    });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const handleDrawerSaved = () => {
    void loadAllStandings();
  };

  const handleDelete = (record: StandingVO) => {
    confirmDelete<StandingVO>({
      records: [record],
      entityName: '主体资格材料',
      getName: (rec) => rec.standingName,
      description: '删除后不可恢复，请谨慎操作。',
      onConfirm: async () => {
        await delStanding([record.id]);
      },
      onSuccess: () => {
        void loadAllStandings();
      },
    });
  };

  const handleToggleStatus = (record: StandingVO, nextStatus: '0' | '1') => {
    const actionText = nextStatus === '1' ? '启用' : '停用';
    modalApi.confirm({
      title: `${actionText}主体资格材料`,
      content:
        nextStatus === '1'
          ? `确定要启用「${record.standingName}」吗？启用后将参与资产编号匹配。`
          : `确定要停用「${record.standingName}」吗？停用后不会参与资产编号匹配。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        setSwitchingId(record.id);
        try {
          await updateStandingStatus(record.id, nextStatus);
          messageApi.success(`${actionText}成功`);
          await loadAllStandings();
        } catch {
          messageApi.error('状态切换失败');
        } finally {
          setSwitchingId(null);
        }
      },
    });
  };

  const handleRetryParse = (record: StandingVO) => {
    modalApi.confirm({
      title: '重新解析主体资格材料',
      content: `确定要重新解析「${record.standingName}」吗？系统会重新提交后台解析任务。`,
      okText: '重新解析',
      cancelText: '取消',
      onOk: async () => {
        setRetryingId(record.id);
        try {
          await retryStandingParse(record.id);
          messageApi.success('已提交解析任务');
          await loadAllStandings();
          window.setTimeout(() => {
            void loadAllStandings();
          }, 2500);
        } catch {
          messageApi.error('提交解析任务失败');
        } finally {
          setRetryingId(null);
        }
      },
    });
  };

  const handlePreview = (record: StandingVO) => {
    if (!record.fileUrl) {
      messageApi.warning('文件地址不存在');
      return;
    }
    window.open(record.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (record: StandingVO) => {
    try {
      await downloadOss(
        record.standingOssId,
        record.fileName || record.standingName,
      );
    } catch (err) {
      messageApi.error((err as Error)?.message || '下载失败');
    }
  };

  const pushInstrumentReturnFallback = () => {
    if (isSafeInternalPath(returnTo)) {
      history.push(returnTo);
      return;
    }
    history.push('/instrument-list');
  };

  const handleReturnToInstrument = () => {
    if (window.history.length > 1) {
      history.back();
      window.setTimeout(() => {
        if (window.location.pathname === '/sys/standing') {
          pushInstrumentReturnFallback();
        }
      }, 600);
      return;
    }
    pushInstrumentReturnFallback();
  };

  const standingTabItems = useMemo(
    () =>
      STANDING_TYPES.map((item) => {
        const Icon = item.icon;
        return {
          key: item.code,
          icon: <Icon />,
          label: `${item.label} ${standingDataMap[item.code]?.length ?? 0}`,
        };
      }),
    [standingDataMap],
  );

  const activeStandingList = standingDataMap[activeStandingCode] ?? [];
  const drawerStandingCode = drawerState.standingCode ?? activeStandingCode;
  const drawerSameTypeRows = standingDataMap[drawerStandingCode] ?? [];
  const instrumentReturnHref = isSafeInternalPath(returnTo)
    ? returnTo
    : '/instrument-list';
  const sameTypeUsedRanges = useMemo(
    () =>
      pickUsedRangesInSameType(
        drawerSameTypeRows,
        drawerStandingCode,
        drawerState.editingId,
      ),
    [drawerSameTypeRows, drawerStandingCode, drawerState.editingId],
  );
  const wildcardUsed = useMemo(
    () =>
      drawerSameTypeRows.some(
        (item) =>
          item.id !== drawerState.editingId &&
          item.status === '1' &&
          item.startNum == null &&
          item.endNum == null,
      ),
    [drawerSameTypeRows, drawerState.editingId],
  );

  return (
    <RecovListPage
      title="原告主体资格材料管理"
      breadcrumbRender={false}
      extra={
        showInstrumentReturn ? (
          <Button
            href={instrumentReturnHref}
            icon={<ArrowLeftOutlined />}
            onClick={(event) => {
              event.preventDefault();
              handleReturnToInstrument();
            }}
          >
            返回文书管理
          </Button>
        ) : undefined
      }
    >
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4 pb-4">
        <ProCard>
          <Spin spinning={loading}>
            <Tabs
              activeKey={activeStandingCode}
              items={standingTabItems}
              tabBarGutter={28}
              tabBarExtraContent={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  新增材料
                </Button>
              }
              className="[&_.ant-tabs-nav]:!mb-4"
              onChange={(key) => setActiveStandingCode(key as StandingCode)}
            />
            {activeStandingList.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Empty
                  description="暂无材料"
                  styles={{ image: { height: 72 } }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {activeStandingList.map((item) => (
                  <StandingCard
                    key={item.id}
                    item={item}
                    switching={switchingId === item.id}
                    retrying={retryingId === item.id}
                    onPreview={handlePreview}
                    onDownload={(record) => void handleDownload(record)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                    onRetryParse={handleRetryParse}
                  />
                ))}
              </div>
            )}
          </Spin>
        </ProCard>
      </div>

      <StandingFormDrawer
        open={drawerState.open}
        mode={drawerState.mode}
        editingId={drawerState.editingId}
        standingCode={drawerStandingCode}
        allUsedRanges={sameTypeUsedRanges}
        wildcardUsed={wildcardUsed}
        onClose={closeDrawer}
        onSaved={handleDrawerSaved}
        messageApi={messageApi}
      />
    </RecovListPage>
  );
};

export default SmartStandingPage;
