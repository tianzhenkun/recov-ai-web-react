import { Form, Input, Modal, Select, Typography } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useEffect, useState } from 'react';
import {
  addFilingAccount,
  type SealCode,
  updateFilingAccount,
} from '@/services/ruoyi/seal';

const { Text } = Typography;

const accountIdentityOptions = [
  { label: '个人用户', value: '个人用户' },
  { label: '律师用户', value: '律师用户' },
  { label: '法人用户', value: '法人用户' },
];

export type LawyerAccountModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  sealId: number | string;
  sealCode?: SealCode;
  sealName: string;
  initialUsername?: string;
  initialIdentity?: string;
  onClose: () => void;
  onSaved: () => void;
  messageApi: MessageInstance;
};

type FormValues = {
  lawyerUsername: string;
  lawyerPassword: string;
  accountIdentity: string;
};

const LawyerAccountModal = ({
  open,
  mode,
  sealId,
  sealCode,
  sealName,
  initialUsername,
  initialIdentity,
  onClose,
  onSaved,
  messageApi,
}: LawyerAccountModalProps) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaultIdentity =
      sealCode === 'lawyer_seal' ? '律师用户' : '法人用户';
    form.setFieldsValue({
      lawyerUsername: mode === 'edit' ? (initialUsername ?? '') : '',
      lawyerPassword: '',
      accountIdentity:
        mode === 'edit'
          ? (initialIdentity ?? defaultIdentity)
          : defaultIdentity,
    });
  }, [open, mode, sealCode, initialUsername, initialIdentity, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const username = (values.lawyerUsername ?? '').trim();
      const password = values.lawyerPassword ?? '';
      const identity = values.accountIdentity;

      setSubmitting(true);
      if (mode === 'edit') {
        await updateFilingAccount(
          sealId,
          username || undefined,
          password ? password : undefined,
          identity,
        );
      } else {
        await addFilingAccount(sealId, username, password, identity);
      }
      messageApi.success('操作成功');
      onSaved();
      onClose();
    } catch (err) {
      if ((err as { errorFields?: unknown[] })?.errorFields) return;
      messageApi.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) return;
    onClose();
  };

  const isEdit = mode === 'edit';

  return (
    <Modal
      open={open}
      title={
        <span className="text-base font-semibold text-zinc-900">
          {isEdit ? '修改立案账号' : '新增立案账号'}
        </span>
      }
      width={440}
      centered
      destroyOnHidden
      mask={{ closable: false }}
      okText={isEdit ? '保存账号' : '新增账号'}
      cancelText="取消"
      confirmLoading={submitting}
      styles={{
        body: { paddingTop: 4 },
        footer: { marginTop: 24 },
        header: { marginBottom: 16 },
      }}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        variant="outlined"
        preserve={false}
        className="[&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-label>label]:!text-zinc-800"
      >
        <Form.Item label="印章名称">
          <Text>{sealName}</Text>
        </Form.Item>
        <Form.Item
          label="账号身份"
          name="accountIdentity"
          rules={[{ required: true, message: '账号身份不能为空' }]}
        >
          <Select
            options={accountIdentityOptions}
            placeholder="请选择账号身份"
          />
        </Form.Item>
        <Form.Item
          label="立案账号"
          name="lawyerUsername"
          rules={[
            { required: true, message: '立案账号不能为空' },
            { whitespace: true, message: '立案账号不能为空' },
          ]}
        >
          <Input placeholder="请输入立案账号" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label={isEdit ? '新密码' : '立案账号密码'}
          name="lawyerPassword"
          rules={
            isEdit ? [] : [{ required: true, message: '立案账号密码不能为空' }]
          }
        >
          <Input.Password
            placeholder={isEdit ? '留空则不修改密码' : '请输入立案账号密码'}
            autoComplete="new-password"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LawyerAccountModal;
