export const loadFlowEventExtension = async () => {
  const module = await import('./FlowEventExtension');
  return { default: module.FlowEventExtension };
};
