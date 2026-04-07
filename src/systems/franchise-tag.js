/**
 * MFD Franchise Tag System (v98.6)
 *
 * Three tag variants with different salary multipliers and rules.
 */

export var FRANCHISE_TAG_986 = {
  types: [
    {
      id: 'exclusive',
      label: 'Exclusive',
      desc: 'Top-5 salary, cannot negotiate with others',
      salaryMult: 1.2,
    },
    {
      id: 'non_exclusive',
      label: 'Non-Exclusive',
      desc: 'Top-5 avg, others can make offers (you match or get 2 1sts)',
      salaryMult: 1.1,
    },
    {
      id: 'transition',
      label: 'Transition',
      desc: 'Top-10 avg, right of first refusal, no comp picks',
      salaryMult: 0.9,
    },
  ],
};
