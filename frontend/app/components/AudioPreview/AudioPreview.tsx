"use client";

import type { ParsedPreset, EnvelopeInfo } from "../PresetViewer/types";

function MiniEnvelope({ envelope }: { envelope: EnvelopeInfo }) {
  const w = 80, h = 32, p = 2;
  const maxT = 2;
  const ax = p + Math.min(envelope.attack / maxT, 0.35) * (w - p * 2);
  const dx = ax + Math.min(envelope.decay / maxT, 0.25) * (w - p * 2);
  const sx = dx + (w - p * 2) * 0.2;
  const bot = h - p, top = p;
  const sy = top + (1 - envelope.sustain / 100) * (bot - top);
  const path = `M ${p} ${bot} L ${ax} ${top} L ${dx} ${sy} L ${sx} ${sy} L ${w - p} ${bot}`;
  return (
    <svg width={w} height={h} className="block">
      <path d={`${path} L ${p} ${bot} Z`} fill="rgba(45, 212, 191, 0.1)" />
      <path d={path} fill="none" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AudioPreview({ preset }: { preset: ParsedPreset }) {
  const activeEffects = preset.effects.filter((e) => e.enabled);
  const activeLFOCount = preset.lfos.filter((l) =>
    preset.modulations.some((m) => m.source.includes(`lfo ${l.id}`))
  ).length;
  const namedMacros = preset.macros.filter((m) => m.name);

  return (
    <div className="mt-2 pt-3 border-t border-white/20 space-y-3">
      {/* Envelopes */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-white/50 text-xs w-14 shrink-0">Envelopes</span>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1">
            <span className="text-white/50 text-[11px]">Amp</span>
            <MiniEnvelope envelope={preset.envelopes[0]} />
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1">
            <span className="text-white/50 text-[11px]">Mod</span>
            <MiniEnvelope envelope={preset.envelopes[1]} />
          </div>
        </div>
      </div>

      {/* LFOs */}
      {activeLFOCount > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs w-14 shrink-0">LFOs</span>
          <span className="bg-white/10 px-2.5 py-1 rounded-md text-[11px] font-medium text-white/80">
            {activeLFOCount} active
          </span>
        </div>
      )}

      {/* Effects */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-white/50 text-xs w-14 shrink-0">Effects</span>
        <div className="flex flex-wrap gap-1.5">
          {activeEffects.length > 0 ? (
            activeEffects.map((fx) => (
              <span
                key={fx.name}
                className="bg-white/10 px-2.5 py-1 rounded-md text-[11px] font-medium text-white/80"
              >
                {fx.name}
              </span>
            ))
          ) : (
            <span className="text-white/30 text-[11px]">None</span>
          )}
        </div>
      </div>

      {/* Macros */}
      {namedMacros.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white/50 text-xs w-14 shrink-0">Macros</span>
          <div className="flex flex-wrap gap-1.5">
            {namedMacros.map((macro) => (
              <span
                key={macro.id}
                className="bg-white/10 px-2.5 py-1 rounded-md text-[11px] font-medium text-white/80 uppercase tracking-wide"
              >
                {macro.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {preset.comments && (
        <p className="text-white/40 italic text-[11px] pt-1 border-t border-white/10">
          {preset.comments}
        </p>
      )}
    </div>
  );
}
