import { PixelEkg } from './PixelEkg';

const blowoutPoints = [
  { time: 1, wp: 52 },
  { time: 2, wp: 61, event: 'touchdown' },
  { time: 3, wp: 68 },
  { time: 4, wp: 79, event: 'touchdown' },
  { time: 5, wp: 86 },
  { time: 6, wp: 92 },
];

const shootoutPoints = [
  { time: 1, wp: 50 },
  { time: 2, wp: 68, event: 'touchdown' },
  { time: 3, wp: 43, event: 'turnover' },
  { time: 4, wp: 74, event: 'touchdown' },
  { time: 5, wp: 39, event: 'turnover' },
  { time: 6, wp: 58, event: 'big_play' },
  { time: 7, wp: 47, event: 'turnover' },
  { time: 8, wp: 71, event: 'touchdown' },
];

const classicPoints = [
  { time: 1, wp: 50 },
  { time: 2, wp: 44, event: 'big_play' },
  { time: 3, wp: 59, event: 'touchdown' },
  { time: 4, wp: 48 },
  { time: 5, wp: 62, event: 'field goal' },
  { time: 6, wp: 41, event: 'turnover' },
  { time: 7, wp: 55, event: 'big_play' },
  { time: 8, wp: 67, event: 'touchdown' },
];

export default {
  title: 'Design System/PixelEkg',
  component: PixelEkg,
};

export const Blowout = () => <PixelEkg points={blowoutPoints} />;

export const Shootout = () => <PixelEkg points={shootoutPoints} />;

export const Classic = () => <PixelEkg points={classicPoints} />;
