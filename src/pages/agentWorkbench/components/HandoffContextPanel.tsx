import { Empty, Tag, Typography } from 'antd';
import * as React from 'react';
import type { HandoffDto } from '@/services/ruoyi/agent-console';
import './HandoffContextPanel.css';

const { Paragraph, Text } = Typography;

const sceneLabels: Record<string, string> = {
  intro_contract: '合同审核',
  intro_document: '跨境文书',
  intro_overseas: '海外获客',
  intro_geo: 'GEO',
};

const HandoffContextPanel = ({ handoff }: { handoff?: HandoffDto }) => {
  if (!handoff) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="转人工请求到达后显示业务上下文"
      />
    );
  }

  return (
    <div className="agent-handoff-context">
      <div className="agent-handoff-customer">
        <Text strong>{handoff.masked_customer_name || '客户'}</Text>
        <Text type="secondary">
          {handoff.masked_contact || '联系方式已脱敏'}
        </Text>
        <Tag>{sceneLabels[handoff.scene_code] || handoff.scene_code}</Tag>
      </div>

      <section>
        <Text className="agent-handoff-section-title" strong>
          交接摘要
        </Text>
        <Paragraph>
          {handoff.handoff_summary || handoff.request_message || '摘要生成中'}
        </Paragraph>
      </section>

      <section>
        <Text className="agent-handoff-section-title" strong>
          待处理事项
        </Text>
        {handoff.pending_items?.length ? (
          <ul className="agent-handoff-list">
            {handoff.pending_items.map((item) => (
              <li key={item.text}>{item.text}</li>
            ))}
          </ul>
        ) : (
          <Text type="secondary">暂无明确待处理事项</Text>
        )}
      </section>

      <section>
        <Text className="agent-handoff-section-title" strong>
          最近对话
        </Text>
        {handoff.recent_dialogue?.length ? (
          <div className="agent-handoff-dialogue-list">
            {handoff.recent_dialogue.slice(-6).map((item, index) => (
              <div key={item.id || `${item.speaker_type}-${index}`}>
                <Text type="secondary">
                  {item.speaker_type === 'customer' ? '客户' : 'AI'}：
                </Text>
                <Text>{item.text}</Text>
              </div>
            ))}
          </div>
        ) : (
          <Text type="secondary">暂无对话记录</Text>
        )}
      </section>

      <section className="agent-handoff-business">
        <Text className="agent-handoff-section-title" strong>
          业务资料
        </Text>
        <div>
          <Text type="secondary">转人工原因：</Text>
          {handoff.request_reason || '-'}
        </div>
        <div>
          <Text type="secondary">业务来源：</Text>
          {handoff.request_source || '-'}
        </div>
        <div>
          <Text type="secondary">通话编号：</Text>
          {handoff.call_id}
        </div>
      </section>
    </div>
  );
};

export default HandoffContextPanel;
