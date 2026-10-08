import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { platform } from './platform';

/**
 * Hand a generated file to the user in the way each platform supports:
 * a save dialog on desktop, the share sheet on Android/iOS (e.g. straight
 * into the calendar app), and a download in the browser. Nothing is uploaded.
 */
export async function exportFile(name: string, content: string, mime: string): Promise<void> {
  const p = platform();
  if (p === 'desktop' && window.planoraDesktop) {
    await window.planoraDesktop.saveFile(name, content);
    return;
  }
  if (p === 'android' || p === 'ios') {
    const written = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, url: written.uri, dialogTitle: name });
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
