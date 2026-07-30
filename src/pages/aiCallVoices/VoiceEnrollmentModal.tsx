import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { Checkbox, Form, Input, Modal, Select, Upload } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceEnrollmentRequest } from '@/services/ruoyi/ai-call-voices.types';
import { validateVoiceSample } from './domain';

export type VoiceEnrollmentModalMode = 'create' | 'reenroll';

export type VoiceEnrollmentModalProps = {
  open: boolean;
  mode?: VoiceEnrollmentModalMode;
  initialDisplayName?: string;
  onSubmit: (values: VoiceEnrollmentRequest, file: File) => Promise<void>;
  onCancel: () => void;
};

type VoiceEnrollmentFormValues = VoiceEnrollmentRequest;

const initialFormValues = (
  initialDisplayName?: string,
): VoiceEnrollmentFormValues => ({
  displayName: initialDisplayName ?? '',
  gender: '未知',
  language: 'zh',
  transcript: undefined,
  consentConfirmed: false,
});

const VoiceEnrollmentModal = ({
  open,
  mode = 'create',
  initialDisplayName,
  onSubmit,
  onCancel,
}: VoiceEnrollmentModalProps) => {
  const [form] = Form.useForm<VoiceEnrollmentFormValues>();
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const consentConfirmed = Form.useWatch('consentConfirmed', form);

  const reset = useCallback(() => {
    form.setFieldsValue(initialFormValues(initialDisplayName));
    form.setFields([
      {
        name: 'consentConfirmed',
        errors: [],
      },
    ]);
    setFile(undefined);
    setFileError(undefined);
  }, [form, initialDisplayName]);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const fileList: UploadFile[] = file
    ? [
        {
          uid: 'selected-voice-sample',
          name: file.name,
          status: 'done',
          originFileObj: file as UploadFile['originFileObj'],
        },
      ]
    : [];

  const beforeUpload: UploadProps['beforeUpload'] = (nextFile) => {
    const errorMessage = validateVoiceSample(nextFile);
    if (errorMessage) {
      setFileError(errorMessage);
      return Upload.LIST_IGNORE;
    }
    setFile(nextFile);
    setFileError(undefined);
    return false;
  };

  const handleCancel = () => {
    if (submittingRef.current) return;
    reset();
    onCancel();
  };

  const handleFinish = async (values: VoiceEnrollmentFormValues) => {
    if (!file) {
      setFileError('请选择声音样本');
      return;
    }
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(
        {
          ...values,
          displayName: values.displayName.trim(),
          transcript: values.transcript?.trim() || undefined,
        },
        file,
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal
      cancelButtonProps={{ disabled: submitting }}
      cancelText="取消"
      closable={!submitting}
      destroyOnHidden
      mask={{ closable: !submitting }}
      okButtonProps={{
        disabled: submitting || !consentConfirmed,
        loading: submitting,
      }}
      okText="提交复刻"
      onCancel={handleCancel}
      onOk={() => form.submit()}
      open={open}
      title={mode === 'reenroll' ? '重新上传声音样本' : '创建自定义音色'}
      width={640}
    >
      <Form<VoiceEnrollmentFormValues>
        form={form}
        initialValues={initialFormValues(initialDisplayName)}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item
          label="音色展示名"
          name="displayName"
          rules={[
            { required: true, message: '请输入音色展示名' },
            { max: 100, message: '音色展示名不能超过 100 个字符' },
          ]}
        >
          <Input disabled={mode === 'reenroll'} maxLength={100} />
        </Form.Item>

        <Form.Item
          label="性别"
          name="gender"
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Select
            options={[
              { label: '未知', value: '未知' },
              { label: '女声', value: '女声' },
              { label: '男声', value: '男声' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="录音语种"
          name="language"
          rules={[{ required: true, message: '请选择录音语种' }]}
        >
          <Select options={[{ label: '中文', value: 'zh' }]} />
        </Form.Item>

        <Form.Item
          help={fileError}
          label="声音样本"
          required
          validateStatus={fileError ? 'error' : undefined}
        >
          <Upload.Dragger
            accept=".wav,.mp3,.m4a"
            beforeUpload={beforeUpload}
            fileList={fileList}
            maxCount={1}
            multiple={false}
            onRemove={() => {
              setFile(undefined);
              setFileError(undefined);
              return true;
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p>点击或拖拽上传声音样本</p>
            <p className="text-gray-500">
              WAV（16 bit）/ MP3 / M4A，小于 10 MB，推荐 10～20 秒，最长 60 秒
            </p>
          </Upload.Dragger>
        </Form.Item>

        <Form.Item label="录音文本（可选）" name="transcript">
          <Input.TextArea maxLength={2000} rows={3} />
        </Form.Item>

        <Form.Item
          name="consentConfirmed"
          rules={[
            {
              validator: (_, checked) =>
                checked
                  ? Promise.resolve()
                  : Promise.reject(new Error('请确认声音授权')),
            },
          ]}
          valuePropName="checked"
        >
          <Checkbox>
            我已获得声音权利人明确授权，并同意将录音发送至阿里云百炼进行声音复刻。
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VoiceEnrollmentModal;
