import { useRef, useState } from 'react';
import { Banner, Section } from '../components/ui';
import { useStore } from '../data/store';
import { buildTimeline, timelineFileName } from '../domain/timeline';
import type { Task } from '../domain/types';
import { exportBlob } from '../lib/files';
import { useFormat } from '../lib/format';
import { svgToPngBlob } from '../lib/svgImage';
import { ProjectTimeline } from './ProjectTimeline';

/** The timeline (strokenplanning) of a project, with a button to save it as an image. */
export function TimelineSection({ task }: { task: Task }) {
  const { t } = useFormat();
  const allSessions = useStore((s) => s.sessions);
  const busy = useStore((s) => s.busy);
  const [saveFailed, setSaveFailed] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const sessions = allSessions.filter((s) => s.taskId === task.id);

  const save = async () => {
    setSaveFailed(false);
    try {
      if (!svg.current) return;
      await exportBlob(timelineFileName(task.title), await svgToPngBlob(svg.current, 4));
    } catch {
      setSaveFailed(true);
    }
  };

  return (
    <div className="mt-5">
      <Section
        title={t('detail.timeline.heading')}
        action={
          <button className="btn-secondary" onClick={() => void save()}>
            {t('detail.timeline.save')}
          </button>
        }
      >
        {saveFailed && (
          <div className="mb-2">
            <Banner tone="warn" icon="alert">
              {t('detail.timeline.saveFailed')}
            </Banner>
          </div>
        )}
        <ProjectTimeline svgRef={svg} title={task.title} timeline={buildTimeline(task, sessions, busy, new Date())} />
      </Section>
    </div>
  );
}
