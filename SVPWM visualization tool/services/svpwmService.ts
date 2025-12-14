import {
  PI_DIV_3,
  PI_DIV_6,
  SQRT_3,
  SQRT_3_DIV_3,
  SQRT_3_DIV_6,
  TWO_PI,
} from '../constants';
import { SwitchState, SVPWMCalculationResult, SevenSegmentSequence } from '../types';

// Helper to set 7-segment times (Strictly based on C macro SET_7SEG_TIME)
const calculateTimeSequence = (T1: number, T2: number, T3: number, Ts: number): number[] => {
  // Sequence: T1/4, T2/2, T3/2, T1/2, T3/2, T2/2, T1/4
  // Sum = T1 + T2 + T3 = Ts (Ideally)
  return [
    T1 * 0.25,
    T2 * 0.5,
    T3 * 0.5,
    T1 * 0.5,
    T3 * 0.5,
    T2 * 0.5,
    T1 * 0.25
  ];
};

// Helper to set 7-segment states
const calculateStateSequence = (
  s0: SwitchState, s1: SwitchState, s2: SwitchState, s3: SwitchState, 
  s4: SwitchState, s5: SwitchState, s6: SwitchState
): SwitchState[] => {
  return [s0, s1, s2, s3, s4, s5, s6];
};

