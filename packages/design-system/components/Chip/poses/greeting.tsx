export default function GreetingPose() {
  return (
    <g className="mfd-chip-svg__pose-fragment mfd-chip-svg__pose-fragment--greeting" data-chip-pose-art="greeting">
      <path
        className="mfd-chip-svg__arm-overlay mfd-chip-svg__arm-overlay--greeting"
        data-chip-greeting-pointer="camera"
        d="M111 95 C128 91 143 85 151 74 C155 79 155 87 151 93 C139 104 124 111 111 112 Z"
      />
      <path
        className="mfd-chip-svg__hand-overlay mfd-chip-svg__hand-overlay--greeting"
        d="M145 67 C154 66 160 72 158 81 C156 89 147 91 141 85 C136 79 138 70 145 67 Z"
      />
      <path
        className="mfd-chip-svg__finger-line mfd-chip-svg__finger-line--greeting"
        d="M149 72 L159 68"
      />
    </g>
  );
}
