import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Tag,
  Typography,
} from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { HookAPI as ModalHookAPI } from 'antd/es/modal/useModal';
import { useEffect, useMemo, useState } from 'react';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import {
  type AddEmployeeDTO,
  addEmployee,
  deleteEmployees,
  type EmployeeNameItem,
  type UpdateVoiceConfigDTO,
  updateVoiceConfig,
  type VoiceConfigVo,
  type VoiceLibraryItem,
} from '@/services/ruoyi/voice';
import {
  getEmployeeNameMaxLength,
  getEmployeeNamePrefix,
  getIdentityMeta,
  type IdentityConfigSnapshot,
  isIdentityConfigSnapshotEqual,
  validateEmployeeName,
} from './_shared';

const { Text } = Typography;

type AddEmployeeForm = {
  name: string;
  voiceId?: string;
};

export type IdentityConfigCardProps = {
  config: VoiceConfigVo;
  voiceOptions: VoiceLibraryItem[];
  messageApi: MessageInstance;
  modalApi: ModalHookAPI;
  onRefresh: () => void;
};

const snapshotFromConfig = (config: VoiceConfigVo): IdentityConfigSnapshot => ({
  genderMatch: config.genderMatch,
  maleVoiceId: config.maleVoiceId ?? null,
  femaleVoiceId: config.femaleVoiceId ?? null,
});

