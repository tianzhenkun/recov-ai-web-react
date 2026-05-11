type MessageApi = {
  error: (content: string) => unknown;
};

let ruoyiMessage: MessageApi | undefined;

export const setRuoyiMessage = (messageApi: MessageApi) => {
  ruoyiMessage = messageApi;
};

export const showRuoyiError = (content: string) => {
  if (!ruoyiMessage) {
    console.error(content);
    return;
  }

  ruoyiMessage.error(content);
};
