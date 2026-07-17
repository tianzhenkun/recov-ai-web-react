import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => ({
  profileCard: {
    minHeight: 520,
    textAlign: 'center',
    '.ant-card-body': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
  identity: {
    textAlign: 'center',
  },
  name: {
    margin: 0,
    color: token.colorTextHeading,
  },
  descriptions: {
    marginTop: 32,
    textAlign: 'left',
    '.ant-descriptions-item-label': {
      width: 108,
      color: token.colorTextSecondary,
    },
  },
  form: {
    maxWidth: 560,
    paddingTop: 8,
  },
}));

export default useStyles;
