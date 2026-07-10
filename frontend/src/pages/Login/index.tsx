import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Tabs, Toast } from 'antd-mobile';
import { login as loginApi, register as registerApi } from '@/api';
import { normalizeUserInfo } from '@/utils/display';
import { getRoleHomePath, setToken, setUserInfo } from '@/utils/storage';

type AuthMode = 'login' | 'register';

type AuthFormValues = {
  account: string;
  password: string;
  confirmPassword?: string;
  nickname?: string;
};

const ACCOUNT_MIN_LENGTH = 4;
const ACCOUNT_MAX_LENGTH = 20;
const accountPattern = /^[A-Za-z0-9_]+$/;

const submitAuth = async (mode: AuthMode, values: AuthFormValues) => {
  const account = values.account.trim();

  if (mode === 'register') {
    await registerApi({
      account,
      password: values.password,
      nickname: values.nickname,
    });
    return null;
  }

  return loginApi(account, values.password);
};

const loginStyles = `
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px calc(32px + env(safe-area-inset-bottom));
  overflow-x: hidden;
  background:
    radial-gradient(circle at 14% 10%, rgba(22, 119, 255, 0.16), transparent 30%),
    radial-gradient(circle at 86% 18%, rgba(34, 197, 94, 0.12), transparent 28%),
    linear-gradient(180deg, #eef6ff 0%, #f8fbff 46%, #f7f9fc 100%);
}

.login-card {
  width: 100%;
  max-width: 390px;
  padding: 24px 18px 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 46px rgba(16, 24, 40, 0.12);
  animation: loginFadeIn 420ms ease both;
}

.login-brand {
  margin-bottom: 18px;
  text-align: center;
}

.login-logo {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
  border-radius: 18px;
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #1677ff 0%, #3aa7ff 52%, #22c55e 100%);
  box-shadow: 0 14px 28px rgba(22, 119, 255, 0.24);
}

.login-title {
  margin: 0;
  color: #172033;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 800;
}

.login-subtitle {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
}

.login-tabs {
  margin-bottom: 14px;
}

.login-tabs .adm-tabs-header {
  border-bottom: 0;
}

.login-tabs .adm-tabs-tab-wrapper {
  padding: 0 4px;
}

.login-tabs .adm-tabs-tab {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #667085;
  font-size: 14px;
  transition: all 180ms ease;
}

.login-tabs .adm-tabs-tab-active {
  color: #1677ff;
  background: #e8f2ff;
  font-weight: 700;
}

.login-tabs .adm-tabs-tab-line {
  display: none;
}

.login-form .adm-list {
  --border-top: 0;
  --border-bottom: 0;
  --border-inner: 0;
  background: transparent;
}

.login-form .adm-list-body {
  background: transparent;
  border: 0;
}

.login-form .adm-list-item {
  margin-bottom: 12px;
  padding: 0;
  border-radius: 16px;
  background: #f7faff;
  border: 1px solid #e5efff;
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

.login-form .adm-list-item:focus-within {
  border-color: rgba(22, 119, 255, 0.55);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(22, 119, 255, 0.08);
}

.login-form .adm-list-item-content {
  min-height: 52px;
  padding: 0 14px;
  border: 0;
}

.login-form .adm-form-item-label {
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.login-form .adm-input {
  --font-size: 15px;
  --placeholder-color: #98a2b3;
}

.login-form .adm-form-item-feedback-error {
  padding: 6px 2px 0;
  color: #ef4444;
  font-size: 12px;
}

.login-submit {
  width: 100%;
  height: 48px;
  margin-top: 6px;
  border: 0;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(135deg, #1677ff 0%, #35a2ff 100%);
  box-shadow: 0 14px 28px rgba(22, 119, 255, 0.28);
  transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;
}

.login-submit:active {
  transform: scale(0.98);
  box-shadow: 0 8px 18px rgba(22, 119, 255, 0.2);
  filter: brightness(0.98);
}

.login-tip {
  margin: 14px 0 0;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

@keyframes loginFadeIn {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
`;

