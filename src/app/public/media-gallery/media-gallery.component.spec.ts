import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { MediaGalleryComponent } from './media-gallery.component';
import { TEST_IMAGE_URL, failApi, flushApi, provideTestConfig, provideTestHttp } from '../../testing/test-providers';

describe('MediaGalleryComponent', () => {
  let http: HttpTestingController;

  const ALBUMS = [
    { id: 2, name: 'Annual Day', description: 'Celebrations', coverImage: 'assets/cover2.webp' },
    { id: 3, name: 'Moot Court', description: null, coverImage: null }
  ];

  function render(albumId: string | null = null) {
    const params = new BehaviorSubject(convertToParamMap(albumId ? { albumId } : {}));
    TestBed.configureTestingModule({
      imports: [MediaGalleryComponent],
      providers: [
        provideRouter([]),
        provideTestHttp(),
        provideTestConfig(),
        { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { data: {} } } }
      ]
    });
    const fixture = TestBed.createComponent(MediaGalleryComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture;
  }
  const main = (fixture: ReturnType<typeof render>) => (fixture.nativeElement as HTMLElement).querySelector('main')!;

  it('lists albums newest first, linking to each album', () => {
    const fixture = render();
    flushApi(http, 'Album', ALBUMS);
    fixture.detectChanges();
    const cards = [...main(fixture).querySelectorAll<HTMLAnchorElement>('a.album-card')];
    expect(cards.map(c => c.querySelector('.album-name')!.textContent!.trim())).toEqual(['Moot Court', 'Annual Day']);
    expect(cards[0].getAttribute('href')).toBe('/media-gallery/3');
    expect(cards[0].querySelector('.album-cover-empty')).not.toBeNull();
    expect(cards[1].querySelector<HTMLImageElement>('img.album-cover')!.src).toBe(`${TEST_IMAGE_URL}assets/cover2.webp`);
  });

  it('shows the empty state when the album list fails', () => {
    const fixture = render();
    failApi(http, 'Album');
    fixture.detectChanges();
    expect(main(fixture).textContent).toContain('Nothing here yet');
  });

  it('shows an album\'s photos and videos and steps through them in the viewer', () => {
    const fixture = render('2');
    flushApi(http, 'Album', ALBUMS);
    flushApi(http, 'Media/Album/2', [
      { id: 4, albumId: 2, image: 'assets/b.webp', video: null },
      { id: 1, albumId: 2, image: 'assets/a.webp', video: null },
      { id: 6, albumId: 2, image: null, video: 'assets/clip.mp4' },
      { id: 7, albumId: 2, image: null, video: null }
    ]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(main(fixture).querySelector('h1')!.textContent).toContain('Annual Day');
    expect(main(fixture).textContent).toContain('Celebrations');

    const tiles = [...main(fixture).querySelectorAll<HTMLButtonElement>('.media-tile')];
    expect(tiles.length).toBe(3);
    expect(tiles[0].querySelector('img')!.src).toBe(`${TEST_IMAGE_URL}assets/a.webp`);
    expect(tiles[2].querySelector('video')).not.toBeNull();

    tiles[2].click();
    fixture.detectChanges();
    expect(root.querySelector('.viewer video')).not.toBeNull();
    expect(root.querySelector('.viewer-count')!.textContent).toContain('3 / 3');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(root.querySelector<HTMLImageElement>('.viewer img')!.src).toBe(`${TEST_IMAGE_URL}assets/a.webp`);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(root.querySelector('.viewer')).toBeNull();
  });

  it('says so when the album id does not exist', () => {
    const fixture = render('99');
    flushApi(http, 'Album', ALBUMS);
    flushApi(http, 'Media/Album/99', []);
    fixture.detectChanges();
    expect(main(fixture).textContent).toContain("This album isn't available");
  });
});
