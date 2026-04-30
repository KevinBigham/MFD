export default function WhisperingPose() {
  return (
    <g className="mfd-chip-svg__pose-fragment mfd-chip-svg__pose-fragment--whispering" data-chip-pose-art="whispering">
      <path
        className="mfd-chip-svg__hand-over-mouth mfd-chip-svg__hand-over-mouth--whispering"
        data-chip-whisper="covered-mouth"
        d="M63 64 C72 59 85 59 95 65 L96 78 C85 85 70 83 62 75 Z"
      />
      <path className="mfd-chip-svg__whisper-brow mfd-chip-svg__whisper-brow--left" d="M64 44 C70 42 76 43 80 47" />
      <path className="mfd-chip-svg__whisper-brow mfd-chip-svg__whisper-brow--right" d="M91 47 C96 43 102 42 108 44" />
    </g>
  );
}
