export interface TelestratorXProps {
  x?: number;
  y?: number;
  drawing?: boolean;
  className?: string;
}

export function TelestratorX({ x = 0, y = 0, drawing = false, className }: TelestratorXProps) {
  const classes = [
    'mfd-chip-svg__telestrator-x',
    drawing && 'mfd-chip-svg__telestrator-x--drawing',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const segments = [
    [0, 0],
    [10, 0],
    [5, 5],
    [0, 10],
    [10, 10],
  ] as const;

  return (
    <g className={classes} data-chip-telestrator-drawing={String(drawing)}>
      {segments.map(([dx, dy], index) => (
        <rect
          key={`${dx}-${dy}`}
          className="mfd-chip-svg__telestrator-x-segment"
          data-chip-telestrator-segment={index + 1}
          x={x + dx}
          y={y + dy}
          width="5"
          height="5"
          shapeRendering="crispEdges"
        />
      ))}
    </g>
  );
}
