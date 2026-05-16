import { PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Empty, Modal, message, Spin, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { listOssByIds } from '@/services/ruoyi/oss';
import {
  deleteLawyerAccount,
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

const { Title, Paragraph } = Typography;

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
  sealName: string;
  initialUsername?: string;
};

const SmartSealConfigPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [loading, setLoading] = useState(false);
  const [sealTypeList, setSealTypeList] = useState<SealTypeVO[]>([]);
  const [sealDataMap, setSealDataMap] = useState<SealMap>(emptySealMap());
  const [switchingId, setSwitchingId] = useState<number | string | null>(null);

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

  const handleAddLawyer = (item: SealVO) => {
    setLawyerModalState({
      open: true,
      mode: 'add',
      sealId: item.id,
      sealName: item.sealName,
    });
  };

  const handleEditLawyer = (item: SealVO) => {
    setLawyerModalState({
      open: true,
      mode: 'edit',
      sealId: item.id,
      sealName: item.sealName,
      initialUsername: item.lawyerUsername ?? '',
    });
  };

  const handleDeleteLawyer = (item: SealVO) => {
    confirmDelete<SealVO>({
      records: [item],
      entityName: '律师账号',
      getName: (rec) => rec.lawyerUsername ?? rec.sealName,
      description: '删除后该印章将无法使用律师签章能力。',
      onConfirm: async () => {
        await deleteLawyerAccount(item.id);
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

  return (
    <PageContainer breadcrumbRender={false} title="智能盖章配置">
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4 pb-4">
        <ProCard>
          <Title level={4} style={{ marginBottom: 4 }}>
            智能盖章配置
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            管理各类电子印章及其与法律文书的自动关联规则
          </Paragraph>
        </ProCard>

        <ProCard>
          <Spin spinning={loading}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {SEAL_COLUMNS.map((col) => {
                const list = sealDataMap[col.code] ?? [];
                const Icon = col.icon;
                return (
                  <div
                    key={col.code}
                    className="flex flex-col rounded-lg border border-gray-100 bg-white"
                    style={{ minHeight: 400 }}
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ background: col.iconBg }}
                        >
                          <Icon
                            style={{ fontSize: 18, color: col.iconColor }}
                          />
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          {col.label}
                        </span>
                        <Tag color={col.tagColor} variant="filled">
                          {list.length}
                        </Tag>
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleAdd(col.code)}
                      >
                        新增
                      </Button>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      {list.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center">
                          <Empty
                            description="暂无印章"
                            styles={{ image: { height: 60 } }}
                          />
                        </div>
                      ) : (
                        list.map((item) => (
                          <SealCard
                            key={item.id}
                            item={item}
                            isLawyerSeal={col.code === 'lawyer_seal'}
                            sealTypeList={sealTypeList}
                            switching={switchingId === item.id}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggleStatus={handleToggleStatus}
                            onAddLawyer={handleAddLawyer}
                            onEditLawyer={handleEditLawyer}
                            onDeleteLawyer={handleDeleteLawyer}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
        sealName={lawyerModalState.sealName}
        initialUsername={lawyerModalState.initialUsername}
        onClose={closeLawyerModal}
        onSaved={handleLawyerSaved}
        messageApi={messageApi}
      />
    </PageContainer>
  );
};

export default SmartSealConfigPage;
