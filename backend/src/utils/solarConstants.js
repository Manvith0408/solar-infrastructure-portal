// Core Mathematical Constants & Sizing Utilities
// Strictly adhered to project specifications

const SOLAR_CONSTANTS = {
  // 1 kW solar array yields 4 kWh (units) of electricity per day
  SOLAR_YIELD_KWH_PER_KW_DAY: 4,

  // ₹60,000 capital cost per kW
  SYSTEM_COST_PER_KW: 60000,

  // Land requirement: 4 Acres per 1000 kW (1 MW) -> 0.004 Acres/kW
  LAND_ACRES_PER_1000_KW: 4,
  LAND_ACRES_PER_KW: 4 / 1000, // 0.004

  // Microgrid transmission and distribution loss factor
  GRID_LOSS_MULTIPLIER: 1.10, // +10% grid loss

  // PM Surya Ghar: Muft Bijli Yojana Subsidy Slabs
  // 1 kW = ₹30,000; 2 kW = ₹60,000; 3 kW and above = ₹78,000 max cap
  SUBSIDY_SLABS: {
    TIER_1: 30000, // 1 kW
    TIER_2: 60000, // 2 kW
    TIER_3_CAP: 78000 // 3 kW and above max cap
  },

  // Standard Appliance Wattages & Operating Hours Assumptions
  APPLIANCE_SPECS: {
    fan: { name: 'Ceiling Fan', watts: 75, defaultHours: 6 },
    bulb: { name: 'LED Bulb', watts: 10, defaultHours: 6 },
    tv: { name: 'Smart TV', watts: 100, defaultHours: 5 },
    fridge: { name: 'Refrigerator', watts: 200, defaultHours: 24 },
    ac: { name: 'Inverter AC', watts: 1500, defaultHours: 6 }
  }
};

/**
 * Calculate PM Surya Ghar Subsidy based on capacity in kW
 * 1 kW = ₹30,000
 * 2 kW = ₹60,000
 * 3 kW and above = ₹78,000 max cap
 */
function calculateSubsidy(kw) {
  if (!kw || kw <= 0) return 0;
  if (kw <= 1) {
    return Math.round(kw * SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_1);
  }
  if (kw <= 2) {
    return Math.round(SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_1 + (kw - 1) * (SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_2 - SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_1));
  }
  if (kw < 3) {
    return Math.round(SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_2 + (kw - 2) * (SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_3_CAP - SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_2));
  }
  return SOLAR_CONSTANTS.SUBSIDY_SLABS.TIER_3_CAP;
}

/**
 * Sizing math for Public B2C Inquiries
 * Handles both 'BILL' and 'APPLIANCES' modes
 */
function calculatePublicSystemSize(consumptionData) {
  let dailyKwh = 0;

  if (consumptionData.type === 'BILL') {
    // Value represents Monthly Bill in kWh units
    const monthlyUnits = Number(consumptionData.value) || 0;
    dailyKwh = monthlyUnits / 30;
  } else if (consumptionData.type === 'APPLIANCES') {
    // Value is an object mapping appliance key to counts { fan: 3, bulb: 5, ... }
    const counts = typeof consumptionData.value === 'object' && consumptionData.value !== null
      ? consumptionData.value
      : {};

    let totalDailyWattHours = 0;
    for (const [key, spec] of Object.entries(SOLAR_CONSTANTS.APPLIANCE_SPECS)) {
      const count = Number(counts[key]) || 0;
      totalDailyWattHours += count * spec.watts * spec.defaultHours;
    }
    dailyKwh = totalDailyWattHours / 1000;
  }

  // Minimum practical residential size is 1 kW if there is any consumption
  let calculatedKw = 0;
  if (dailyKwh > 0) {
    // Sizing: Required kW = Daily kWh / (4 kWh/day yield)
    const rawKw = dailyKwh / SOLAR_CONSTANTS.SOLAR_YIELD_KWH_PER_KW_DAY;
    // Round to 1 decimal place, minimum 1 kW if active
    calculatedKw = Math.max(1, Math.round(rawKw * 10) / 10);
  }

  const grossCost = Math.round(calculatedKw * SOLAR_CONSTANTS.SYSTEM_COST_PER_KW);
  const subsidy = calculateSubsidy(calculatedKw);
  const netCost = Math.max(0, grossCost - subsidy);

  // Recommended battery storage capacity (kWh) for residential night-load autonomy
  // Typically sized at 50% of daily consumption or 1.5x solar peak capacity
  const batteryBackupKwh = calculatedKw > 0 ? Math.round(calculatedKw * 2 * 10) / 10 : 0;

  return {
    dailyKwh: Math.round(dailyKwh * 100) / 100,
    calculatedKw,
    grossCost,
    subsidy,
    netCost,
    batteryBackupKwh
  };
}

