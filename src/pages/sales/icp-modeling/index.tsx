import {
  BuildOutlined,
  PaperClipOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Input, message, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd/es/upload';
import type { FC } from 'react';
import { useState } from 'react';
import IcpModal from './components/IcpModal';
import { SECTION_CONFIGS } from './constants';
import type { IcpModelResult } from './data.d';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const IcpModelingPage: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [icpModalOpen, setIcpModalOpen] = useState(false);

  const handleAiGenerate = () => {
    if (!prompt.trim()) {
      message.warning('请先描述您的理想客户画像');
      return;
    }
    setIsProcessing(true);
    window.setTimeout(() => {
      setIsProcessing(false);
      message.success('ICP 模型生成请求已提交（Mock）');
    }, 500);
  };

  const handleUpload: UploadProps['beforeUpload'] = (file) => {
    message.info(`已选择文件：${file.name}`);
    return false;
  };

  const handleConfirm = (result: IcpModelResult) => {
    message.success(
      result.modelName
        ? `ICP 模型「${result.modelName}」已保存（Mock）`
        : 'ICP 模型已保存（Mock）',
    );
  };

  return (
    <PageContainer breadcrumbRender={false} title="ICP 建模">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-6 py-4 lg:grid-cols-2">
        <ProCard
          className="h-auto"
          title={
            <span className="flex items-center gap-2">
              <RobotOutlined />
              AI 快速建模
            </span>
          }
          style={{ borderRadius: 16 }}
          styles={{ body: { padding: 20 } }}
        >
          <div className="mb-4">
            <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
              描述理想客户，智能体帮你完成建模与挖掘
            </Title>
            <Paragraph type="secondary" className="!mb-0 mt-1 text-sm">
              用自然语言说明目标客户画像，适合快速启动获客任务。
            </Paragraph>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)]">
            <TextArea
              variant="borderless"
              autoSize={{ minRows: 4, maxRows: 10 }}
              placeholder="描述你的目标客户画像…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="!px-4 !pt-4"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-fill-quaternary)] px-3 py-2">
              <Upload
                beforeUpload={handleUpload}
                showUploadList={false}
                maxCount={1}
              >
                <Button size="small" icon={<PaperClipOutlined />}>
                  上传文件
                </Button>
              </Upload>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                loading={isProcessing}
                disabled={!prompt.trim()}
                onClick={handleAiGenerate}
              >
                AI 生成 ICP 模型
              </Button>
            </div>
          </div>
        </ProCard>

        <ProCard
          className="h-auto"
          title={
            <span className="flex items-center gap-2">
              <BuildOutlined />
              自主结构化建模
            </span>
          }
          style={{ borderRadius: 16 }}
          styles={{ body: { padding: 20 } }}
        >
          <Paragraph type="secondary" className="!mb-4">
            逐维度定义 ICP 模型，精细控制每个筛选条件。适合专业用户深度配置。
          </Paragraph>
          <div className="mb-6 flex flex-col gap-2">
            {SECTION_CONFIGS.map((section, index) => (
              <div
                key={section.key}
                className="flex items-center gap-2 rounded-lg bg-[var(--ant-color-fill-quaternary)] px-3 py-2 text-sm"
              >
                <span className="font-medium text-[var(--ant-color-primary)]">
                  {index + 1}
                </span>
                <span>{section.title.replace(/^[一二三四五六]、/, '')}</span>
              </div>
            ))}
          </div>
          <Button
            type="primary"
            block
            size="large"
            icon={<BuildOutlined />}
            onClick={() => setIcpModalOpen(true)}
          >
            开始结构化建模
          </Button>
        </ProCard>
      </div>

      <IcpModal
        open={icpModalOpen}
        onClose={() => setIcpModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </PageContainer>
  );
};

export default IcpModelingPage;
