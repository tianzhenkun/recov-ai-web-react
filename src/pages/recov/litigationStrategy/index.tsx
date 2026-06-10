import { ProCard } from '@ant-design/pro-components';
import { message, Tabs } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { RecovPage } from '@/pages/recov/components/RecovListLayout';
import {
  type AutoCollectionConfigVo,
  getAutoCollectionConfig,
  getLitigationConfig,
  type LitigationConfigVo,
  type SaveConfigDTO,
  saveTenantConfig,
} from '@/services/ruoyi/litigation';
import {
  listPersonasSimple,
  type PersonaSimple,
} from '@/services/ruoyi/persona';
import {
  type AutoCollectionConfigSnapshot,
  DEFAULT_AUTO_COLLECTION_FORM,
  DEFAULT_LITIGATION_FORM,
  getAutoCollectionSnapshot,
  getLitigationSnapshot,
  type LitigationConfigSnapshot,
  type LitigationTabKey,
  PAGE_TITLE,
  TAB_AUTO_COLLECTION,
  TAB_LAWYER_COURT,
  TAB_LITIGATION,
} from './_shared';
import AutoCollectionPanel from './AutoCollectionPanel';
import LawyerCourtFeePanel from './LawyerCourtFeePanel';
import LitigationConfigPanel from './LitigationConfigPanel';

const LitigationStrategyPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();

  const [activeTab, setActiveTab] = useState<LitigationTabKey>(TAB_LITIGATION);

  const [litigationForm, setLitigationForm] = useState<LitigationConfigVo>(
    DEFAULT_LITIGATION_FORM,
  );
  const [litigationSaved, setLitigationSaved] =
    useState<LitigationConfigSnapshot | null>(null);
  const [loadingLitigation, setLoadingLitigation] = useState(false);
  const [savingLitigation, setSavingLitigation] = useState(false);

  const [autoForm, setAutoForm] = useState<AutoCollectionConfigVo>(
    DEFAULT_AUTO_COLLECTION_FORM,
  );
  const [autoSaved, setAutoSaved] =
    useState<AutoCollectionConfigSnapshot | null>(null);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);

  const [personaOptions, setPersonaOptions] = useState<PersonaSimple[]>([]);

  const fetchLitigation = useCallback(async () => {
    setLoadingLitigation(true);
    try {
      const res = await getLitigationConfig();
      const data = res.data;
      const next: LitigationConfigVo = data
        ? {
            litigationThreshold: Number(data.litigationThreshold ?? 0),
            litigationFrequency: Number(data.litigationFrequency ?? 0),
            litigationRuleJson: data.litigationRuleJson || '',
          }
        : DEFAULT_LITIGATION_FORM;
      setLitigationForm(next);
      setLitigationSaved(getLitigationSnapshot(next));
    } catch {
      setLitigationSaved(
        (prev) => prev ?? getLitigationSnapshot(DEFAULT_LITIGATION_FORM),
      );
      messageApi.error('立案起诉配置加载失败');
    } finally {
      setLoadingLitigation(false);
    }
  }, [messageApi]);

  const fetchAutoCollection = useCallback(async () => {
    setLoadingAuto(true);
    try {
      const res = await getAutoCollectionConfig();
      const data = res.data;
      const next: AutoCollectionConfigVo = data
        ? {
            collectionAmountLimit: Number(data.collectionAmountLimit ?? 0),
            returnPrincipalRate: Number(data.returnPrincipalRate ?? 0),
            recallDays: Number(data.recallDays ?? 0),
          }
        : DEFAULT_AUTO_COLLECTION_FORM;
      setAutoForm(next);
      setAutoSaved(getAutoCollectionSnapshot(next));
    } catch {
      setAutoSaved(
        (prev) =>
          prev ?? getAutoCollectionSnapshot(DEFAULT_AUTO_COLLECTION_FORM),
      );
      messageApi.error('自动撤诉配置加载失败');
    } finally {
      setLoadingAuto(false);
    }
  }, [messageApi]);

  const fetchPersonas = useCallback(async () => {
    try {
      const res = await listPersonasSimple();
      setPersonaOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPersonaOptions([]);
    }
  }, []);

  useEffect(() => {
    void fetchLitigation();
    void fetchAutoCollection();
    void fetchPersonas();
  }, [fetchLitigation, fetchAutoCollection, fetchPersonas]);

  const handleSaveLitigation = useCallback(async () => {
    setSavingLitigation(true);
    try {
      const payload: SaveConfigDTO = {
        litigationThreshold: litigationForm.litigationThreshold,
        litigationFrequency: litigationForm.litigationFrequency,
        litigationRuleJson: litigationForm.litigationRuleJson,
      };
      await saveTenantConfig(payload);
      setLitigationSaved(getLitigationSnapshot(litigationForm));
      messageApi.success('立案起诉配置保存成功');
    } catch {
      messageApi.error('保存失败，请稍后重试');
    } finally {
      setSavingLitigation(false);
    }
  }, [litigationForm, messageApi]);

  const handleSaveAuto = useCallback(async () => {
    setSavingAuto(true);
    try {
      const payload: SaveConfigDTO = {
        collectionAmountLimit: autoForm.collectionAmountLimit,
        returnPrincipalRate: autoForm.returnPrincipalRate,
        recallDays: autoForm.recallDays,
      };
      await saveTenantConfig(payload);
      setAutoSaved(getAutoCollectionSnapshot(autoForm));
      messageApi.success('自动撤诉策略保存成功');
    } catch {
      messageApi.error('保存失败，请稍后重试');
    } finally {
      setSavingAuto(false);
    }
  }, [autoForm, messageApi]);

  return (
    <RecovPage breadcrumbRender={false} title={PAGE_TITLE}>
      {messageContextHolder}

      <ProCard>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as LitigationTabKey)}
          items={[
            {
              key: TAB_LITIGATION,
              label: '立案和起诉',
              children: (
                <LitigationConfigPanel
                  form={litigationForm}
                  onFormChange={setLitigationForm}
                  savedSnapshot={litigationSaved}
                  loading={loadingLitigation}
                  saving={savingLitigation}
                  onSave={handleSaveLitigation}
                  personaOptions={personaOptions}
                  customerGroupOptions={[]}
                  messageApi={messageApi}
                />
              ),
            },
            {
              key: TAB_AUTO_COLLECTION,
              label: '自动撤诉',
              children: (
                <AutoCollectionPanel
                  form={autoForm}
                  onFormChange={setAutoForm}
                  savedSnapshot={autoSaved}
                  loading={loadingAuto}
                  saving={savingAuto}
                  onSave={handleSaveAuto}
                />
              ),
            },
            {
              key: TAB_LAWYER_COURT,
              label: '代开庭策略',
              children: <LawyerCourtFeePanel />,
            },
          ]}
        />
      </ProCard>
    </RecovPage>
  );
};

export default LitigationStrategyPage;
