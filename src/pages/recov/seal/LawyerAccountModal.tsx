import { Form, Input, Modal, Typography } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useEffect, useState } from 'react';
import { addLawyerAccount, updateLawyerAccount } from '@/services/ruoyi/seal';

const { Text } = Typography;

export type LawyerAccountModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  sealId: number | string;
  sealName: string;
  initialUsername?: string;
  onClose: () => void;
  onSaved: () => void;
  messageApi: MessageInstance;
};

type FormValues = {
  lawyerUsername: string;
  lawyerPassword: string;
};

const LawyerAccountModal = ({
  open,
  mode,
  sealId,
  sealName,
  initialUsername,
  onClose,
  onSaved,
  messageApi,
}: LawyerAccountModalProps) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      lawyerUsername: mode === 'edit' ? (initialUsername ?? '') : '',
      lawyerPassword: '',
    });
  }, [open, mode, initialUsername, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const username = (values.lawyerUsername ?? '').trim();
      const password = values.lawyerPassword ?? '';

      setSubmitting(true);
      if (mode === 'edit') {
        await updateLawyerAccount(
          sealId,
          username || undefined,
          password ? password : undefined,
        );
      } else {
        await addLawyerAccount(sealId, username, password);
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
      title={isEdit ? '修改律师账号' : '新增律师账号'}
      width={480}
      destroyOnHidden
      mask={{ closable: false }}
      okText="确定"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        preserve={false}
      >
        <Form.Item label="印章名称">
          <Text>{sealName}</Text>
        </Form.Item>
        <Form.Item
          label="律师用户名"
          name="lawyerUsername"
          rules={[
            { required: true, message: '律师用户名不能为空' },
            { whitespace: true, message: '律师用户名不能为空' },
          ]}
        >
          <Input placeholder="请输入律师用户名" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label={isEdit ? '新密码' : '律师密码'}
          name="lawyerPassword"
          rules={
            isEdit ? [] : [{ required: true, message: '律师密码不能为空' }]
          }
        >
          <Input.Password
            placeholder={isEdit ? '留空则不修改密码' : '请输入律师密码'}
            autoComplete="new-password"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LawyerAccountModal;
