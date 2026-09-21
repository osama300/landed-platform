import deals from '@/data/deals.json';

export const DEALS = deals;
export const dealSaving = (d) => d.marketPrice - d.dealPrice;
export const dealPercent = (d) => Math.round((dealSaving(d) / d.marketPrice) * 100);
export const dealsByClosing = (list = deals) => [...list].sort((a, b) => a.closesInHours - b.closesInHours);
