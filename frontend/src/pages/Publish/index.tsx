import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  CapsuleTabs,
  Form,
  ImageUploader,
  Input,
  NavBar,
  Selector,
  TextArea,
  Toast,
} from 'antd-mobile';
import type { ImageUploadItem } from 'antd-mobile';
import request from '@/utils/request';

type PublishType = 'lost' | 'found';

type PublishFormValues = {
  title: string;
  category: string[];
  location: string;
  contact: string;
  description: string;
};

type PublishPayload = {
  type: PublishType;
  title: string;
  category: string;
  location: string;
  contact: string;
  description: string;
  images: ImageUploadItem[];
};

const DEMO_MODE = true;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const categoryOptions = [
  { label: '证件卡片', value: '证件卡片' },
  { label: '数码设备', value: '数码设备' },
  { label: '生活用品', value: '生活用品' },
  { label: '学习资料', value: '学习资料' },
  { label: '衣物配饰', value: '衣物配饰' },
  { label: '其他', value: '其他' },
];

const wait = (duration = 700) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

const polishDescription = async (description: string) => {
  await wait(820);

  if (description.length < 8) {
    throw new Error('描述内容太短，请先补充更多物品特征');
  }

  return `${description.trim()}。如有同学看到或拾到，请通过联系方式及时沟通，领取时可核对物品细节。`;
};

const submitPost = async (payload: PublishPayload) => {
  if (DEMO_MODE) {
    await wait(900);

    if (payload.title.includes('失败')) {
      throw new Error('发布失败，请检查网络后重试');
    }

    return {
      id: String(Date.now()),
    };
  }

  return request.post('/posts', payload);
};

const publishStyles = `
.publish-page {
  min-height: 100vh;
  overflow-x: hidden;
  background:
    linear-gradient(180deg, rgba(22, 119, 255, 0.12) 0%, rgba(247, 249, 252, 0) 210px),
    #f6f8fc;
}

.publish-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 6px 14px 14px;
  background: rgba(246, 248, 252, 0.9);
  backdrop-filter: blur(16px);
}

.publish-navbar {
  --height: 46px;
  --border-bottom: 0;
  color: #182230;
  font-weight: 800;
}

.publish-tabs {
  padding: 5px;
  border-radius: 999px;
  background: #e8f2ff;
}

.publish-tabs .adm-capsule-tabs-header {
  border-bottom: 0;
}

.publish-tabs .adm-capsule-tabs-tab-wrapper {
  flex: 1;
  padding: 0 3px;
}

.publish-tabs .adm-capsule-tabs-tab {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #667085;
  font-weight: 800;
}

.publish-tabs .adm-capsule-tabs-tab-active {
  color: #fff;
  background: linear-gradient(135deg, #1677ff 0%, #35a2ff 100%);
  box-shadow: 0 10px 18px rgba(22, 119, 255, 0.22);
}

.publish-content {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 14px calc(28px + env(safe-area-inset-bottom));
}

.publish-section {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(16, 24, 40, 0.07);
}

.publish-section-title {
  margin: 0 0 12px;
  color: #182230;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 800;
}

.publish-form .adm-list {
  --border-top: 0;
  --border-bottom: 0;
  --border-inner: 0;
  background: transparent;
}

.publish-form .adm-list-body {
  background: transparent;
  border: 0;
}

.publish-form .adm-list-item {
  margin-bottom: 12px;
  padding: 0;
  border-radius: 16px;
  background: #f7faff;
  border: 1px solid #e7eefb;
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

.publish-form .adm-list-item:focus-within {
  border-color: rgba(22, 119, 255, 0.55);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(22, 119, 255, 0.08);
}

.publish-form .adm-list-item-content {
  min-height: 52px;
  padding: 0 14px;
  border: 0;
}

.publish-form .adm-form-item-label {
  color: #344054;
  font-size: 13px;
  font-weight: 800;
}

.publish-form .adm-form-item-required-asterisk {
  color: #ef4444;
}

.publish-form .adm-input,
.publish-form .adm-text-area {
  --font-size: 15px;
  --placeholder-color: #98a2b3;
}

.publish-form .adm-form-item-feedback-error {
  padding-top: 6px;
  color: #ef4444;
  font-size: 12px;
}

.publish-selector .adm-selector-item {
  border: 0;
  border-radius: 999px;
  background: #f1f5fb;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.publish-selector .adm-selector-item-active {
  color: #1677ff;
  background: #e8f2ff;
  box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.16);
}

.publish-uploader {
  --cell-size: 88px;
  --gap: 10px;
}

.publish-uploader .adm-image-uploader-cell {
  border-radius: 16px;
  overflow: hidden;
}

.publish-upload-box {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  border: 1.5px dashed #9cc8ff;
  border-radius: 16px;
  color: #1677ff;
  background: #f5faff;
  font-size: 12px;
  font-weight: 800;
  transition: all 160ms ease;
}

.publish-upload-box:active {
  transform: scale(0.96);
  background: #e8f2ff;
}

.publish-upload-plus {
  display: block;
  margin-bottom: 5px;
  font-size: 24px;
  line-height: 1;
}

.publish-delete-icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #fff;
  background: rgba(239, 68, 68, 0.92);
  box-shadow: 0 6px 12px rgba(239, 68, 68, 0.24);
}

.publish-helper {
  margin: 10px 0 0;
  color: #98a2b3;
  font-size: 12px;
}

.publish-ai-button {
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 15px;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, #7c3aed 0%, #1677ff 100%);
  box-shadow: 0 12px 24px rgba(124, 58, 237, 0.22);
  transition: transform 140ms ease;
}

.publish-submit {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(135deg, #1677ff 0%, #35a2ff 100%);
  box-shadow: 0 14px 28px rgba(22, 119, 255, 0.28);
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.publish-ai-button:active,
.publish-submit:active {
  transform: scale(0.98);
}
`;

