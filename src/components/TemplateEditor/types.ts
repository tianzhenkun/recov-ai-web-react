export type TemplateOutputType = 'html' | 'text';

export interface TemplateVariable {
  label: string;
  value: string;
}

export interface TemplateEditorFeatures {
  textStyle?: boolean;
  color?: boolean;
  align?: boolean;
  variable?: boolean;
  /** 字体（依赖 TextStyle + FontFamily） */
  fontFamily?: boolean;
  /** 字号 px（依赖 TextStyle + FontSize） */
  fontSize?: boolean;
}

export interface TemplateSelectOption {
  label: string;
  value: string;
}