const IdentityConfigCard = ({
  config,
  voiceOptions,
  messageApi,
  modalApi,
  onRefresh,
}: IdentityConfigCardProps) => {
  const [localConfig, setLocalConfig] = useState<IdentityConfigSnapshot>(() =>
    snapshotFromConfig(config),
  );
  const [originalConfig, setOriginalConfig] = useState<IdentityConfigSnapshot>(
    () => snapshotFromConfig(config),
  );

  useEffect(() => {
    const next = snapshotFromConfig(config);
    setLocalConfig(next);
    setOriginalConfig(next);
  }, [config]);

  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm] = Form.useForm<AddEmployeeForm>();

  const confirmDelete = useDeleteConfirm({ modal: modalApi, messageApi });

  const meta = getIdentityMeta(config.identityName);
  const Icon = meta.icon;
  const employeeNamePrefix = getEmployeeNamePrefix(config.identityName);
  const employeeNameMaxLength = getEmployeeNameMaxLength(employeeNamePrefix);
  const employees = config.employeeNames ?? [];

  const genderMatchEnabled = localConfig.genderMatch === '1';

  const maleVoiceOptions = useMemo(
    () =>
      voiceOptions
        .filter((v) => v.gender === '0' || v.gender === 'CUSTOM')
        .map((v) => ({ label: v.voiceName, value: v.id })),
    [voiceOptions],
  );

  const femaleVoiceOptions = useMemo(
    () =>
      voiceOptions
        .filter((v) => v.gender === '1' || v.gender === 'CUSTOM')
        .map((v) => ({ label: v.voiceName, value: v.id })),
    [voiceOptions],
  );

  const allVoiceOptions = useMemo(
    () => voiceOptions.map((v) => ({ label: v.voiceName, value: v.id })),
    [voiceOptions],
  );

  const hasChanges = useMemo(
    () => !isIdentityConfigSnapshotEqual(localConfig, originalConfig),
    [localConfig, originalConfig],
  );

  const handleGenderMatchChange = (checked: boolean) => {
    setLocalConfig((prev) => {
      const nextGenderMatch = checked ? '1' : '0';
      if (!checked) {
        return { ...prev, genderMatch: nextGenderMatch };
      }
      return {
        ...prev,
        genderMatch: nextGenderMatch,
        maleVoiceId:
          prev.maleVoiceId ??
          originalConfig.maleVoiceId ??
          config.maleVoiceId ??
          null,
        femaleVoiceId:
          prev.femaleVoiceId ??
          originalConfig.femaleVoiceId ??
          config.femaleVoiceId ??
          null,
      };
    });
  };

  const handleSave = async () => {
    if (localConfig.genderMatch === '1') {
      if (!localConfig.maleVoiceId) {
        messageApi.warning('启用性别匹配时，男性音色不能为空');
        return;
      }
      if (!localConfig.femaleVoiceId) {
        messageApi.warning('启用性别匹配时，女性音色不能为空');
        return;
      }
    }
    setSaving(true);
    try {
      const payload: UpdateVoiceConfigDTO = {
        identityName: config.identityName,
        voiceId: config.voiceId,
        genderMatch: localConfig.genderMatch,
        maleVoiceId: localConfig.maleVoiceId,
        femaleVoiceId: localConfig.femaleVoiceId,
      };
      await updateVoiceConfig(payload);
      messageApi.success('配置保存成功');
      setOriginalConfig(localConfig);
    } finally {
      setSaving(false);
    }
  };

  const openAddDialog = () => {
    addForm.resetFields();
    addForm.setFieldsValue({ name: '', voiceId: undefined });
    setAddOpen(true);
  };

  const closeAddDialog = () => {
    setAddOpen(false);
    addForm.resetFields();
  };

  const handleAddEmployee = async () => {
    let values: AddEmployeeForm;
    try {
      values = await addForm.validateFields();
    } catch {
      return;
    }
    const trimmed = (values.name ?? '').trim();
    const validation = validateEmployeeName(employeeNamePrefix, trimmed);
    if (!validation.valid) {
      messageApi.warning(validation.message ?? '员工姓名不合法');
      return;
    }
    setAdding(true);
    try {
      const data: AddEmployeeDTO = {
        name: `${employeeNamePrefix}${trimmed}`,
        voiceId: values.voiceId || undefined,
      };
      await addEmployee(config.identityName, data);
      messageApi.success('员工添加成功');
      closeAddDialog();
      onRefresh();
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteEmployee = (emp: EmployeeNameItem) => {
    confirmDelete({
      records: [emp],
      entityName: '数字员工',
      getName: (record) => record.name,
      description: '此操作不可恢复。',
      onConfirm: async () => {
        await deleteEmployees(emp.id);
      },
      onSuccess: onRefresh,
    });
  };

  return (
    <div className="flex flex-col rounded-xl border border-solid border-zinc-100 bg-white p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-solid border-zinc-200 bg-zinc-50 text-zinc-500">
            <Icon className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <Text strong className="block text-base text-zinc-900">
              {config.identityName}
            </Text>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-zinc-500">
          <Text type="secondary" className="text-xs">
            性别匹配
          </Text>
          <Switch
            size="small"
            checked={genderMatchEnabled}
            onChange={handleGenderMatchChange}
          />
        </div>
      </div>

      {genderMatchEnabled ? (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-solid border-pink-100 bg-pink-50/50 p-3">
            <div className="mb-2 text-xs text-pink-600">针对女性逾期客户</div>
            <Select
              placeholder="请选择女声"
              style={{ width: '100%' }}
              allowClear
              value={localConfig.femaleVoiceId ?? undefined}
              options={femaleVoiceOptions}
              onChange={(value) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  femaleVoiceId: (value as string | undefined) ?? null,
                }))
              }
            />
          </div>
          <div className="rounded-lg border border-solid border-blue-100 bg-blue-50/50 p-3">
            <div className="mb-2 text-xs text-blue-600">针对男性逾期客户</div>
            <Select
              placeholder="请选择男声"
              style={{ width: '100%' }}
              allowClear
              value={localConfig.maleVoiceId ?? undefined}
              options={maleVoiceOptions}
              onChange={(value) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  maleVoiceId: (value as string | undefined) ?? null,
                }))
              }
            />
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-zinc-500">
          创建新数字员工
        </div>
        <Button
          block
          type="dashed"
          icon={<PlusOutlined />}
          onClick={openAddDialog}
        >
          添加员工
        </Button>
      </div>

      <div className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <Text type="secondary" className="text-xs font-medium">
            已有数字员工：
          </Text>
          <Tag color="default" className="!mr-0">
            {employees.length}
          </Tag>
        </div>
        {employees.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {employees.map((emp) => (
              <Tag
                key={emp.id}
                closable
                color="default"
                className="!rounded-lg !border-zinc-200 !bg-zinc-50 !px-3 !py-1.5"
                onClose={(event) => {
                  event.preventDefault();
                  handleDeleteEmployee(emp);
                }}
              >
                {emp.name}-{emp.voiceName || '默认音色'}
              </Tag>
            ))}
          </div>
        ) : (
          <div className="text-xs text-zinc-400">暂无数字员工</div>
        )}
      </div>

      {hasChanges ? (
        <div className="flex justify-end">
          <Button
            type="primary"
            size="small"
            loading={saving}
            onClick={() => void handleSave()}
          >
            保存配置
          </Button>
        </div>
      ) : null}

      <Modal
        title={
          <span className="text-base font-semibold text-zinc-900">
            新增数字员工
          </span>
        }
        width={440}
        centered
        open={addOpen}
        destroyOnHidden
        mask={{ closable: false }}
        confirmLoading={adding}
        okText="添加员工"
        cancelText="取消"
        styles={{
          body: { paddingTop: 4 },
          footer: { marginTop: 24 },
          header: { marginBottom: 16 },
        }}
        onOk={() => void handleAddEmployee()}
        onCancel={closeAddDialog}
      >
        <Form<AddEmployeeForm>
          form={addForm}
          layout="vertical"
          variant="outlined"
          requiredMark={false}
          preserve={false}
          className="[&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-label>label]:!text-zinc-800"
        >
          <Form.Item
            label="员工姓名"
            name="name"
            rules={[
              { required: true, message: '请输入员工姓名' },
              {
                validator: (_rule, value: string | undefined) => {
                  const validation = validateEmployeeName(
                    employeeNamePrefix,
                    value ?? '',
                  );
                  if (!validation.valid) {
                    return Promise.reject(
                      new Error(validation.message ?? '员工姓名不合法'),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              prefix={
                <span className="mr-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                  {employeeNamePrefix}
                </span>
              }
              placeholder="请输入员工姓名"
              allowClear
              maxLength={employeeNameMaxLength}
              showCount
            />
          </Form.Item>
          <Form.Item
            label="关联音色"
            name="voiceId"
            rules={[{ required: true, message: '请选择音色' }]}
          >
            <Select
              placeholder="请选择关联音色"
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              options={allVoiceOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IdentityConfigCard;
