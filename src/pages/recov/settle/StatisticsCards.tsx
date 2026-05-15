import {
  BarChartOutlined,
  FieldTimeOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ServiceFeeStatistics } from '@/services/ruoyi/settle';
import { formatCurrencyDisplay } from './_shared';

export type StatisticsCardType = 'unpaid' | 'currentWeek' | 'difference';

export type StatisticsCardsProps = {
  statistics: ServiceFeeStatistics;
  onCardClick: (type: StatisticsCardType) => void;
};

const StatisticsCards = ({ statistics, onCardClick }: StatisticsCardsProps) => {
  return (
    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      <button
        type="button"
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        onClick={() => onCardClick('unpaid')}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="mb-1 text-xs font-medium tracking-wider text-gray-500">
              未支付服务费总计
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-gray-900">
              {formatCurrencyDisplay(statistics.unpaidServiceFeeTotal)}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 transition-transform group-hover:scale-110">
            <WalletOutlined className="text-2xl text-indigo-600" />
          </div>
        </div>
        <div className="relative z-10 mt-4 flex items-center gap-1.5 text-[11px] font-medium text-indigo-500">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
          点击查看详情
        </div>
        <div
          className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150"
          style={{
            background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)',
          }}
          aria-hidden
        />
      </button>

      <button
        type="button"
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        onClick={() => onCardClick('currentWeek')}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="mb-1 text-xs font-medium tracking-wider text-gray-500">
              本周已产生服务费
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-gray-900">
              {formatCurrencyDisplay(statistics.currentWeekServiceFee)}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 transition-transform group-hover:scale-110">
            <BarChartOutlined className="text-2xl text-emerald-500" />
          </div>
        </div>
        <div className="relative z-10 mt-4 flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-500">
            本周回款
          </span>
          <span className="text-[11px] font-bold text-gray-900">
            {formatCurrencyDisplay(statistics.currentWeekRepayment)}
          </span>
        </div>
        <div
          className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150"
          style={{
            background: 'radial-gradient(circle, #10B981 0%, transparent 70%)',
          }}
          aria-hidden
        />
      </button>

      <button
        type="button"
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        onClick={() => onCardClick('difference')}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="text-xs font-medium tracking-wider text-gray-500">
            已处理对账差异汇总
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 transition-transform group-hover:scale-110">
            <FieldTimeOutlined className="text-2xl text-amber-500" />
          </div>
        </div>
        <div className="relative z-10 mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500">
              差异金额
            </span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrencyDisplay(statistics.processedDifferenceAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500">
              服务费
            </span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrencyDisplay(statistics.processedDifferenceServiceFee)}
            </span>
          </div>
        </div>
        <div
          className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150"
          style={{
            background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)',
          }}
          aria-hidden
        />
      </button>
    </div>
  );
};

export default StatisticsCards;
