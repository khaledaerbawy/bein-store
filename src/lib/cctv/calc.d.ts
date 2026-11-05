type CameraGroup = {
  name: string;
  qty: number;
  resolution: string;
  codec: string;
  quality: string;
  fps: number;
  nightFps: string;
  scene: string;
  mode: string;
  hours: number;
  nightIR: boolean;
  audio: boolean;
  measuredMbps: string;
  switch: string;
  poeW: string | number;
  target: string;
  recorder: string;
  sdGB: string;
  preset: string;
};

type RecorderConfig = {
  id: string;
  name: string;
  diskTB: number;
  raid: string;
  bays: string | number;
  inboundMbps: string | number;
  arrayMode: string;
  existingDisks: string | number;
};

type PlannerProject = {
  name: string;
  retentionDays: number;
  headroom: number;
  nightHours: number;
  evidential: boolean;
  archive: { enabled: boolean; hotDays: string };
  internetUploadMbps: string;
  method: string;
  compressionRatios: Record<string, number>;
  liveStreams: number;
  liveStreamType: string;
  playbackStreams: number;
  viewingLinkMbps: string;
  switches: Array<{ id: string; name: string; uplinkMbps: number; poeBudgetW: number }>;
  recorders: RecorderConfig[];
};

type CalculatorArray = {
  totalDisks: number;
  raidLabel: string;
  usableTB: number;
  usableTiB: number;
  dataDisks: number;
  parityDisks: number;
  spareDisks: number;
};

type CalculatorGroupResult = {
  qty: number;
  mbps: number;
  estimatedMbps: number;
  aggregateMbps: number;
  gbPerDayPerCam: number;
  gbPerDay: number;
  totalPoeW: number;
  estimatedPoeW: number;
};

type CalculatorRecorderResult = RecorderConfig & {
  array: CalculatorArray;
  expectedRetentionDays: number;
  requiredTB: number;
  rawTB: number;
  aggregateMbps: number;
  minRecorderMbps: number;
};

type CalculatorResult = {
  rows: CalculatorGroupResult[];
  totals: {
    cameras: number;
    gbPerDay: number;
    rawTB: number;
    requiredTB: number;
    aggregateMbps: number;
    minRecorderMbps: number;
    expectedRetentionDays: number;
  };
  recorders: CalculatorRecorderResult[];
  checks: Array<{ level: "ok" | "info" | "warn" | "critical"; text: string }>;
  status: string;
};

declare const StorageCalc: {
  RESOLUTIONS: Array<{ id: string; label: string; coax?: boolean }>;
  CODECS: Array<{ id: string; label: string; factor: number; smart?: boolean }>;
  RAID_LEVELS: Array<{ id: string; label: string; parity: number | null; minDisks: number }>;
  DEFAULT_COMPRESSION_RATIOS: Record<string, number>;
  newGroup(n: number): CameraGroup;
  calculateGroup(group: CameraGroup, nightHours?: number, model?: string): CalculatorGroupResult;
  calculateProject(project: PlannerProject, groups: CameraGroup[]): CalculatorResult;
};

export = StorageCalc;
