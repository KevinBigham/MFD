export default function CelebratePose() {
  const confetti = [
    [29, 33, 'gold'],
    [43, 22, 'cyan'],
    [57, 36, 'green'],
    [72, 18, 'gold'],
    [86, 34, 'cyan'],
    [101, 20, 'green'],
    [124, 25, 'gold'],
    [136, 42, 'cyan'],
    [20, 56, 'green'],
    [35, 66, 'gold'],
    [52, 55, 'cyan'],
    [68, 68, 'green'],
    [94, 58, 'gold'],
    [111, 70, 'cyan'],
    [128, 61, 'green'],
    [144, 77, 'gold'],
    [17, 87, 'cyan'],
    [139, 94, 'green'],
  ] as const;

  return (
    <g className="mfd-chip-svg__pose-fragment mfd-chip-svg__pose-fragment--celebrate" data-chip-pose-art="celebrate">
      <path className="mfd-chip-svg__trophy" d="M66 22 L95 22 L91 46 C88 56 73 56 70 46 Z" />
      <path className="mfd-chip-svg__trophy-handle mfd-chip-svg__trophy-handle--left" d="M66 28 C55 28 54 41 66 42" />
      <path className="mfd-chip-svg__trophy-handle mfd-chip-svg__trophy-handle--right" d="M95 28 C106 28 107 41 95 42" />
      {confetti.map(([x, y, color], index) => (
        <rect
          key={`${x}-${y}`}
          className={`mfd-chip-svg__confetti-bit mfd-chip-svg__confetti-bit--${color}`}
          data-chip-confetti-bit={index + 1}
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
