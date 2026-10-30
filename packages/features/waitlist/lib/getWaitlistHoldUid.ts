// Waitlist holds use their own uid so the booker's normal slot reservation (keyed by the `uid` cookie)
// can neither shorten nor delete them
export const getWaitlistHoldUid = (entryUid: string) => `waitlist:${entryUid}`;
