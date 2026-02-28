// DEFRA UK emission factors (kg CO2 per km)
export const EMISSION_FACTORS = {
  walk:  0,
  cycle: 0,
  bus:   0.089,
  taxi:  0.171,
}

// MET values for calorie calculation
const MET = {
  walk:  3.5,
  cycle: 7.5,
  bus:   1.3,
  taxi:  1.2,
}

// Average body weight in kg for estimation
const AVG_WEIGHT = 75

/**
 * Calculate CO2 saved vs taxi baseline
 * @param {string} mode - transport mode
 * @param {number} distanceKm
 */
export function calcCO2(mode, distanceKm) {
  return (EMISSION_FACTORS[mode] * distanceKm).toFixed(3)
}

export function calcCO2Saved(mode, distanceKm) {
  const taxiCO2 = EMISSION_FACTORS.taxi * distanceKm
  const modeCO2 = EMISSION_FACTORS[mode] * distanceKm
  return Math.max(0, taxiCO2 - modeCO2).toFixed(3)
}

/**
 * Calculate calories burned
 */
export function calcCalories(mode, distanceKm, weightKg = AVG_WEIGHT) {
  const speedKmh = { walk: 5, cycle: 15, bus: 25, taxi: 30 }
  const durationHours = distanceKm / speedKmh[mode]
  return Math.round(MET[mode] * weightKg * durationHours)
}

/**
 * Estimate travel time in minutes
 */
export function calcTime(mode, distanceKm) {
  const speedKmh = { walk: 5, cycle: 15, bus: 20, taxi: 30 }
  return Math.round((distanceKm / speedKmh[mode]) * 60)
}

/**
 * Estimate cost in GBP
 */
export function calcCost(mode, distanceKm) {
  const costPerKm = { walk: 0, cycle: 0, bus: 0.18, taxi: 1.5 }
  const baseFare =  { walk: 0, cycle: 0, bus: 1.20, taxi: 2.5 }
  return (baseFare[mode] + costPerKm[mode] * distanceKm).toFixed(2)
}

/**
 * Convert CO2 saved to tangible equivalents
 */
export function co2ToImpact(co2Kg) {
  return {
    plasticBottles: (co2Kg * 0.47).toFixed(1),   // bottles removed from ocean equiv
    trees:          (co2Kg / 21).toFixed(3),       // trees absorb ~21kg CO2/year
    flightPercent:  ((co2Kg / 255) * 100).toFixed(2), // LHR→JFK = ~255kg CO2
  }
}

/**
 * Calculate XP for a trip
 */
export function calcXP(mode, co2Saved) {
  const baseXP = { walk: 30, cycle: 35, bus: 20, taxi: 0 }
  const bonusXP = Math.round(parseFloat(co2Saved) * 10)
  return baseXP[mode] + bonusXP
}

/**
 * Rainy Day Score (0-100)
 * Context-aware: accounts for weather and available green options
 */
export function calcRainyDayScore({ isRaining, greenOptionsCount, hasSpike }) {
  let base = greenOptionsCount * 25  // up to 75 from options
  if (!isRaining) base += 25         // bonus 25 on clear days
  if (hasSpike) base -= 5            // slight nudge when surge active
  return Math.min(100, Math.max(0, base))
}

/**
 * Avatar level system
 */
export const LEVELS = [
  { min: 0,    max: 199,  level: 1, title: '🌱 Seedling Commuter'  },
  { min: 200,  max: 499,  level: 2, title: '🌿 Green Explorer'     },
  { min: 500,  max: 999,  level: 3, title: '🌳 Eco Warrior'        },
  { min: 1000, max: 1999, level: 4, title: '🌊 Ocean Defender'     },
  { min: 2000, max: Infinity, level: 5, title: '⚡ Green Legend'   },
]

export function getLevel(xp) {
  return LEVELS.find(l => xp >= l.min && xp < l.max) || LEVELS[0]
}

export function getXPProgress(xp) {
  const lvl = getLevel(xp)
  const range = lvl.max === Infinity ? 1000 : lvl.max - lvl.min
  const progress = xp - lvl.min
  return Math.min(100, Math.round((progress / range) * 100))
}
