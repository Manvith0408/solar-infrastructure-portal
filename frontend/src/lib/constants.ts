// API URL configured for deployed Render backend (NEXT_PUBLIC_API_URL)
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;

export const SOLAR_CONSTANTS = {
  SOLAR_YIELD_KWH_PER_KW_DAY: 4,
  SYSTEM_COST_PER_KW: 60000,
  LAND_ACRES_PER_1000_KW: 4,
  LAND_ACRES_PER_KW: 4 / 1000, // 0.004
  GRID_LOSS_MULTIPLIER: 1.10, // +10%

  SUBSIDY_SLABS: {
    TIER_1: 30000, // 1 kW
    TIER_2: 60000, // 2 kW
    TIER_3_CAP: 78000 // 3 kW and above max cap
  },

  APPLIANCE_SPECS: {
    fan: { name: 'Ceiling Fan', watts: 75, defaultHours: 10, icon: 'Fan' },
    bulb: { name: 'LED Bulb', watts: 10, defaultHours: 6, icon: 'Lightbulb' },
    tv: { name: 'Smart TV', watts: 100, defaultHours: 5, icon: 'Tv' },
    fridge: { name: 'Refrigerator', watts: 200, defaultHours: 12, icon: 'Refrigerator' },
    ac: { name: 'Inverter AC', watts: 1500, defaultHours: 6, icon: 'AirVent' }
  }
} as const;

export function calculateClientSubsidy(kw: number): number {
  if (!kw || kw <= 0) return 0;
  if (kw <= 1) {
    return Math.round(kw * SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_1);
  }
  if (kw <= 2) {
    return Math.round(
      SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_1 +
        (kw - 1) * (SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_2 - SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_1)
    );
  }
  if (kw < 3) {
    return Math.round(
      SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_2 +
        (kw - 2) * (SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_3_CAP - SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_2)
    );
  }
  return SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_3_CAP;
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}
