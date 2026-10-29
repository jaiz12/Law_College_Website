import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';
import { assetUrl } from '../../services/cms-row';
import { SITE_PATHS } from '../../services/site-links';
import { PageBannerComponent } from '../../shared/page-banner/page-banner.component';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

export interface GalleryAlbum {
  id: number;
  name: string;
  description: string;
  coverUrl: string | null;
}

export interface GalleryMedia {
  id: number;
  url: string;
  isVideo: boolean;
}

function pick(row: any, key: string): any {
  return row?.[key[0].toLowerCase() + key.slice(1)] ?? row?.[key] ?? null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Media & Gallery — the CMS's albums (/api/Album) and, for one album
 * (/media-gallery/:albumId), its photos and videos (/api/Media/Album/{id}).
 * A media row carries either an Image or a Video path; both are files
 * uploaded through the CMS and served from IMAGE_API_URL.
 */
@Component({
  selector: 'app-media-gallery',
  standalone: true,
  imports: [CommonModule, RouterLink, PageBannerComponent, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './media-gallery.component.html',
  styleUrl: './media-gallery.component.scss'
})
export class MediaGalleryComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly galleryPath = '/' + SITE_PATHS.mediaGallery;

  loading = true;
  albums: GalleryAlbum[] = [];
  /** Set when an album is open (/media-gallery/:albumId). */
  album: GalleryAlbum | null = null;
  albumNotFound = false;
  media: GalleryMedia[] = [];
  /** Index into `media` of the photo/video shown in the viewer. */
  viewerIndex: number | null = null;

  ngOnInit(): void {
    // Same component instance is reused between /media-gallery and
    // /media-gallery/:albumId, so follow the param rather than the snapshot.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const albumId = Number(params.get('albumId'));
      this.load(Number.isInteger(albumId) && albumId > 0 ? albumId : null);
    });
  }

  private load(albumId: number | null): void {
    this.loading = true;
    this.album = null;
    this.albumNotFound = false;
    this.media = [];
    this.viewerIndex = null;

    const albums$ = this.apiService.GetRequestRows('Album').pipe(catchError(err => {
      console.error('Media & Gallery albums error:', err);
      return of([]);
    }));
    const media$ = albumId === null
      ? of([])
      : this.apiService.GetRequestRows(`Media/Album/${albumId}`).pipe(catchError(err => {
        console.error('Media & Gallery album media error:', err);
        return of([]);
      }));

    forkJoin([albums$, media$]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([albumRows, mediaRows]) => {
      // Newest first, as the CMS lists them.
      this.albums = albumRows.map(row => this.toAlbum(row)).sort((a, b) => b.id - a.id);
      if (albumId !== null) {
        this.album = this.albums.find(a => a.id === albumId) ?? null;
        this.albumNotFound = !this.album;
        this.media = mediaRows
          .map(row => this.toMedia(row))
          .filter((m): m is GalleryMedia => m !== null)
          .sort((a, b) => a.id - b.id);
      }
      this.loading = false;
    });
  }

  private toAlbum(row: any): GalleryAlbum {
    return {
      id: Number(pick(row, 'Id')) || 0,
      name: text(pick(row, 'Name')),
      description: text(pick(row, 'Description')),
      coverUrl: assetUrl(this.apiService.IMAGE_API_URL, pick(row, 'CoverImage'))
    };
  }

  private toMedia(row: any): GalleryMedia | null {
    const video = text(pick(row, 'Video'));
    const url = assetUrl(this.apiService.IMAGE_API_URL, video || pick(row, 'Image'));
    return url ? { id: Number(pick(row, 'Id')) || 0, url, isVideo: !!video } : null;
  }

  get current(): GalleryMedia | null {
    return this.viewerIndex === null ? null : this.media[this.viewerIndex] ?? null;
  }

  open(index: number): void {
    this.viewerIndex = index;
  }

  close(): void {
    this.viewerIndex = null;
  }

  step(delta: number): void {
    if (this.viewerIndex === null || !this.media.length) {
      return;
    }
    this.viewerIndex = (this.viewerIndex + delta + this.media.length) % this.media.length;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.viewerIndex === null) {
      return;
    }
    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'ArrowRight') {
      this.step(1);
    } else if (event.key === 'ArrowLeft') {
      this.step(-1);
    }
  }
}
