import { PlusOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Button, Empty, Modal, message, Spin, Tabs } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { RecovPage } from '@/pages/recov/components/RecovListLayout';
import { listOssByIds } from '@/services/ruoyi/oss';
import {
  deleteFilingAccount,
  delSeal,
  listSeal,
  listSealType,
  type SealCode,
  type SealTypeVO,
  type SealVO,
  updateSealStatus,
} from '@/services/ruoyi/seal';
import {
  pickUsedRangesInSameType,
  SEAL_COLUMNS,
  type UsedRangeRef,
} from './_shared';
import LawyerAccountModal from './LawyerAccountModal';
import SealCard from './SealCard';
import SealFormDrawer from './SealFormDrawer';

type SealMap = Record<string, SealVO[]>;

const emptySealMap = (): SealMap => ({
  company_seal: [],
  lawyer_seal: [],
  law_firm_seal: [],
});

type DrawerState = {
  open: boolean;
  mode: 'add' | 'edit';
  sealCode: SealCode;
  editingId?: number | string;
};

type LawyerModalState = {
  open: boolean;
  mode: 'add' | 'edit';
  sealId: number | string;
  sealCode?: SealCode;
  sealName: string;
  initialUsername?: string;
  initialIdentity?: string;
};

const SmartSealConfigPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [loading, setLoading] = useState(false);
  const [sealTypeList, setSealTypeList] = useState<SealTypeVO[]>([]);
  const [sealDataMap, setSealDataMap] = useState<SealMap>(emptySealMap());
  const [switchingId, setSwitchingId] = useState<number | string | null>(null);
  const [activeSealCode, setActiveSealCode] =
    useState<SealCode>('company_seal');

  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    mode: 'add',
    sealCode: 'company_seal',
  });
  const [lawyerModalState, setLawyerModalState] = useState<LawyerModalState>({
    open: false,
    mode: 'add',
    sealId: 0,
    sealName: '',
  });

  const loadSealTypes = useCallback(async () => {
    try {
      const res = await listSealType();
      setSealTypeList(res.data ?? []);
    } catch {
      // 错误由 request 适配器统一提示
    }
  }, []);

  const loadAllSeals = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        SEAL_COLUMNS.map((col) =>
          listSeal({ sealCode: col.code, pageNum: 1, pageSize: 1000 }),
        ),
      );

      const nextMap: SealMap = emptySealMap();
      const ossIdSet = new Set<string>();
      SEAL_COLUMNS.forEach((col, index) => {
        const rows = (results[index]?.rows ?? []) as SealVO[];
        nextMap[col.code] = rows;
        rows.forEach((item) => {
          if (item.sealOssId != null && item.sealOssId !== '') {
            ossIdSet.add(String(item.sealOssId));
          }
        });
      });

      if (ossIdSet.size > 0) {
        try {
          const ossRes = await listOssByIds(Array.from(ossIdSet).join(','));
          const ossMap = new Map<string, string | undefined>();
          (ossRes.data ?? []).forEach((oss) => {
            if (oss.ossId != null) {
              ossMap.set(String(oss.ossId), oss.url);
            }
          });
          SEAL_COLUMNS.forEach((col) => {
            nextMap[col.code] = nextMap[col.code].map((item) =>
              item.sealOssId != null
                ? { ...item, sealUrl: ossMap.get(String(item.sealOssId)) }
                : item,
            );
          });
        } catch {
          messageApi.error('获取印章图片失败');
        }
      }

      setSealDataMap(nextMap);
    } catch {
      messageApi.error('获取印章列表失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void loadSealTypes();
    void loadAllSeals();
  }, [loadSealTypes, loadAllSeals]);

  const handleAdd = (sealCode: SealCode) => {
    setDrawerState({ open: true, mode: 'add', sealCode, editingId: undefined });
  };

  const handleEdit = (item: SealVO) => {
    setDrawerState({
      open: true,
      mode: 'edit',
      sealCode: item.sealCode as SealCode,
      editingId: item.id,
    });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const handleDrawerSaved = () => {
    void loadAllSeals();
  };

  const confirmDelete = useDeleteConfirm({ modal: modalApi, messageApi });

  const handleDelete = (item: SealVO) => {
    confirmDelete<SealVO>({
      records: [item],
      entityName: '印章',
      getName: (rec) => rec.sealName,
      description: '删除后不可恢复，请谨慎操作。',
      onConfirm: async () => {
        await delSeal([item.id]);
      },
      onSuccess: () => {
        void loadAllSeals();
      },
    });
  };

  const handleToggleStatus = (item: SealVO, nextStatus: '0' | '1') => {
    const actionText = nextStatus === '1' ? '启用' : '停用';
    modalApi.confirm({
      title: `${actionText}印章`,
      content:
        nextStatus === '1'
          ? `确定要启用印章「${item.sealName}」吗？启用后将自动停用同类型其他启用中的印章。`
          : `确定要停用印章「${item.sealName}」吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        setSwitchingId(item.id);
        try {
          await updateSealStatus(item.id, nextStatus);
          messageApi.success(`${actionText}成功`);
          await loadAllSeals();
        } catch {
          messageApi.error('状态切换失败');
        } finally {
          setSwitchingId(null);
        }
      },
    });
  };

  const handleAddFilingAccount = (item: SealVO) => {
    setLawyerModalState({
      open: true,
      mode: 'add',
      sealId: item.id,
      sealCode: item.sealCode as SealCode,
      sealName: item.sealName,
    });
  };

  const handleEditFilingAccount = (item: SealVO) => {
    setLawyerModalState({
      open: true,
      mode: 'edit',
      sealId: item.id,
      sealCode: item.sealCode as SealCode,
      sealName: item.sealName,
      initialUsername: item.lawyerUsername ?? '',
      initialIdentity: item.accountIdentity ?? '',
    });
  };

  const handleDeleteFilingAccount = (item: SealVO) => {
    confirmDelete<SealVO>({
      records: [item],
      entityName: '立案账号',
      getName: (rec) => rec.lawyerUsername ?? rec.sealName,
      description: '删除后该印章将无法使用立案账号能力。',
      onConfirm: async () => {
        await deleteFilingAccount(item.id);
      },
      onSuccess: () => {
        void loadAllSeals();
      },
    });
  };

  const closeLawyerModal = () => {
    setLawyerModalState((prev) => ({ ...prev, open: false }));
  };

  const handleLawyerSaved = () => {
    void loadAllSeals();
  };

  const sameTypeUsedRanges: UsedRangeRef[] = useMemo(() => {
    if (!drawerState.open) return [];
    return pickUsedRangesInSameType(
      sealDataMap[drawerState.sealCode],
      drawerState.editingId,
    );
  }, [drawerState, sealDataMap]);

  const activeSealList = sealDataMap[activeSealCode] ?? [];

  const sealTabItems = useMemo(
    () =>
      SEAL_COLUMNS.map((col) => {
        const Icon = col.icon;
        return {
          key: col.code,
          icon: <Icon />,
          label: `${col.label} ${sealDataMap[col.code]?.length ?? 0}`,
        };
      }),
    [sealDataMap],
  );

  return (
    <RecovPage breadcrumbRender={false} title="智能盖章配置">
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4 pb-4">
        <ProCard>
          <Spin spinning={loading}>
            <Tabs
              activeKey={activeSealCode}
              items={sealTabItems}
              tabBarGutter={28}
              tabBarExtraContent={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd(activeSealCode)}
                >
                  新增印章
                </Button>
              }
              className="[&_.ant-tabs-nav]:!mb-4"
              onChange={(key) => setActiveSealCode(key as SealCode)}
            />
            {activeSealList.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Empty
                  description="暂无印章"
                  styles={{ image: { height: 72 } }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {activeSealList.map((item) => (
                  <SealCard
                    key={item.id}
                    item={item}
                    supportsFilingAccount={
                      activeSealCode === 'company_seal' ||
                      activeSealCode === 'lawyer_seal'
                    }
                    sealTypeList={sealTypeList}
                    switching={switchingId === item.id}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                    onAddFilingAccount={handleAddFilingAccount}
                    onEditFilingAccount={handleEditFilingAccount}
                    onDeleteFilingAccount={handleDeleteFilingAccount}
                  />
                ))}
              </div>
            )}
          </Spin>
        </ProCard>
      </div>

      <SealFormDrawer
        open={drawerState.open}
        mode={drawerState.mode}
        sealCode={drawerState.sealCode}
        editingId={drawerState.editingId}
        sealTypeList={sealTypeList}
        sameTypeUsedRanges={sameTypeUsedRanges}
        onClose={closeDrawer}
        onSaved={handleDrawerSaved}
        messageApi={messageApi}
      />

      <LawyerAccountModal
        open={lawyerModalState.open}
        mode={lawyerModalState.mode}
        sealId={lawyerModalState.sealId}
        sealCode={lawyerModalState.sealCode}
        sealName={lawyerModalState.sealName}
        initialUsername={lawyerModalState.initialUsername}
        initialIdentity={lawyerModalState.initialIdentity}
        onClose={closeLawyerModal}
        onSaved={handleLawyerSaved}
        messageApi={messageApi}
      />
    </RecovPage>
  );
};

export default SmartSealConfigPage;
