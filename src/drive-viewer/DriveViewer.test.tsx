/** @jest-environment @happy-dom/jest-environment */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DriveViewer } from './DriveViewer';
import type { DriveViewerItem } from './types';

const window1 = (urls: string[], pages = urls.length) => Promise.resolve({ pages, from: 1, urls, expiresAt: new Date(Date.now() + 300000).toISOString() });

const pdfBlocked: DriveViewerItem = { id: 'p1', name: 'Informe.pdf', kind: 'pdf', canDownload: false, kicker: 'Obra', loadPages: () => window1(['https://lila/p1', 'https://lila/p2', 'https://lila/p3']) };
const imageBlocked: DriveViewerItem = { id: 'i1', name: 'Foto.jpg', kind: 'image', canDownload: false, loadPages: () => window1(['https://lila/derivative']) };
const videoBlocked: DriveViewerItem = { id: 'v1', name: 'Obra.mp4', kind: 'video', canDownload: false, loadStream: () => Promise.resolve({ url: 'https://lila/files/v.mp4?t=1', watermark: 'Enlace ABC · 25/11/2026 10:00' }) };
const pdfOpen: DriveViewerItem = { id: 'p2', name: 'Valorización.pdf', kind: 'pdf', canDownload: true, src: 'https://lila/files/v.pdf?t=1' };

const renderViewer = (items: DriveViewerItem[], currentId: string, extra: Partial<Parameters<typeof DriveViewer>[0]> = {}) => {
  const onNavigate = jest.fn();
  const onClose = jest.fn();
  render(<DriveViewer items={items} currentId={currentId} onNavigate={onNavigate} onClose={onClose} {...extra} />);
  return { onNavigate, onClose };
};

describe('DriveViewer', () => {
  it('a PDF without download shows the watermarked pages, the counter and the read-only notice', async () => {
    // Arrange / Act
    renderViewer([pdfBlocked], 'p1');
    // Assert
    await waitFor(() => expect(screen.getByAltText('Página 1').getAttribute('src')).toBe('https://lila/p1'));
    expect(screen.getByAltText('Página 1').getAttribute('crossorigin')).toBe('anonymous');
    expect(screen.getByText('Página 1 de 3')).toBeTruthy();
    expect(screen.getByText(/desactivó la descarga y la impresión/)).toBeTruthy();
    expect(screen.getByText('Obra')).toBeTruthy();
  });

  it('an image without download shows the derivative, never the original', async () => {
    renderViewer([imageBlocked], 'i1');
    await waitFor(() => expect(screen.getByAltText('Foto.jpg').getAttribute('src')).toBe('https://lila/derivative'));
  });

  it('a video without download plays the signed stream with no download control, under the watermark', async () => {
    render(<DriveViewer items={[videoBlocked]} currentId="v1" onNavigate={jest.fn()} onClose={jest.fn()} />);
    // The viewer is portaled to <body>.
    await waitFor(() => expect(document.body.querySelector('video')?.getAttribute('src')).toBe('https://lila/files/v.mp4?t=1'));
    const video = document.body.querySelector('video')!;
    expect(video.getAttribute('controlslist')).toBe('nodownload noremoteplayback');
    expect(video.hasAttribute('disablepictureinpicture')).toBe(true);
    expect(screen.getAllByText('Enlace ABC · 25/11/2026 10:00').length).toBeGreaterThan(0);
    expect(screen.getByText(/desactivó la descarga/)).toBeTruthy();
  });

  it('is portaled to <body> inside the app surface class', () => {
    render(<div style={{ transform: 'scale(1)' }} data-testid="trap"><DriveViewer items={[pdfOpen]} currentId="p2" onNavigate={jest.fn()} onClose={jest.fn()} surfaceClassName="shadcn-surface dark" /></div>);
    const dialog = screen.getByRole('dialog');
    expect(screen.getByTestId('trap').contains(dialog)).toBe(false);
    expect(dialog.parentElement?.className).toBe('shadcn-surface dark');
  });

  it('a downloadable PDF goes to the app viewer and shows the app actions', () => {
    renderViewer([pdfOpen], 'p2', { renderPdf: (item) => <p>pdfjs {item.src}</p>, renderActions: () => <button type="button">Descargar</button> });
    expect(screen.getByText('pdfjs https://lila/files/v.pdf?t=1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descargar' })).toBeTruthy();
  });

  it('moves across the folder files with the arrows, the keyboard and closes with Escape', () => {
    const { onNavigate, onClose } = renderViewer([pdfBlocked, imageBlocked, videoBlocked], 'i1');
    expect(screen.getByText('2 de 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onNavigate).toHaveBeenLastCalledWith('v1');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onNavigate).toHaveBeenLastCalledWith('p1');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('a swipe moves to the next file', () => {
    const { onNavigate } = renderViewer([pdfBlocked, imageBlocked], 'p1');
    const body = screen.getByRole('dialog').lastElementChild!;
    fireEvent.touchStart(body, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(body, { changedTouches: [{ clientX: 100 }] });
    expect(onNavigate).toHaveBeenCalledWith('i1');
  });

  it('says there is no preview for an office file', () => {
    renderViewer([{ id: 'x', name: 'plan.xlsx', kind: 'none', canDownload: false }], 'x');
    expect(screen.getByText('Vista previa no disponible')).toBeTruthy();
  });
});
