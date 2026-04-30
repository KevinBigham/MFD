import { TelestratorX } from '../props/TelestratorX';

export default function WarningPose() {
  return (
    <g className="mfd-chip-svg__pose-fragment mfd-chip-svg__pose-fragment--warning" data-chip-pose-art="warning">
      <path
        className="mfd-chip-svg__arm-overlay mfd-chip-svg__arm-overlay--warning"
        data-chip-warning-pointer="camera"
        d="M113 95 C127 91 143 84 154 75 C158 80 158 88 154 94 C141 104 127 110 112 112 Z"
      />
      <path
        className="mfd-chip-svg__finger-line mfd-chip-svg__finger-line--warning"
        d="M148 73 L159 69"
      />
      <g className="mfd-chip-svg__warning-watch" data-chip-warning-watch="pixel">
        <rect className="mfd-chip-svg__watch-pixel mfd-chip-svg__watch-pixel--warning" x="34" y="128" width="8" height="8" shapeRendering="crispEdges" />
        <rect className="mfd-chip-svg__watch-pixel mfd-chip-svg__watch-pixel--warning" x="42" y="128" width="4" height="8" shapeRendering="crispEdges" />
        <rect className="mfd-chip-svg__watch-pixel mfd-chip-svg__watch-pixel--warning" x="36" y="136" width="8" height="4" shapeRendering="crispEdges" />
      </g>
      <TelestratorX x={123} y={108} drawing className="mfd-chip-svg__telestrator-x--warning" />
    </g>
  );
}
