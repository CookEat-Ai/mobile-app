let hasShownWheelThisSession = false;

export const hasShownWheelInSession = (): boolean => hasShownWheelThisSession;

export const markWheelShownInSession = (): void => {
  hasShownWheelThisSession = true;
};
