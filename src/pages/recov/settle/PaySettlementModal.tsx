import { Button, Form, InputNumber, Modal } from 'antd';
import { useEffect } from 'react';
import { formatCurrencyDisplay } from './_shared';

export type PaySettlementForm = {
  id: number;
  period: string;
  serviceFee: number;
  paidServiceFee: number;
  unpaidServiceFee: number;
  paidAmount: number;
};

export type PaySettlementModalProps = {
  open: boolean;
  loading: boolean;
  initial: PaySettlementForm | null;
  onCancel: () => void;
  onSubmit: (paidAmount: number) => void;
};

const PaySettlementModal = ({
  open,
  loading,
  initial,
  onCancel,
  onSubmit,
}: PaySettlementModalProps) => {
  const [form] = Form.useForm<{ paidAmount: number }>();

  useEffect(() => {
    if (open && initial) {
      form.setFieldsValue({ paidAmount: initial.paidAmount });
    }
  }, [open, initial, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values.paidAmount);
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title="录入缴费"
      open={open}
      width={500}
      destroyOnHidden
      mask={{ closable: false }}
      onCancel={onCancel}
      footer={
        <div className="flex justify-end gap-3 px-4 pb-4">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleOk}>
            确认缴费
          </Button>
        </div>
      }
    >
      {initial ? (
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 8 }}
          className="px-4"
        >
          <Form.Item label="结算周期">
            <span className="text-sm font-medium text-gray-700">
              {initial.period}
            </span>
          </Form.Item>
          <Form.Item label="本期服务费">
            <span className="text-sm font-bold text-indigo-600">
              {formatCurrencyDisplay(initial.serviceFee)}
            </span>
          </Form.Item>
          <Form.Item label="已付服务费">
            <span className="text-sm font-bold text-emerald-600">
              {formatCurrencyDisplay(initial.paidServiceFee)}
            </span>
          </Form.Item>
          <Form.Item label="未付服务费">
            <span className="text-sm font-bold text-red-600">
              {formatCurrencyDisplay(initial.unpaidServiceFee)}
            </span>
          </Form.Item>
          <Form.Item
            label="本次缴费金额"
            name="paidAmount"
            rules={[{ required: true, message: '请输入缴费金额' }]}
          >
            <InputNumber
              className="!w-full"
              min={0.01}
              max={initial.unpaidServiceFee}
              precision={2}
              step={100}
            />
          </Form.Item>
        </Form>
      ) : null}
    </Modal>
  );
};

export default PaySettlementModal;