export default function Login() {
  const [activeMode, setActiveMode] = useState<AuthMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<AuthFormValues>();
  const navigate = useNavigate();

  const handleModeChange = (key: string) => {
    setActiveMode(key as AuthMode);
    form.resetFields();
  };

  const handleFinish = async (values: AuthFormValues) => {
    setSubmitting(true);

    try {
      const response = await submitAuth(activeMode, values);

      if (activeMode === 'register') {
        Toast.show({
          icon: 'success',
          content: '注册成功，请继续登录',
        });
        setActiveMode('login');
        form.setFieldsValue({
          password: '',
          confirmPassword: '',
        });
        return;
      }

      const authToken = response?.token;
      const responseUser = response?.user;

      if (!authToken) {
        throw new Error('登录成功但未返回 token，请检查接口返回结构');
      }

      const userInfo = normalizeUserInfo(responseUser, values.account.trim());

      setToken(authToken);
      setUserInfo(userInfo);

      Toast.show({
        icon: 'success',
        content: userInfo.is_admin ? '管理员登录成功' : '登录成功',
      });

      window.setTimeout(() => {
        navigate(getRoleHomePath(userInfo.role), { replace: true });
      }, 420);
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error instanceof Error ? error.message : '操作失败，请稍后重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <style>{loginStyles}</style>
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">拾</div>
          <h1 className="login-title">校园失物招领</h1>
          <p className="login-subtitle">使用账号登录，系统将自动识别身份</p>
        </div>

        <Tabs className="login-tabs" activeKey={activeMode} onChange={handleModeChange} stretch>
          <Tabs.Tab title="登录" key="login" />
          <Tabs.Tab title="注册" key="register" />
        </Tabs>

        <Form
          className="login-form"
          form={form}
          layout="vertical"
          mode="card"
          requiredMarkStyle="asterisk"
          onFinish={handleFinish}
          footer={
            <Button className="login-submit" type="submit" color="primary" loading={submitting}>
              {activeMode === 'login' ? '登录' : '创建账号'}
            </Button>
          }
        >
          {activeMode === 'register' && (
            <Form.Item
              name="nickname"
              label="昵称"
              rules={[
                { required: true, message: '请输入昵称' },
                { min: 2, message: '昵称至少 2 位' },
                { max: 16, message: '昵称最多 16 位' },
              ]}
            >
              <Input clearable maxLength={16} placeholder="请输入昵称" />
            </Form.Item>
          )}

          <Form.Item
            name="account"
            label="账号"
            rules={[
              { required: true, message: '请输入账号' },
              {
                min: ACCOUNT_MIN_LENGTH,
                message: `账号至少 ${ACCOUNT_MIN_LENGTH} 位`,
              },
              {
                max: ACCOUNT_MAX_LENGTH,
                message: `账号最多 ${ACCOUNT_MAX_LENGTH} 位`,
              },
              {
                pattern: accountPattern,
                message: '账号仅支持字母、数字和下划线',
              },
            ]}
          >
            <Input
              clearable
              maxLength={ACCOUNT_MAX_LENGTH}
              autoComplete="username"
              placeholder={`${ACCOUNT_MIN_LENGTH}-${ACCOUNT_MAX_LENGTH} 位字母/数字/下划线`}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 位' },
              { max: 32, message: '密码最多 32 位' },
            ]}
          >
            <Input
              clearable
              type="password"
              maxLength={32}
              placeholder="请输入密码"
              autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
            />
          </Form.Item>

          {activeMode === 'register' && (
            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                {
                  validator: async (_, value) => {
                    if (!value || form.getFieldValue('password') === value) {
                      return;
                    }
                    throw new Error('两次输入的密码不一致');
                  },
                },
              ]}
            >
              <Input clearable type="password" maxLength={32} placeholder="请再次输入密码" autoComplete="new-password" />
            </Form.Item>
          )}
        </Form>

        <p className="login-tip">注册账号默认为普通用户；管理员身份由数据库 is_admin 字段决定</p>
      </section>
    </main>
  );
}
