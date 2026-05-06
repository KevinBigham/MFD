import type { ComponentType, CSSProperties } from 'react';
import './Chip.css';
import IdlePose from './poses/idle';
import GreetingPose from './poses/greeting';
import TalkPose from './poses/talk';
import PointLeftPose from './poses/point-left';
import PointRightPose from './poses/point-right';
import WavePose from './poses/wave';
import ThinkPose from './poses/think';
import WhisperingPose from './poses/whispering';
import CelebratePose from './poses/celebrate';
import ExcitedPose from './poses/excited';
import ConcernPose from './poses/concern';
import WarningPose from './poses/warning';
import SurprisedPose from './poses/surprised';
import SadPose from './poses/sad';
import DisappointedPose from './poses/disappointed';
import MicCheckPose from './poses/mic-check';
import ThumbsUpPose from './poses/thumbs-up';

export const CHIP_POSES = [
  'idle',
  'greeting',
  'talk',
  'point-left',
  'point-right',
  'wave',
  'think',
  'whispering',
  'celebrate',
  'excited',
  'concern',
  'warning',
  'surprised',
  'sad',
  'disappointed',
  'mic-check',
  'thumbs-up',
] as const;

export type ChipPose = (typeof CHIP_POSES)[number];
export type ChipSize = 'sm' | 'md' | 'lg';

export interface ChipPoseArt {
  src: string;
  alt: string;
  objectPosition?: string;
  inlineSrc?: string;
  inlineObjectPosition?: string;
}

export interface ChipProps {
  pose: ChipPose;
  size?: ChipSize;
  reducedMotion?: boolean;
  className?: string;
  ariaLabel?: string;
  'aria-label'?: string;
}

const CHIP_SIZE_PX: Record<ChipSize, { width: number; height: number; legacy: number }> = {
  sm: { width: 64, height: 64, legacy: 64 },
  md: { width: 96, height: 96, legacy: 96 },
  lg: { width: 144, height: 176, legacy: 144 },
};

function withInlineArt(art: Omit<ChipPoseArt, 'inlineSrc'>): ChipPoseArt {
  const fileName = art.src.split('/').pop();
  return {
    ...art,
    inlineSrc: fileName ? `assets/chip/inline/${fileName}` : art.src,
    inlineObjectPosition: 'center center',
  };
}

export const CHIP_POSE_ART: Record<ChipPose, ChipPoseArt> = {
  idle: withInlineArt({ src: 'assets/chip/chip-coach.png', alt: 'Chip studies the field with a clipboard', objectPosition: 'center 28%' }),
  greeting: withInlineArt({ src: 'assets/chip/pose-greeting.png', alt: 'Chip leans in with both hands forward' }),
  talk: withInlineArt({ src: 'assets/chip/chip-broadcast.png', alt: 'Chip explains the next football decision', objectPosition: 'center 26%' }),
  'point-left': withInlineArt({ src: 'assets/chip/pose-point-left.png', alt: 'Chip points to the left with his clipboard ready' }),
  'point-right': withInlineArt({ src: 'assets/chip/pose-point-right.png', alt: 'Chip points toward the next control' }),
  wave: withInlineArt({ src: 'assets/chip/pose-wave.png', alt: 'Chip opens his hand to move the player forward' }),
  think: withInlineArt({ src: 'assets/chip/pose-think.png', alt: 'Chip thinks through the next call' }),
  whispering: withInlineArt({ src: 'assets/chip/pose-whispering.png', alt: 'Chip lowers his voice with sideline advice' }),
  celebrate: withInlineArt({ src: 'assets/chip/pose-celebrate.png', alt: 'Chip celebrates a good result' }),
  excited: withInlineArt({ src: 'assets/chip/pose-excited.png', alt: 'Chip gets fired up about the decision' }),
  concern: withInlineArt({ src: 'assets/chip/pose-concern.png', alt: 'Chip folds his arms with concern' }),
  warning: withInlineArt({ src: 'assets/chip/pose-warning.png', alt: 'Chip raises a warning finger' }),
  surprised: withInlineArt({ src: 'assets/chip/pose-surprised.png', alt: 'Chip reacts with both hands open' }),
  sad: withInlineArt({ src: 'assets/chip/pose-sad.png', alt: 'Chip reacts to a rough outcome' }),
  disappointed: withInlineArt({ src: 'assets/chip/pose-disappointed.png', alt: 'Chip looks disappointed after a miss' }),
  'mic-check': withInlineArt({ src: 'assets/chip/pose-mic-check.png', alt: 'Chip checks the mic before the next call' }),
  'thumbs-up': withInlineArt({ src: 'assets/chip/pose-thumbs-up.png', alt: 'Chip gives a thumbs up' }),
};

export function resolveChipPoseArt(pose: ChipPose, size: ChipSize): ChipPoseArt {
  const art = CHIP_POSE_ART[pose];
  if (size === 'lg') return art;
  return {
    ...art,
    src: art.inlineSrc ?? art.src,
    objectPosition: art.inlineObjectPosition ?? art.objectPosition,
  };
}

