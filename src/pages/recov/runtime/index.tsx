import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Form,
  message,
  Radio,
  Spin,
  Switch,
  Tag,
  TimePicker,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getTimeConfig,
  type SaveTimeConfigDTO,
  saveTimeConfig,
  type TimeConfigVo,
} from '@/services/ruoyi/runtime';
import {
  DEFAULT_TIME_FORM,
  getTimeConfigSnapshot,
  HOLIDAY_POLICY_OPTIONS,
  isTimeConfigDirty,
  PAGE_TITLE,
  type TimeConfigSnapshot,
} from './_shared';

dayjs.extend(customParseFormat);

const parseTimeValue = (value?: string): Dayjs | null => {
  if (!value) return null;
  const parsed = dayjs(value, 'HH:mm', true);
  return parsed.isValid() ? parsed : null;
};

const timeFieldProps = {
  getValueProps: (value?: string) => ({
    value: parseTimeValue(value),
  }),
  getValueFromEvent: (_time: Dayjs | null, timeString: string) =>
    timeString || '',
};

const statusTagColor = (status: string) => {
  if (status === '正常运行') return 'green';
  if (status === '停止所有') return 'red';
  if (status === '仅停止外呼') return 'volcano';
  return 'orange';
};

const RuntimeSettingsPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [form] = Form.useForm<TimeConfigVo>();

  const [savedSnapshot, setSavedSnapshot] = useState<TimeConfigSnapshot | null>(
    null,
  );
  const [runningStatus, setRunningStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const timeEnabled = Form.useWatch('timeEnabled', form) === '1';
  const watchedForm = Form.useWatch([], form) as TimeConfigVo | undefined;

  const currentSnapshot = useMemo(
    () => getTimeConfigSnapshot(watchedForm ?? DEFAULT_TIME_FORM),
    [watchedForm],
  );

  const dirty = useMemo(
    () => isTimeConfigDirty(savedSnapshot, currentSnapshot),
    [savedSnapshot, currentSnapshot],
  );

  const fetchTimeConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimeConfig();
      const data = res.data;
      const next: TimeConfigVo = data
        ? {
            timeEnabled: data.timeEnabled === '0' ? '0' : '1',
            startTime: data.startTime || DEFAULT_TIME_FORM.startTime,
            endTime: data.endTime || DEFAULT_TIME_FORM.endTime,
            holidayPolicy:
              data.holidayPolicy ?? DEFAULT_TIME_FORM.holidayPolicy,
          }
        : DEFAULT_TIME_FORM;
      form.setFieldsValue(next);
      setRunningStatus(data?.runningStatus || '');
      setSavedSnapshot(getTimeConfigSnapshot(next));
    } catch {
      form.setFieldsValue(DEFAULT_TIME_FORM);
      setSavedSnapshot(
        (prev) => prev ?? getTimeConfigSnapshot(DEFAULT_TIME_FORM),
      );
      messageApi.error('运营时间配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [form, messageApi]);

  useEffect(() => {
    void fetchTimeConfig();
  }, [fetchTimeConfig]);

  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const values = form.getFieldsValue();
    if (values.timeEnabled === '1' && (!values.startTime || !values.endTime)) {
      messageApi.warning('开启时段限制时，请填写完整的外呼时间段');
      return;
    }
    if (values.timeEnabled === '1') {
      const startTime = parseTimeValue(values.startTime);
      const endTime = parseTimeValue(values.endTime);
      if (!startTime || !endTime) {
        messageApi.warning('外呼时间段格式不正确');
        return;
      }
      if (!endTime.isAfter(startTime)) {
        messageApi.warning('结束时间必须晚于开始时间');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: SaveTimeConfigDTO = {
        timeEnabled: values.timeEnabled,
        startTime: values.startTime,
        endTime: values.endTime,
        holidayPolicy: values.holidayPolicy,
      };
      await saveTimeConfig(payload);
      messageApi.success('运营时间配置保存成功');
      await fetchTimeConfig();
    } catch {
      messageApi.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer breadcrumbRender={false} title={PAGE_TITLE}>
      {messageContextHolder}

      <ProCard
        title="AI 外呼运营时间"
        extra={
          <div className="flex items-center gap-2">
            {runningStatus ? (
              <Tag color={statusTagColor(runningStatus)} variant="filled">
                {runningStatus}
              </Tag>
            ) : null}
            {dirty ? (
              <Button type="primary" loading={saving} onClick={handleSave}>
                保存配置
              </Button>
            ) : null}
          </div>
        }
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            initialValues={DEFAULT_TIME_FORM}
            className="max-w-3xl"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
              <Form.Item
                label="外呼运营时段"
                name="timeEnabled"
                valuePropName="checked"
                getValueProps={(value) => ({ checked: value === '1' })}
                getValueFromEvent={(checked: boolean) => (checked ? '1' : '0')}
              >
                <Switch />
              </Form.Item>

              {timeEnabled ? (
                <Form.Item label="外呼时间段" required>
                  <div className="flex flex-wrap items-center gap-3">
                    <Form.Item
                      name="startTime"
                      noStyle
                      {...timeFieldProps}
                      rules={[{ required: true, message: '请选择开始时间' }]}
                    >
                      <TimePicker
                        format="HH:mm"
                        className="!w-36"
                        placeholder="开始时间"
                      />
                    </Form.Item>
                    <span className="font-medium text-gray-400">至</span>
                    <Form.Item
                      name="endTime"
                      noStyle
                      {...timeFieldProps}
                      rules={[{ required: true, message: '请选择结束时间' }]}
                    >
                      <TimePicker
                        format="HH:mm"
                        className="!w-36"
                        placeholder="结束时间"
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
              ) : null}

              <Form.Item
                label="节假日运行策略"
                name="holidayPolicy"
                className={timeEnabled ? '' : 'md:col-span-2'}
              >
                <Radio.Group options={[...HOLIDAY_POLICY_OPTIONS]} />
              </Form.Item>
            </div>
          </Form>
        </Spin>
      </ProCard>
    </PageContainer>
  );
};

export default RuntimeSettingsPage;