export default function Publish() {
  const [publishType, setPublishType] = useState<PublishType>('lost');
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lastSubmitAtRef = useRef(0);
  const [form] = Form.useForm<PublishFormValues>();
  const navigate = useNavigate();

  const handleTypeChange = (key: string) => {
    setPublishType(key as PublishType);
  };

  const beforeUpload = (file: File) => {
    if (images.length >= 3) {
      Toast.show({
        icon: 'fail',
        content: '最多上传 3 张图片',
      });
      return null;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      Toast.show({
        icon: 'fail',
        content: '单张图片不能超过 2MB',
      });
      return null;
    }

    return file;
  };

  const uploadImage = async (file: File): Promise<ImageUploadItem> => {
    await wait(240);
    const url = URL.createObjectURL(file);

    return {
      key: `${file.name}-${Date.now()}`,
      url,
    };
  };

  const handleAiPolish = async () => {
    const description = form.getFieldValue('description')?.trim();

    if (!description) {
      Toast.show({
        icon: 'fail',
        content: '请先填写物品描述',
      });
      return;
    }

    setAiLoading(true);

    try {
      const polished = await polishDescription(description);
      form.setFieldValue('description', polished);
      Toast.show({
        icon: 'success',
        content: 'AI 润色完成',
      });
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error instanceof Error ? error.message : 'AI 润色失败，请稍后重试',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (values: PublishFormValues) => {
    const now = Date.now();

    if (now - lastSubmitAtRef.current < 1400) {
      Toast.show({
        content: '提交太快了，请稍后再试',
      });
      return;
    }

    lastSubmitAtRef.current = now;
    setSubmitting(true);

    try {
      await submitPost({
        type: publishType,
        title: values.title,
        category: values.category[0],
        location: values.location,
        contact: values.contact,
        description: values.description,
        images,
      });

      Toast.show({
        icon: 'success',
        content: '发布成功',
      });

      window.setTimeout(() => {
        navigate('/home', { replace: true });
      }, 520);
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error instanceof Error ? error.message : '发布失败，请稍后重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="publish-page">
      <style>{publishStyles}</style>
      <header className="publish-header">
        <NavBar className="publish-navbar" onBack={() => navigate(-1)}>
          发布帖子
        </NavBar>
        <CapsuleTabs className="publish-tabs" activeKey={publishType} onChange={handleTypeChange}>
          <CapsuleTabs.Tab title="我丢了东西" key="lost" />
          <CapsuleTabs.Tab title="我捡到东西" key="found" />
        </CapsuleTabs>
      </header>

      <section className="publish-content">
        <Form
          className="publish-form"
          form={form}
          layout="vertical"
          mode="card"
          requiredMarkStyle="asterisk"
          initialValues={{
            category: ['证件卡片'],
          }}
          onFinish={handleSubmit}
          footer={
            <Button className="publish-submit" type="submit" color="primary" loading={submitting}>
              确认发布
            </Button>
          }
        >
          <div className="publish-section">
            <h2 className="publish-section-title">基本信息</h2>
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: '请输入帖子标题' }]}
            >
              <Input clearable maxLength={28} placeholder="例如：蓝色保温杯遗失" />
            </Form.Item>

            <Form.Item
              name="category"
              label="物品分类"
              rules={[{ required: true, message: '请选择物品分类' }]}
            >
              <Selector<string> className="publish-selector" columns={3} options={categoryOptions} />
            </Form.Item>

            <Form.Item
              name="location"
              label="地点"
              rules={[{ required: true, message: '请输入相关地点' }]}
            >
              <Input clearable maxLength={32} placeholder="例如：图书馆三楼靠窗位置" />
            </Form.Item>

            <Form.Item
              name="contact"
              label="联系方式"
              rules={[
                { required: true, message: '请输入联系方式' },
                {
                  validator: async (_, value) => {
                    if (!value || /^1[3-9]\d{9}$/.test(value) || value.length >= 6) {
                      return;
                    }
                    throw new Error('请输入手机号或有效联系方式');
                  },
                },
              ]}
            >
              <Input clearable maxLength={24} placeholder="手机号、微信或其他联系方式" />
            </Form.Item>
          </div>

          <div className="publish-section">
            <h2 className="publish-section-title">详情描述</h2>
            <Form.Item
              name="description"
              label="物品描述"
              rules={[{ required: true, message: '请填写物品描述' }]}
            >
              <TextArea
                rows={5}
                maxLength={220}
                showCount
                placeholder={
                  publishType === 'lost'
                    ? '描述物品特征、遗失时间、可能位置'
                    : '描述物品特征、拾到时间、暂存位置'
                }
              />
            </Form.Item>

            <Button className="publish-ai-button" loading={aiLoading} onClick={handleAiPolish}>
              AI 一键润色
            </Button>
          </div>

          <div className="publish-section">
            <h2 className="publish-section-title">图片上传</h2>
            <ImageUploader
              className="publish-uploader"
              value={images}
              maxCount={3}
              multiple
              accept="image/*"
              imageFit="cover"
              beforeUpload={beforeUpload}
              upload={uploadImage}
              onChange={setImages}
              onCountExceed={() => {
                Toast.show({
                  icon: 'fail',
                  content: '最多上传 3 张图片',
                });
              }}
              onDelete={(item) => {
                URL.revokeObjectURL(item.url);
              }}
              deleteIcon={<span className="publish-delete-icon">×</span>}
            >
              <div className="publish-upload-box">
                <span>
                  <span className="publish-upload-plus">+</span>
                  添加图片
                </span>
              </div>
            </ImageUploader>
            <p className="publish-helper">最多 3 张，单张不超过 2MB，清晰图片能提高找回概率</p>
          </div>

        </Form>
      </section>
    </main>
  );
}
