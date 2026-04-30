export default function SurprisedPose() {
  return (
    <g className="mfd-chip-svg__pose-fragment mfd-chip-svg__pose-fragment--surprised" data-chip-pose-art="surprised">
      <path
        className="mfd-chip-svg__surprise-hand mfd-chip-svg__surprise-hand--left"
        d="M43 50 C35 48 31 54 34 62 C38 70 49 67 51 59 C52 53 49 50 43 50 Z"
      />
      <path
        className="mfd-chip-svg__surprise-hand mfd-chip-svg__surprise-hand--right"
        d="M117 51 C126 49 130 56 126 64 C121 72 110 68 109 60 C108 54 111 51 117 51 Z"
      />
      <path className="mfd-chip-svg__shock-line mfd-chip-svg__shock-line--left" d="M29 43 L22 34" />
      <path className="mfd-chip-svg__shock-line mfd-chip-svg__shock-line--right" d="M132 42 L140 32" />
    </g>
  );
}
