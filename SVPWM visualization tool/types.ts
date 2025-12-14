export enum SwitchState {
  P = 'P', // Positive rail (+Vdc/2)
  O = 'O', // Neutral point (0)
  N = 'N'  // Negative rail (-Vdc/2)
}

export interface SevenSegmentSequence {
  times: number[];
  statesA: SwitchState[];
  statesB: SwitchState[];
  statesC: SwitchState[];
}

export interface SVPWMCalculationResult {
  majorSector: number;
  minorSector: number;
  Ta: number;
  Tb: number;
  Tc: number;
  sequence: SevenSegmentSequence;
  valpha: number;
  vbeta: number;
  vref: number;
}