const campaignCodePattern = /^[A-Z]{4}$/;

export const isCampaignScopedPath = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1) return campaignCodePattern.test(segments[0]);
  return segments.length === 2
    && ["boards", "leaderboards", "moderate"].includes(segments[0])
    && campaignCodePattern.test(segments[1]);
};