// ... existing allocateTimeAndState function ...
const allocateTimeAndState = (
  major: number, minor: number, 
  Ta: number, Tb: number, Tc: number, 
  Ts: number
): SevenSegmentSequence => {
  let times: number[] = [];
  let statesA: SwitchState[] = [];
  let statesB: SwitchState[] = [];
  let statesC: SwitchState[] = [];

  const P = SwitchState.P;
  const O = SwitchState.O;
  const N = SwitchState.N;

  // The switch-case logic below matches THREE_LEVEL_SVPWM_TimeState_Allocation_TimeAndState exactly
  switch (major) {
    case 1: // Sector I
      switch (minor) {
        case 1:
          times = calculateTimeSequence(Tc, Ta, Tb, Ts);
          statesA = calculateStateSequence(O, O, O, P, O, O, O);
          statesB = calculateStateSequence(N, O, O, O, O, O, N);
          statesC = calculateStateSequence(N, N, O, O, O, N, N);
          break;
        case 2:
          times = calculateTimeSequence(Ta, Tb, Tc, Ts);
          statesA = calculateStateSequence(O, O, P, P, P, O, O);
          statesB = calculateStateSequence(O, O, O, P, O, O, O);
          statesC = calculateStateSequence(N, O, O, O, O, O, N);
          break;
        case 3:
          times = calculateTimeSequence(Ta, Tc, Tb, Ts);
          statesA = calculateStateSequence(O, O, P, P, P, O, O);
          statesB = calculateStateSequence(N, O, O, O, O, O, N);
          statesC = calculateStateSequence(N, N, N, O, N, N, N);
          break;
        case 4:
          times = calculateTimeSequence(Tc, Tb, Ta, Ts);
          statesA = calculateStateSequence(O, P, P, P, P, P, O);
          statesB = calculateStateSequence(O, O, O, P, O, O, O);
          statesC = calculateStateSequence(N, N, O, O, O, N, N);
          break;
        case 5:
          times = calculateTimeSequence(Tb, Tc, Ta, Ts);
          statesA = calculateStateSequence(O, P, P, P, P, P, O);
          statesB = calculateStateSequence(N, N, O, O, O, N, N);
          statesC = calculateStateSequence(N, N, N, O, N, N, N);
          break;
        case 6:
          times = calculateTimeSequence(Tb, Tc, Ta, Ts);
          statesA = calculateStateSequence(O, P, P, P, P, P, O);
          statesB = calculateStateSequence(O, O, P, P, P, O, O);
          statesC = calculateStateSequence(N, N, N, O, N, N, N);
          break;
      }
      break;

    case 2: // Sector II
      switch (minor) {
        case 1:
          times = calculateTimeSequence(Tc, Tb, Ta, Ts);
          statesA = calculateStateSequence(O, O, O, P, O, O, O);
          statesB = calculateStateSequence(O, O, P, P, P, O, O);
          statesC = calculateStateSequence(N, O, O, O, O, O, N);
          break;
        case 2:
          times = calculateTimeSequence(Ta, Tc, Tb, Ts);
          statesA = calculateStateSequence(N, O, O, O, O, O, N);
          statesB = calculateStateSequence(O, O, O, P, O, O, O);
          statesC = calculateStateSequence(N, N, O, O, O, N, N);
          break;
        case 3:
          times = calculateTimeSequence(Ta, Tb, Tc, Ts);
          statesA = calculateStateSequence(O, O, O, P, O, O, O);
          statesB = calculateStateSequence(O, P, P, P, P, P, O);
          statesC = calculateStateSequence(N, N, O, O, O, N, N);
          break;
        case 4:
          times = calculateTimeSequence(Tc, Ta, Tb, Ts);
          statesA = calculateStateSequence(N, O, O, O, O, O, N);
          statesB = calculateStateSequence(O, O, P, P, P, O, O);
          statesC = calculateStateSequence(N, N, N, O, N, N, N);
          break;
        case 5:
          times = calculateTimeSequence(Tb, Ta, Tc, Ts);
          statesA = calculateStateSequence(O, O, P, P, P, O, O);
          statesB = calculateStateSequence(O, P, P, P, P, P, O);
          statesC = calculateStateSequence(N, N, N, O, N, N, N);
          break;
        case 6:
          times = calculateTimeSequence(Tb, Ta, Tc, Ts);
          statesA = calculateStateSequence(N, N, O, O, O, N, N);
          statesB = calculateStateSequence(O, P, P, P, P, P, O);
          statesC = calculateStateSequence(N, N, N, O, N, N, N);
          break;
      }
      break;

    case 3: // Sector III
      switch (minor) {
        case 1:
          times = calculateTimeSequence(Tc, Ta, Tb, Ts);
          statesA = calculateStateSequence(N, N, O, O, O, N, N);
          statesB = calculateStateSequence(O, O, O, P, O, O, O);
          statesC = calculateStateSequence(N, O, O, O, O, O, N);
          break;
        case 2:
          times = calculateTimeSequence(Ta, Tb, Tc, Ts);
          statesA = calculateStateSequence(N, O, O, O, O, O, N);
          statesB = calculateStateSequence(O, O, P, P, P, O, O);
          statesC = calculateStateSequence(O, O, O, P, O, O, O);
          break;
        case 3:
          times = calculateTimeSequence(Ta, Tc, Tb, Ts);
          statesA = calculateStateSequence(N, N, N, O, N, N, N);
          statesB = calculateStateSequence(O, O, P, P, P, O, O);
          statesC = calculateStateSequence(N, O, O, O, O, O, N);
          break;
        case 4:
          times = calculateTimeSequence(Tc, Tb, Ta, Ts);
          statesA = calculateStateSequence(N, N, O, O, O, N, N);
          statesB = calculateStateSequence(O, P, P, P, P, P, O);
          statesC = calculateStateSequence(O, O, O, P, O, O, O);
          break;
        case 5:
          times = calculateTimeSequence(Tb, Tc, Ta, Ts);
          statesA = calculateStateSequence(N, N, N, O, N, N, N);
          statesB = calculateStateSequence(O, P, P, P, P, P, O);
          statesC = calculateStateSequence(N, N, O, O, O, N, N);
          break;
        case 6:
          times = calculateTimeSequence(Tb, Tc, Ta, Ts);
          statesA = calculateStateSequence(N, N, N, O, N, N, N);
          statesB = calculateStateSequence(O, P, P, P, P, P, O);
          statesC = calculateStateSequence(O, O, P, P, P, O, O);
          break;
      }
      break;

    case 4: // Sector IV
      switch (minor) {
        case 1:
          times = calculateTimeSequence(Tc, Tb, Ta, Ts);
          statesA = calculateStateSequence(N, O, O, O, O, O, N);
          statesB = calculateStateSequence(O, O, O, P, O, O, O);
          statesC = calculateStateSequence(O, O, P, P, P, O, O);
          break;
        case 2:
          times = calculateTimeSequence(Ta, Tc, Tb, Ts);
          statesA = calculateStateSequence(N, N, O, O, O, N, N);
          statesB = calculateStateSequence(N, O, O, O, O, O, N);
          statesC = calculateStateSequence(O, O, O, P, O, O, O);
          break;
        case 3:
          times = calculateTimeSequence(Ta, Tb, Tc, Ts);
          statesA = calculateStateSequence(N, N, O, O, O, N, N);
          statesB = calculateStateSequence(O, O, O, P, O, O, O);
          statesC = calculateStateSequence(O, P, P, P, P, P, O);
          break;
        case 4:
          times = calculateTimeSequence(Tc, Ta, Tb, Ts);
          statesA = calculateStateSequence(N, N, N, O, N, N, N);
          statesB = calculateStateSequence(N, O, O, O, O, O, N);
          statesC = calculateStateSequence(O, O, P, P, P, O, O);
          break;
        case 5:
          times = calculateTimeSequence(Tb, Ta, Tc, Ts);
          statesA = calculateStateSequence(N, N, N, O, N, N, N);
          statesB = calculateStateSequence(O, O, P, P, P, O, O);
          statesC = calculateStateSequence(O, P, P, P, P, P, O);
          break;
        case 6:
          times = calculateTimeSequence(Tb, Ta, Tc, Ts);
          statesA = calculateStateSequence(N, N, N, O, N, N, N);
          statesB = calculateStateSequence(N, N, O, O, O, N, N);
          statesC = calculateStateSequence(O, P, P, P, P, P, O);
          break;
      }
      break;

    case 5: // Sector V
      switch (minor) {
        case 1:
          times = calculateTimeSequence(Tc, Ta, Tb, Ts);
          statesA = calculateStateSequence(N, O, O, O, O, O, N);
          statesB = calculateStateSequence(N, N, O, O, O, N, N);
          statesC = calculateStateSequence(O, O, O, P, O, O, O);
          break;
        case 2:
          times = calculateTimeSequence(Ta, Tb, Tc, Ts);
          statesA = calculateStateSequence(O, O, O, P, O, O, O);
          statesB = calculateStateSequence(N, O, O, O, O, O, N);
          statesC = calculateStateSequence(O, O, P, P, P, O, O);
          break;
        case 3:
          times = calculateTimeSequence(Ta, Tc, Tb, Ts);
          statesA = calculateStateSequence(N, O, O, O, O, O, N);
          statesB = calculateStateSequence(N, N, N, O, N, N, N);
          statesC = calculateStateSequence(O, O, P, P, P, O, O);
          break;
        case 4:
          times = calculateTimeSequence(Tc, Tb, Ta, Ts);
          statesA = calculateStateSequence(O, O, O, P, O, O, O);
          statesB = calculateStateSequence(N, N, O, O, O, N, N);
          statesC = calculateStateSequence(O, P, P, P, P, P, O);
          break;
        case 5:
          times = calculateTimeSequence(Tb, Tc, Ta, Ts);
          statesA = calculateStateSequence(N, N, O, O, O, N, N);
          statesB = calculateStateSequence(N, N, N, O, N, N, N);
          statesC = calculateStateSequence(O, P, P, P, P, P, O);
          break;
        case 6:
          times = calculateTimeSequence(Tb, Tc, Ta, Ts);
          statesA = calculateStateSequence(O, O, P, P, P, O, O);
          statesB = calculateStateSequence(N, N, N, O, N, N, N);
          statesC = calculateStateSequence(O, P, P, P, P, P, O);
          break;
      }
      break;

    case 6: // Sector VI
      switch (minor) {
        case 1:
          times = calculateTimeSequence(Tc, Tb, Ta, Ts);
          statesA = calculateStateSequence(O, O, P, P, P, O, O);
          statesB = calculateStateSequence(N, O, O, O, O, O, N);
          statesC = calculateStateSequence(O, O, O, P, O, O, O);
          break;
        case 2:
          times = calculateTimeSequence(Ta, Tc, Tb, Ts);
          statesA = calculateStateSequence(O, O, O, P, O, O, O);
          statesB = calculateStateSequence(N, N, O, O, O, N, N);
          statesC = calculateStateSequence(N, O, O, O, O, O, N);
          break;
        case 3:
          times = calculateTimeSequence(Ta, Tb, Tc, Ts);
          statesA = calculateStateSequence(O, P, P, P, P, P, O);
          statesB = calculateStateSequence(N, N, O, O, O, N, N);
          statesC = calculateStateSequence(O, O, O, P, O, O, O);
          break;
        case 4:
          times = calculateTimeSequence(Tc, Ta, Tb, Ts);
          statesA = calculateStateSequence(O, O, P, P, P, O, O);
          statesB = calculateStateSequence(N, N, N, O, N, N, N);
          statesC = calculateStateSequence(N, O, O, O, O, O, N);
          break;
        case 5:
          times = calculateTimeSequence(Tb, Ta, Tc, Ts);
          statesA = calculateStateSequence(O, P, P, P, P, P, O);
          statesB = calculateStateSequence(N, N, N, O, N, N, N);
          statesC = calculateStateSequence(O, O, P, P, P, O, O);
          break;
        case 6:
          times = calculateTimeSequence(Tb, Ta, Tc, Ts);
          statesA = calculateStateSequence(O, P, P, P, P, P, O);
          statesB = calculateStateSequence(N, N, N, O, N, N, N);
          statesC = calculateStateSequence(N, N, O, O, O, N, N);
          break;
      }
      break;
  }

  return { times, statesA, statesB, statesC };
};

