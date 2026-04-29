export default function MicCheckPose() {
  return (
    <g className="mfd-chip-svg__pose-fragment mfd-chip-svg__pose-fragment--mic-check" data-chip-pose-art="mic-check">
      <circle className="mfd-chip-svg__mic-tap mfd-chip-svg__mic-tap--left" data-chip-mic-tap="left" cx="43" cy="54" r="5" />
      <circle className="mfd-chip-svg__mic-tap mfd-chip-svg__mic-tap--right" data-chip-mic-tap="right" cx="43" cy="64" r="5" />
      <path className="mfd-chip-svg__mic-tip-flash" data-chip-mic-tip="signature" d="M68 77 L84 78 L84 91 L68 90 Z" />
    </g>
  );
}
