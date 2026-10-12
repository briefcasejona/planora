import { Component, type ReactNode } from 'react';
import { useFormat } from '../lib/format';
import { Empty } from './ui';

function PageError() {
  const { t } = useFormat();
  return (
    <div className="card">
      <Empty icon="alert" title={t('pageError.title')}>
        <p className="max-w-sm text-sm">{t('pageError.body')}</p>
        <button className="btn-primary mt-2" onClick={() => window.location.reload()}>
          {t('common.reload')}
        </button>
      </Empty>
    </div>
  );
}

/**
 * Shows a message instead of the page when it fails to load or draw, so the menu
 * stays usable. Without this, one error empties the whole screen. Give it a `key`
 * per page so moving to another page starts fresh.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <PageError /> : this.props.children;
  }
}
