// PresetViewer Components - Clean exports

// Main components
export { default as PresetViewer } from './PresetViewer';
export { default as PresetDetails } from './PresetDetails';
export { default as PresetModificator } from './PresetModificator'; // backward compat

// Parser
export { parseVitalPreset } from './parsePreset';

// Types
export type {
  ParsedPreset,
  RawVitalPreset,
  OscillatorInfo,
  WavetableInfo,
  EnvelopeInfo,
  FilterInfo,
  LFOInfo,
  ModulationRoute,
  EffectInfo,
  MacroInfo,
} from './types';

// Reusable sub-components from PresetDetails
export {
  EnvelopeGraph,
  LFOWaveform,
  Knob,
  StatusIndicator,
  OscillatorSection,
  FilterSection,
} from './PresetDetails';