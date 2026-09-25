/**
 * Centralized SonarSentinel Target Class Color System (Graphite Engineering Tool)
 * Locked Color Mapping (Flat, Muted, Sharp 2px Rectangular Tags):
 * - ghost_net:        Muted Gold/Yellow (#d4a343)
 * - wreckage:         Muted Red         (#c54b4b)
 * - pipe:             Muted Steel Blue  (#4b7bc9)
 * - cylinder:         Muted Amber/Copper(#c98a4b)
 * - unknown_anomaly:  Muted Slate Gray  (#7e8d9f)
 */

export const CLASS_COLORS = {
  ghost_net: {
    hex: '#d4a343',
    name: 'Yellow',
    badge: 'bg-[#d4a343]/15 text-[#d4a343] border border-[#d4a343]/40 rounded-[2px]',
    dot: 'bg-[#d4a343]',
    pill: 'border-[#d4a343]/40 text-[#d4a343] bg-[#d4a343]/10 rounded-[2px]',
  },
  wreckage: {
    hex: '#c54b4b',
    name: 'Red',
    badge: 'bg-[#c54b4b]/15 text-[#c54b4b] border border-[#c54b4b]/40 rounded-[2px]',
    dot: 'bg-[#c54b4b]',
    pill: 'border-[#c54b4b]/40 text-[#c54b4b] bg-[#c54b4b]/10 rounded-[2px]',
  },
  pipe: {
    hex: '#4b7bc9',
    name: 'Blue',
    badge: 'bg-[#4b7bc9]/15 text-[#4b7bc9] border border-[#4b7bc9]/40 rounded-[2px]',
    dot: 'bg-[#4b7bc9]',
    pill: 'border-[#4b7bc9]/40 text-[#4b7bc9] bg-[#4b7bc9]/10 rounded-[2px]',
  },
  cylinder: {
    hex: '#c98a4b',
    name: 'Amber',
    badge: 'bg-[#c98a4b]/15 text-[#c98a4b] border border-[#c98a4b]/40 rounded-[2px]',
    dot: 'bg-[#c98a4b]',
    pill: 'border-[#c98a4b]/40 text-[#c98a4b] bg-[#c98a4b]/10 rounded-[2px]',
  },
  unknown_anomaly: {
    hex: '#7e8d9f',
    name: 'Gray',
    badge: 'bg-[#7e8d9f]/15 text-[#7e8d9f] border border-[#7e8d9f]/40 rounded-[2px]',
    dot: 'bg-[#7e8d9f]',
    pill: 'border-[#7e8d9f]/40 text-[#7e8d9f] bg-[#7e8d9f]/10 rounded-[2px]',
  },
};

export function getClassColor(className) {
  const key = className?.toLowerCase() || '';
  return CLASS_COLORS[key] || CLASS_COLORS.unknown_anomaly;
}
