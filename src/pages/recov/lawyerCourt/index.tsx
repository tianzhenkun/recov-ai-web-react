import { ProCard } from '@ant-design/pro-components';
import { Result } from 'antd';
import {
  RecovListPage,
  RecovListStack,
} from '@/pages/recov/components/RecovListLayout';
import { PAGE_TITLE } from './_shared';

const placeholderCardStyles = {
  body: {
    minHeight: 420,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const LawyerCourtPage = () => (
  <RecovListPage title={PAGE_TITLE}>
    <RecovListStack>
      <ProCard styles={placeholderCardStyles}>
        <Result
          status="info"
          title="暂未实现"
          subTitle="该模块暂未开放，请稍后再试。"
        />
      </ProCard>
    </RecovListStack>
  </RecovListPage>
);

export default LawyerCourtPage;
