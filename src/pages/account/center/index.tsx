import {
  CameraOutlined,
  LockOutlined,
  MailOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Typography,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CurrentPasswordUpdate,
  type CurrentProfile,
  type CurrentProfileUpdate,
  getCurrentProfile,
  updateCurrentPassword,
  updateCurrentProfile,
  uploadCurrentAvatar,
} from '@/app/auth/profile';
import useStyles from './Center.style';

type PasswordFormValues = CurrentPasswordUpdate & {
  confirmPassword: string;
};

const avatarUrl = (value?: number | string) => {
  const text = String(value || '').trim();
  return /^(https?:|data:|\/)/i.test(text) ? text : undefined;
};

const displayValue = (value?: number | string) =>
  String(value ?? '').trim() || '-';

const AccountCenterPage = () => {
  const { message } = App.useApp();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const [profileForm] = Form.useForm<CurrentProfileUpdate>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [profile, setProfile] = useState<CurrentProfile>();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCurrentProfile();
      const nextProfile = response.data;
      setProfile(nextProfile);
      profileForm.setFieldsValue({
        nickName: nextProfile?.user?.nickName,
        email: nextProfile?.user?.email,
        phonenumber: nextProfile?.user?.phonenumber,
        sex: nextProfile?.user?.sex || '2',
      });
    } finally {
      setLoading(false);
    }
  }, [profileForm]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateInitialUser = useCallback(
    (values: CurrentProfileUpdate) => {
      setInitialState((state) => {
        if (!state?.currentUser) return state;
        return {
          ...state,
          currentUser: {
            ...state.currentUser,
            name: values.nickName || state.currentUser.name,
            email: values.email,
            phone: values.phonenumber,
            rawUser: {
              ...state.currentUser.rawUser,
              nickName: values.nickName,
              email: values.email,
              phonenumber: values.phonenumber,
              sex: values.sex,
            },
          },
        };
      });
    },
    [setInitialState],
  );

  const saveProfile = async (values: CurrentProfileUpdate) => {
    setSavingProfile(true);
    try {
      await updateCurrentProfile(values);
      updateInitialUser(values);
      await loadProfile();
      message.success('个人资料已更新');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (values: PasswordFormValues) => {
    setSavingPassword(true);
    try {
      await updateCurrentPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      message.success('密码已更新');
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('头像大小不能超过2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await uploadCurrentAvatar(file);
      const nextAvatar = response.data?.imgUrl;
      setInitialState((state) => {
        if (!state?.currentUser || !nextAvatar) return state;
        return {
          ...state,
          currentUser: {
            ...state.currentUser,
            avatar: nextAvatar,
            rawUser: {
              ...state.currentUser.rawUser,
              avatar: nextAvatar,
            },
          },
        };
      });
      await loadProfile();
      message.success('头像已更新');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const user = profile?.user;
  const currentAvatar =
    avatarUrl(user?.avatar) || initialState?.currentUser?.avatar;
  const profileItems = useMemo(
    () => [
      {
        key: 'tenant',
        label: '租户编号',
        children: displayValue(user?.tenantId),
      },
      {
        key: 'dept',
        label: '所属部门',
        children: displayValue(user?.deptName),
      },
      {
        key: 'roles',
        label: '角色',
        children: displayValue(profile?.roleGroup),
      },
      {
        key: 'posts',
        label: '岗位',
        children: displayValue(profile?.postGroup),
      },
      {
        key: 'loginIp',
        label: '最后登录IP',
        children: displayValue(user?.loginIp),
      },
      {
        key: 'loginDate',
        label: '最后登录时间',
        children: user?.loginDate
          ? dayjs(user.loginDate).format('YYYY-MM-DD HH:mm:ss')
          : '-',
      },
    ],
    [profile?.postGroup, profile?.roleGroup, user],
  );

  const profileTab = (
    <Form
      form={profileForm}
      layout="vertical"
      className={styles.form}
      onFinish={(values) => void saveProfile(values)}
    >
      <Form.Item label="登录账号">
        <Input disabled value={user?.userName} prefix={<UserOutlined />} />
      </Form.Item>
      <Form.Item
        name="nickName"
        label="用户昵称"
        rules={[
          { required: true, message: '请输入用户昵称' },
          { max: 30, message: '用户昵称不能超过30个字符' },
        ]}
      >
        <Input maxLength={30} placeholder="请输入用户昵称" />
      </Form.Item>
      <Form.Item
        name="phonenumber"
        label="手机号码"
        rules={[{ pattern: /^1\d{10}$/, message: '请输入正确的手机号码' }]}
      >
        <Input prefix={<MobileOutlined />} placeholder="请输入手机号码" />
      </Form.Item>
      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { type: 'email', message: '请输入正确的邮箱地址' },
          { max: 50, message: '邮箱不能超过50个字符' },
        ]}
      >
        <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
      </Form.Item>
      <Form.Item name="sex" label="性别">
        <Select
          options={[
            { label: '男', value: '0' },
            { label: '女', value: '1' },
            { label: '未设置', value: '2' },
          ]}
        />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={savingProfile}>
        保存资料
      </Button>
    </Form>
  );

  const securityTab = (
    <Form
      form={passwordForm}
      layout="vertical"
      className={styles.form}
      onFinish={(values) => void savePassword(values)}
    >
      <Form.Item
        name="oldPassword"
        label="当前密码"
        rules={[{ required: true, message: '请输入当前密码' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          autoComplete="current-password"
        />
      </Form.Item>
      <Form.Item
        name="newPassword"
        label="新密码"
        rules={[
          { required: true, message: '请输入新密码' },
          { min: 5, max: 20, message: '密码长度必须介于5和20个字符之间' },
        ]}
      >
        <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
      </Form.Item>
      <Form.Item
        name="confirmPassword"
        label="确认新密码"
        dependencies={['newPassword']}
        rules={[
          { required: true, message: '请再次输入新密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newPassword') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的新密码不一致'));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={savingPassword}>
        修改密码
      </Button>
    </Form>
  );

  return (
    <PageContainer breadcrumbRender={false} title="个人中心">
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8} xl={7}>
            <Card variant="borderless" className={styles.profileCard}>
              <Space orientation="vertical" size={16} align="center">
                <Avatar size={96} src={currentAvatar} icon={<UserOutlined />} />
                <div className={styles.identity}>
                  <Typography.Title level={4} className={styles.name}>
                    {user?.nickName || user?.userName || '用户'}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {user?.userName || '-'}
                  </Typography.Text>
                </div>
                <Upload
                  accept="image/*"
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    void uploadAvatar(file as File);
                    return Upload.LIST_IGNORE;
                  }}
                >
                  <Button icon={<CameraOutlined />} loading={uploadingAvatar}>
                    更换头像
                  </Button>
                </Upload>
              </Space>
              <Descriptions
                className={styles.descriptions}
                column={1}
                size="small"
                items={profileItems}
              />
            </Card>
          </Col>
          <Col xs={24} lg={16} xl={17}>
            <Card variant="borderless">
              <Tabs
                defaultActiveKey="profile"
                items={[
                  { key: 'profile', label: '基本资料', children: profileTab },
                  { key: 'security', label: '安全设置', children: securityTab },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
};

export default AccountCenterPage;