const poseComponents: Record<ChipPose, ComponentType> = {
  idle: IdlePose,
  greeting: GreetingPose,
  talk: TalkPose,
  'point-left': PointLeftPose,
  'point-right': PointRightPose,
  wave: WavePose,
  think: ThinkPose,
  whispering: WhisperingPose,
  celebrate: CelebratePose,
  excited: ExcitedPose,
  concern: ConcernPose,
  warning: WarningPose,
  surprised: SurprisedPose,
  sad: SadPose,
  disappointed: DisappointedPose,
  'mic-check': MicCheckPose,
  'thumbs-up': ThumbsUpPose,
};

export function Chip({
  pose,
  size = 'md',
  reducedMotion = false,
  className,
  ariaLabel,
  'aria-label': ariaLabelProp,
}: ChipProps) {
  const Pose = poseComponents[pose];
  const pixelSize = CHIP_SIZE_PX[size];
  const fullArt = CHIP_POSE_ART[pose];
  const art = resolveChipPoseArt(pose, size);
  const label = ariaLabelProp ?? ariaLabel ?? 'Chip, your assistant';
  const classes = ['mfd-chip', className].filter(Boolean).join(' ');
  const headClasses = `mfd-chip-svg__head mfd-chip-svg__head--${pose}`;
  const style = {
    '--chip-art-width': `${pixelSize.width}px`,
    '--chip-art-height': `${pixelSize.height}px`,
    '--chip-object-position': art.objectPosition ?? 'center bottom',
  } as CSSProperties;

  return (
    <span
      className={classes}
      data-chip-pose={pose}
      data-chip-size={size}
      data-chip-motion={reducedMotion ? 'reduced' : 'animated'}
      data-chip-art-src={art.src}
      data-chip-full-art-src={fullArt.src}
      role="img"
      aria-label={label}
      style={style}
    >
      <span className="mfd-chip__art-frame" data-chip-pose-art={pose}>
        <img
          className="mfd-chip__art-img"
          data-chip-image-pose={pose}
          src={art.src}
          alt=""
          width={pixelSize.width}
          height={pixelSize.height}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="mfd-chip__scanline" aria-hidden="true" />
      </span>
      <svg
        className="mfd-chip-svg mfd-chip-svg--legacy-contract"
        viewBox="0 0 160 220"
        width={pixelSize.legacy}
        height={pixelSize.legacy}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern id="chip-crt-scanline" width="160" height="4" patternUnits="userSpaceOnUse">
            <rect className="mfd-chip-svg__scanline-stripe" x="0" y="0" width="160" height="1" />
          </pattern>
        </defs>

        <ellipse className="mfd-chip-svg__floor-shadow" cx="80" cy="205" rx="44" ry="8" />

        <g className="mfd-chip-svg__figure">
          <g className="mfd-chip-svg__legs">
            <path className="mfd-chip-svg__pants mfd-chip-svg__pants--left" d="M58 128 L75 128 L72 192 L57 192 Z" />
            <path className="mfd-chip-svg__pants mfd-chip-svg__pants--right" d="M85 128 L102 128 L103 192 L88 192 Z" />
            <path className="mfd-chip-svg__shoe" d="M52 190 L73 190 L76 204 L49 204 C47 198 48 194 52 190 Z" />
            <path className="mfd-chip-svg__shoe" d="M87 190 L108 190 C113 194 114 198 111 204 L86 204 Z" />
          </g>

          <g className="mfd-chip-svg__body">
            <path className="mfd-chip-svg__jacket" d="M48 84 C58 74 70 70 82 70 C96 70 111 75 119 87 L124 132 C111 144 61 145 46 133 Z" />
            <path className="mfd-chip-svg__jacket-panel mfd-chip-svg__jacket-panel--left" d="M51 89 C60 82 70 78 80 77 L73 138 C62 138 53 135 47 131 Z" />
            <path className="mfd-chip-svg__jacket-panel mfd-chip-svg__jacket-panel--right" d="M82 77 C96 78 107 83 116 91 L121 130 C111 136 100 139 89 138 Z" />
            <path className="mfd-chip-svg__shirt" d="M69 79 C74 84 82 86 90 80 C94 96 94 122 88 139 L70 139 C64 120 64 95 69 79 Z" />
            <path className="mfd-chip-svg__collar mfd-chip-svg__collar--left" d="M57 82 L72 75 L78 89 L65 101 Z" />
            <path className="mfd-chip-svg__collar mfd-chip-svg__collar--right" d="M104 78 L118 88 L99 101 L88 88 Z" />
            <path className="mfd-chip-svg__zipper" d="M80 88 L79 139" />
          </g>

          <g className="mfd-chip-svg__arm mfd-chip-svg__arm--left">
            <path className="mfd-chip-svg__sleeve" d="M51 91 C35 101 27 116 24 134 C29 140 36 143 44 140 C49 126 57 116 67 108 Z" />
            <path className="mfd-chip-svg__hand" d="M20 132 C25 125 35 126 40 133 C42 141 35 148 27 146 C21 143 18 138 20 132 Z" />
            <g className="mfd-chip-svg__tablet">
              <path className="mfd-chip-svg__tablet-frame" d="M17 119 L47 113 L55 156 L24 162 Z" />
              <path className="mfd-chip-svg__tablet-screen" d="M23 123 L43 119 L49 151 L28 155 Z" />
              {[0, 1, 2, 3].flatMap((row) =>
                [0, 1, 2, 3, 4, 5].map((col) => (
                  <rect
                    key={`${row}-${col}`}
                    className="mfd-chip-svg__tablet-pixel mfd-chip-svg__prop-pixel"
                    data-chip-tablet-pixel={`${row}-${col}`}
                    x={28 + col * 3}
                    y={127 + row * 6}
                    width="4"
                    height="4"
                    shapeRendering="crispEdges"
                  />
                )),
              )}
            </g>
          </g>

          <g className="mfd-chip-svg__arm mfd-chip-svg__arm--right">
            <path className="mfd-chip-svg__sleeve" d="M116 91 C132 103 140 119 142 137 C137 143 129 145 122 141 C117 126 109 117 99 109 Z" />
            <path className="mfd-chip-svg__hand" d="M124 134 C130 127 140 129 144 137 C145 145 137 151 129 148 C124 145 122 140 124 134 Z" />
          </g>

          <path className="mfd-chip-svg__neck" d="M68 62 L91 62 L94 76 C88 82 72 82 66 76 Z" />

          <g className={headClasses}>
            <path className="mfd-chip-svg__ear mfd-chip-svg__ear--left" d="M47 43 C39 45 36 57 43 64 C48 70 55 66 55 59 C55 51 52 45 47 43 Z" />
            <path className="mfd-chip-svg__ear mfd-chip-svg__ear--right" d="M110 43 C118 45 122 57 115 64 C110 70 103 66 104 59 C104 51 106 45 110 43 Z" />
            <path className="mfd-chip-svg__face" d="M51 34 C54 15 67 7 82 8 C101 9 112 22 112 43 C113 65 101 78 82 79 C62 78 50 63 51 34 Z" />
            <path className="mfd-chip-svg__hair" d="M52 36 C56 16 70 4 90 9 C105 13 113 25 112 42 C101 32 87 28 70 32 C63 34 57 36 52 36 Z" />
            <path className="mfd-chip-svg__hair-lock" d="M75 11 C88 11 99 19 101 31 C92 26 83 27 75 34 C78 24 78 17 75 11 Z" />

            <g className="mfd-chip-svg__headset">
              <path className="mfd-chip-svg__headset-band" d="M48 50 C49 24 63 12 82 12 C99 12 110 26 111 51" />
              <path className="mfd-chip-svg__headset-pad mfd-chip-svg__headset-pad--left" d="M39 48 L53 49 L53 67 L39 67 Z" />
              <path className="mfd-chip-svg__mic-boom" d="M42 64 C45 74 56 82 72 83" />
              <path className="mfd-chip-svg__mic-tip" d="M70 79 L81 80 L81 88 L70 87 Z" />
            </g>

            <g className="mfd-chip-svg__eyes">
              <path className="mfd-chip-svg__brow mfd-chip-svg__brow--left" d="M65 44 C70 40 76 40 80 44" />
              <path className="mfd-chip-svg__brow mfd-chip-svg__brow--right" d="M91 44 C96 40 102 40 106 45" />
              <ellipse className="mfd-chip-svg__eye mfd-chip-svg__eye--left" cx="74" cy="53" rx="4" ry="6" />
              <ellipse className="mfd-chip-svg__eye mfd-chip-svg__eye--right" cx="97" cy="53" rx="4" ry="6" />
            </g>

            <path className="mfd-chip-svg__nose" d="M86 55 C83 61 84 65 89 67" />
            <path className="mfd-chip-svg__mouth mfd-chip-svg__mouth--line" d="M72 70 C79 75 91 75 98 70" />
            <path className="mfd-chip-svg__mouth mfd-chip-svg__mouth--talk" d="M74 69 C81 65 92 65 97 70 C96 78 76 78 74 69 Z" />
            <path className="mfd-chip-svg__mouth mfd-chip-svg__mouth--smile" d="M71 68 C79 80 92 80 100 68" />
            <path className="mfd-chip-svg__mouth mfd-chip-svg__mouth--concern" d="M75 75 C82 70 92 70 99 75" />
          </g>
        </g>

        <g
          key={pose}
          className="mfd-chip-svg__pose-layer mfd-chip-svg__pose-fade-in"
          data-chip-pose-layer={pose}
        >
          <Pose />
        </g>

        <rect
          className="mfd-chip-svg__scanline-overlay"
          data-chip-crt-overlay="true"
          x="0"
          y="0"
          width="160"
          height="220"
          fill="url(#chip-crt-scanline)"
        />
      </svg>
    </span>
  );
}
