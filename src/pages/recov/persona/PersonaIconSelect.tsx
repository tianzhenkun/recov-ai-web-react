import type { SelectProps } from 'antd';
import { Select, Space } from 'antd';

export const PERSONA_PROFILE_ICON_NAMES = [
  'circle',
  'flash',
  'mark',
  'message',
  'protect',
  'room',
  'skeleton',
  'smile',
  'time',
  'user',
] as const;

export const personaProfileIconSrc = (iconName: string) =>
  iconName ? `/icons/svg-profile/${iconName}.svg` : '';

export type PersonaIconSelectProps = Omit<
  SelectProps<string>,
  'options' | 'mode'
>;

const PersonaIconSelect = (props: PersonaIconSelectProps) => (
  <Select<string>
    allowClear
    showSearch
    placeholder="请选择图标标识"
    optionFilterProp="value"
    options={PERSONA_PROFILE_ICON_NAMES.map((name) => ({
      value: name,
      label: (
        <Space size={8}>
          <img
            alt=""
            src={personaProfileIconSrc(name)}
            width={20}
            height={20}
          />
          <span>{name}</span>
        </Space>
      ),
    }))}
    {...props}
  />
);

export default PersonaIconSelect;