/**
 * Main SVPWM Process Function
 * Matches logic from THREE_LEVEL_SVPWM_PROCESS
 */
export const calculateSVPWM = (m: number, angleRad: number, Ts: number): SVPWMCalculationResult => {
  // 1. Angle Normalization
  const epsilon = 0.000001;
  let effectiveAngle = angleRad;
  while (effectiveAngle >= TWO_PI - epsilon) effectiveAngle -= TWO_PI;
  while (effectiveAngle < 0) effectiveAngle += TWO_PI;

  const Vref_pu = m / SQRT_3;

  // 2. Major Sector Calculation
  // C logic: (angle_pu_q15 + d2r60pu_q15 - 1) / d2r60pu_q15
  // Equivalent JS: Floor(Angle / 60deg) + 1
  let majorSector = Math.floor(effectiveAngle / PI_DIV_3) + 1;
  if (majorSector > 6) majorSector = 6;
  if (majorSector < 1) majorSector = 1; 

  // 3. Local Angle Calculation (angle_in_sector1)
  // This transforms the global angle to the 0-60 degree range relative to the sector start
  const angle_in_sector1 = effectiveAngle - (majorSector - 1) * PI_DIV_3;

  // 4. Alpha/Beta Calculation for Sector Determination (LOCAL FRAME)
  // CRITICAL: We calculate these rotated to Sector 1 purely for the geometric classification logic
  // in step 5. We rename them to _local to distinguish from the global output values.
  const Valpha_local = Vref_pu * Math.cos(angle_in_sector1);
  const Vbeta_local = Vref_pu * Math.sin(angle_in_sector1);

  let minorSector = 0;

  // 5. Minor Sector Logic (Triangle identification)
  // Based on the geometric partition of the 60-degree sector
  if (angle_in_sector1 <= PI_DIV_6) {
    // 0 to 30 degrees
    const boundaryCondition1 = -(SQRT_3) * Valpha_local + SQRT_3_DIV_3;
    const boundaryCondition2 = (SQRT_3) * Valpha_local - SQRT_3_DIV_3;

    // Check Vbeta against the lines defining the inner triangles
    if (Vbeta_local <= boundaryCondition1) {
      minorSector = 1; // Small triangle near origin
    } else if (Vbeta_local <= boundaryCondition2) {
      minorSector = 5; // Top-left of the diamond
    } else {
      minorSector = 3; // Middle diamond part
    }
  } else {
    // 30 to 60 degrees
    const boundaryCondition1 = -(SQRT_3) * Valpha_local + SQRT_3_DIV_3;
    
    if (Vbeta_local <= boundaryCondition1) {
      minorSector = 2; // Small triangle near origin (right side)
    } else if (Vbeta_local >= SQRT_3_DIV_6) {
      minorSector = 6; // Top-right tip
    } else {
      minorSector = 4; // Middle diamond part
    }
  }

  // 6. Time Calculation (Ta, Tb, Tc)
  // These formulas are coupled to the geometry. Since we determined MinorSector
  // using the correct rotated Valpha/Vbeta, these time calculations will yield positive results.
  let Ta = 0, Tb = 0, Tc = 0;
  
  const sin_theta = Math.sin(angle_in_sector1);
  const sin_60_plus = Math.sin(PI_DIV_3 + angle_in_sector1);
  const sin_60_minus = Math.sin(PI_DIV_3 - angle_in_sector1);

  switch (minorSector) {
    case 1:
    case 2:
      Ta = 2 * m * Ts * sin_theta;
      Tb = Ts - 2 * m * Ts * sin_60_plus;
      Tc = 2 * m * Ts * sin_60_minus;
      break;

    case 3:
    case 4:
      Ta = Ts - 2 * m * Ts * sin_theta;
      Tb = -Ts + 2 * m * Ts * sin_60_plus;
      Tc = Ts - 2 * m * Ts * sin_60_minus;
      break;

    case 5:
      Ta = 2 * m * Ts * sin_theta;
      Tb = 2 * Ts - 2 * m * Ts * sin_60_plus;
      Tc = -Ts + 2 * m * Ts * sin_60_minus;
      break;

    case 6:
      Ta = -Ts + 2 * m * Ts * sin_theta;
      Tb = 2 * Ts - 2 * m * Ts * sin_60_plus;
      Tc = 2 * m * Ts * sin_60_minus;
      break;
  }

  // 7. Allocation (Mapping times/states to phases based on Major Sector)
  const sequence = allocateTimeAndState(majorSector, minorSector, Ta, Tb, Tc, Ts);

  // 8. Global Values for Display
  // These are calculated using the effective global angle (0-2pi), representing the stationary frame.
  const Valpha_global = Vref_pu * Math.cos(effectiveAngle);
  const Vbeta_global = Vref_pu * Math.sin(effectiveAngle);

  return {
    majorSector,
    minorSector,
    Ta,
    Tb,
    Tc,
    sequence,
    valpha: Valpha_global,
    vbeta: Vbeta_global,
    vref: Vref_pu
  };
};