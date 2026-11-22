import { differenceInCalendarDays } from 'date-fns';
import type { Ref } from 'react';
import type { Timeline } from '../domain/timeline';
import { useFormat } from '../lib/format';

// Fixed light palette and a system font: this SVG is also serialized into the saved image,
// so it cannot rely on CSS variables, classes or the page theme.
const C = {
  paper: '#ffffff',
  edge: '#e2e8f0',
  ink: '#0f172a',
  soft: '#64748b',
  grid: '#e2e8f0',
  bar: '#3b82f6',
  done: '#16a34a',
  late: '#dc2626',
  lateFill: '#fecaca',
  today: '#7c3aed',
  meeting: '#f59e0b',
};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const W = 360;
const PAD = 16;
const GRID_W = W - 2 * PAD;
const ROW_H = 40;
const HALO = { stroke: C.paper, strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' } as const;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + word.length < max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function Diamond({ x, y, color }: { x: number; y: number; color: string }) {
  return <path d={`M${x} ${y - 5}L${x + 5} ${y}L${x} ${y + 5}L${x - 5} ${y}Z`} fill={color} stroke={C.paper} />;
}

export function ProjectTimeline({
  timeline,
  title,
  svgRef,
}: {
  timeline: Timeline;
  title: string;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const { t, date } = useFormat();
  const { range, weeks, rows, meetings, today, deadline } = timeline;
  const days = differenceInCalendarDays(range.end, range.start) + 1;
  const x = (d: Date) => PAD + (Math.max(0, (+d - +range.start) / 86400000) / days) * GRID_W;
  const dayW = GRID_W / days;
  const dayX = (d: Date) => x(new Date(+d + 43200000));

  const gridTop = 78;
  const rowsTop = gridTop + 22;
  const bottom = rowsTop + rows.length * ROW_H;
  const help = wrap(t('detail.timeline.help'), 64);
  const legendTop = bottom + 14;
  const helpTop = legendTop + 48;
  const height = helpTop + help.length * 12 + 8;
  const heading = `${title}, ${date(range.start, 'd MMM yyyy')} - ${date(deadline, 'd MMM yyyy')}`;
  const weekLabel = (n: number) => (weeks.length > 9 ? String(n) : t('detail.timeline.week', { n }));

  const legend = [
    {
      label: t('detail.timeline.today'),
      draw: (lx: number, ly: number) => (
        <line x1={lx + 5} y1={ly - 6} x2={lx + 5} y2={ly + 5} stroke={C.today} strokeWidth="2" />
      ),
    },
    {
      label: t('detail.timeline.deadline'),
      draw: (lx: number, ly: number) => (
        <line x1={lx + 5} y1={ly - 6} x2={lx + 5} y2={ly + 5} stroke={C.late} strokeWidth="2" />
      ),
    },
    {
      label: t('detail.timeline.meeting'),
      draw: (lx: number, ly: number) => <circle cx={lx + 5} cy={ly} r="3.5" fill={C.meeting} />,
    },
    { label: t('detail.timeline.due'), draw: (lx: number, ly: number) => <Diamond x={lx + 5} y={ly} color={C.soft} /> },
    {
      label: t('detail.timeline.done'),
      draw: (lx: number, ly: number) => <rect x={lx} y={ly - 4} width="11" height="8" rx="3" fill={C.done} />,
    },
    {
      label: t('detail.timeline.late'),
      draw: (lx: number, ly: number) => (
        <rect x={lx} y={ly - 4} width="11" height="8" rx="3" fill={C.lateFill} stroke={C.late} />
      ),
    },
  ];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${height}`}
      className="block h-auto w-full"
      role="img"
      aria-label={heading}
      fontFamily={FONT}
    >
      <rect x="0.5" y="0.5" width={W - 1} height={height - 1} rx="14" fill={C.paper} stroke={C.edge} />
      <text x={PAD} y="28" fontSize="15" fontWeight="700" fill={C.ink}>
        {clip(title, 38)}
      </text>
      <text x={PAD} y="46" fontSize="10" fill={C.soft}>
        {date(range.start, 'd MMM yyyy')} - {date(deadline, 'd MMM yyyy')}
      </text>

      {weeks.map((w) => (
        <g key={+w.start}>
          <line x1={x(w.start)} y1={gridTop - 4} x2={x(w.start)} y2={bottom} stroke={C.grid} />
          <text x={x(w.start) + 2} y={gridTop - 10} fontSize="8" fill={C.soft}>
            {weekLabel(w.week)}
          </text>
        </g>
      ))}
      {meetings.map((m) => (
        <circle key={+m} cx={dayX(m)} cy={gridTop + 6} r="3" fill={C.meeting} />
      ))}

      {today && <line x1={x(today)} y1={gridTop - 4} x2={x(today)} y2={bottom} stroke={C.today} strokeWidth="1.5" />}
      <line x1={dayX(deadline)} y1={gridTop - 4} x2={dayX(deadline)} y2={bottom} stroke={C.late} strokeWidth="1.5" />

      {rows.map((r, i) => {
        const barY = rowsTop + i * ROW_H + 20;
        const color = r.late ? C.late : r.done ? C.done : C.bar;
        if (!r.barStart || !r.barEnd) return null;
        return (
          <g key={r.stepId}>
            <rect
              x={x(r.barStart)}
              y={barY - 5}
              width={Math.max(6, dayW, x(r.barEnd) - x(r.barStart))}
              height="10"
              rx="5"
              fill={r.late ? C.lateFill : color}
              stroke={r.late ? C.late : 'none'}
              strokeWidth="1.2"
            />
            {r.due && <Diamond x={dayX(r.due)} y={barY} color={color} />}
          </g>
        );
      })}

      {rows.map((r, i) => (
        <text
          key={r.stepId}
          x={PAD}
          y={rowsTop + i * ROW_H + 12}
          fontSize="10.5"
          fontWeight="600"
          fill={r.done ? C.soft : C.ink}
          {...HALO}
        >
          {r.done ? '✓ ' : ''}
          {clip(r.title, r.who ? 30 : 44)}
          {r.who && (
            <tspan dx="6" fontSize="9" fontWeight="400" fill={C.soft}>
              {clip(r.who, 14)}
            </tspan>
          )}
        </text>
      ))}

      {legend.map((item, i) => {
        const lx = PAD + (i % 3) * 112;
        const ly = legendTop + 10 + Math.floor(i / 3) * 18;
        return (
          <g key={item.label}>
            {item.draw(lx, ly)}
            <text x={lx + 17} y={ly + 3.5} fontSize="9.5" fill={C.soft}>
              {item.label}
            </text>
          </g>
        );
      })}
      {help.map((line, i) => (
        <text key={line} x={PAD} y={helpTop + 10 + i * 12} fontSize="9" fill={C.soft}>
          {line}
        </text>
      ))}
    </svg>
  );
}
