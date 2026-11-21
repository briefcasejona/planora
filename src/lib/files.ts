import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
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
    const written = await Filesystem.writeFile({
      path: name,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
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

function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Like exportFile, for binary files such as images: the share sheet on Android/iOS, the share
 * sheet in browsers that can share files (this is how iPhone users save to Photos), and a
 * download otherwise (the desktop app shows a save dialog for downloads). Nothing is uploaded.
 */
export async function exportBlob(name: string, blob: Blob): Promise<void> {
  const p = platform();
  if (p === 'android' || p === 'ios') {
    const written = await Filesystem.writeFile({
      path: name,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    });
    await Share.share({ title: name, url: written.uri, dialogTitle: name });
    return;
  }
  if (p !== 'desktop') {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
  }
  downloadBlob(name, blob);
}
