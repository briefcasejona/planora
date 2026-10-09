import { useEffect, useState } from 'react';
import { useFormat } from '../../lib/format';
import { Toggle } from './Toggle';

/** Desktop-app options (only shown in the .exe / desktop build). */
export function DesktopCard() {
  const { t } = useFormat();
  const bridge = window.planoraDesktop;
  const [s, setS] = useState<{ closeToTray: boolean; openAtLogin: boolean; platform?: string } | null>(null);
  useEffect(() => {
    void bridge?.getSettings().then(setS);
  }, []);
  if (!bridge || !s) return null;
  const update = async (patch: Partial<typeof s>) => {
    await bridge.setSettings(patch);
    setS({ ...s, ...patch });
  };
  return (
    <div className="card mb-4">
      <h3 className="mb-1 font-semibold">{t('desktop.title')}</h3>
      <Toggle
        checked={s.closeToTray}
        onChange={(v) => update({ closeToTray: v })}
        label={t('desktop.closeToTray')}
        description={t('desktop.closeToTrayHint')}
      />
      {s.platform !== 'linux' && (
        <Toggle
          checked={s.openAtLogin}
          onChange={(v) => update({ openAtLogin: v })}
          label={t('desktop.openAtLogin')}
          description={t('desktop.openAtLoginHint')}
        />
      )}
    </div>
  );
}
