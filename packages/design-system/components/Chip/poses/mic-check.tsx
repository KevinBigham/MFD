export default function MicCheckPose() {
  const sparkles = [
    [66, 75, 'gold', 'signature'],
    [74, 73, 'cyan', undefined],
    [82, 78, 'gold', undefined],
    [70, 86, 'cyan', undefined],
    [82, 88, 'gold', undefined],
  ] as const;

  return (
    <g className="mfd-chip-svg__pose-fragment mfd-chip-svg__pose-fragment--mic-check" data-chip-pose-art="mic-check">
      <circle className="mfd-chip-svg__mic-tap mfd-chip-svg__mic-tap--left" data-chip-mic-tap="left" cx="43" cy="54" r="5" />
      <circle className="mfd-chip-svg__mic-tap mfd-chip-svg__mic-tap--right" data-chip-mic-tap="right" cx="43" cy="64" r="5" />
      {sparkles.map(([x, y, color, signature], index) => (
        <rect
          key={`${x}-${y}`}
          className={`mfd-chip-svg__mic-sparkle mfd-chip-svg__mic-sparkle--${color}`}
          data-chip-mic-sparkle={index + 1}
          data-chip-mic-tip={signature}
          x={x}
          y={y}
          width="4"
          height="4"
          shapeRendering="crispEdges"
        />
      ))}
    </g>
  );
}
