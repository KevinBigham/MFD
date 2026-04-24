import type { SnapManagement } from './snap-counts';

export interface AIBiasConfig {
  faAggression?: number;
  extensionAggression?: number;
  tradeWillingness?: number;
  udfaReliance?: number;
  fireCoachEverySeason?: boolean;
  snapManagement?: SnapManagement;
  fatigueIgnore?: boolean;
  advanceOnly?: boolean;
}