/**
 * Microgrid and Land Constraint Math for Official Area DPR
 * Cohort data: Array of [{ type: 'APPLIANCE'|'KW', houses: Number, loadDetails: JSON }]
 */
function calculateAreaDPR(cohortData, availableLandAcres, distanceToSubstation) {
  let totalDailyKwh = 0;
  let totalHouses = 0;
  const processedCohorts = [];

  for (const cohort of (cohortData || [])) {
    const houses = Number(cohort.houses) || 0;
    totalHouses += houses;
    let cohortDailyKwh = 0;
    let cohortKwPerHouse = 0;

    if (cohort.type === 'KW') {
      // loadDetails has direct connected kW per house
      const kw = Number(cohort.loadDetails?.kw || cohort.loadDetails) || 0;
      cohortKwPerHouse = kw;
      // Daily kWh = kw * 4 kWh/day per house
      cohortDailyKwh = kw * SOLAR_CONSTANTS.SOLAR_YIELD_KWH_PER_KW_DAY * houses;
    } else {
      // Appliance mode
      const counts = cohort.loadDetails || {};
      let whPerHouse = 0;
      for (const [key, spec] of Object.entries(SOLAR_CONSTANTS.APPLIANCE_SPECS)) {
        const count = Number(counts[key]) || 0;
        whPerHouse += count * spec.watts * spec.defaultHours;
      }
      const kwhPerHouse = whPerHouse / 1000;
      cohortKwPerHouse = Math.round((kwhPerHouse / SOLAR_CONSTANTS.SOLAR_YIELD_KWH_PER_KW_DAY) * 10) / 10;
      cohortDailyKwh = kwhPerHouse * houses;
    }

    totalDailyKwh += cohortDailyKwh;
    processedCohorts.push({
      type: cohort.type,
      houses,
      loadDetails: cohort.loadDetails,
      cohortDailyKwh: Math.round(cohortDailyKwh * 10) / 10,
      cohortKwPerHouse
    });
  }

  // Base Required kW = Total Daily kWh / 4 units
  const baseRequiredKw = totalDailyKwh / SOLAR_CONSTANTS.SOLAR_YIELD_KWH_PER_KW_DAY;

  // Apply +10% grid transmission & distribution loss
  const totalRequiredKw = Math.round(baseRequiredKw * SOLAR_CONSTANTS.GRID_LOSS_MULTIPLIER * 10) / 10;

  // Land Check: 1000 kW requires 4 Acres (0.004 Acres per kW)
  const requiredLandAcres = Math.round((totalRequiredKw * SOLAR_CONSTANTS.LAND_ACRES_PER_KW) * 100) / 100;
  const landFeasible = Number(availableLandAcres || 0) >= requiredLandAcres;

  // Budget calculations
  // Base solar system cost: ₹60,000 / kW
  const solarBudget = Math.round(totalRequiredKw * SOLAR_CONSTANTS.SYSTEM_COST_PER_KW);

  // Substation transmission intertie line estimate: ~₹1,50,000 per km
  const distanceKm = Number(distanceToSubstation || 0);
  const transmissionLineCost = Math.round(distanceKm * 150000);

  const totalEstimatedBudget = solarBudget + transmissionLineCost;

  return {
    totalHouses,
    totalDailyKwh: Math.round(totalDailyKwh * 10) / 10,
    baseRequiredKw: Math.round(baseRequiredKw * 10) / 10,
    totalRequiredKw,
    requiredLandAcres,
    availableLandAcres: Number(availableLandAcres || 0),
    landFeasible,
    solarBudget,
    transmissionLineCost,
    totalEstimatedBudget,
    distanceToSubstation: distanceKm,
    processedCohorts
  };
}

module.exports = {
  SOLAR_CONSTANTS,
  calculateSubsidy,
  calculatePublicSystemSize,
  calculateAreaDPR
};
