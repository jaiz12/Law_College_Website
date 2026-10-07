import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../services/api.service';
import { isAbsoluteHttpUrl } from '../../services/url.util';
import { SiteHeaderComponent } from '../../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';

export const ALUMNI_COURSES = ['LL.B.', 'B.A. LL.B.', 'B.B.A. LL.B.', 'LL.M.', 'Other'] as const;

export const ALUMNI_CONNECT_OPTIONS = [
  'Alumni Events',
  'Mentoring Students',
  'Guest Lectures / Talks',
  'Internship / Career Support',
  'Just keep me updated'
] as const;

/** The college was established in 1980. */
const FIRST_BATCH_YEAR = 1980;

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST endpoint (multipart/form-data) for a registration. Field names in
 * buildFormData() are the contract with the API side.
 */
export const ALUMNI_REGISTER_API = 'AlumniRegistration';

function optionalHttpUrl(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  return !value || isAbsoluteHttpUrl(value) ? null : { url: true };
}

/**
 * Alumni > Register / Join — the short "Stay Connected" form. Deliberately
 * only the essentials; fuller profile details (DOB, Bar Council number,
 * career history, …) are meant for a later "Complete Your Profile" step.
 */
@Component({
  selector: 'app-alumni-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './alumni-register.component.html',
  styleUrl: './alumni-register.component.scss'
})
export class AlumniRegisterComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly courses = ALUMNI_COURSES;
  readonly connectOptions = ALUMNI_CONNECT_OPTIONS;
  readonly batchYears: number[] = Array.from(
    { length: new Date().getFullYear() - FIRST_BATCH_YEAR + 1 },
    (_, i) => new Date().getFullYear() - i
  );

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    course: ['', Validators.required],
    batchYear: ['', Validators.required],
    profession: ['', Validators.maxLength(100)],
    organisation: ['', Validators.maxLength(150)],
    location: ['', Validators.maxLength(100)],
    connectThrough: this.fb.nonNullable.control<string[]>([]),
    linkedInUrl: ['', [Validators.maxLength(300), optionalHttpUrl]],
    consent: [false, Validators.requiredTrue]
  });

  photo: File | null = null;
  photoPreview: string | null = null;
  photoError: string | null = null;

  submitting = false;
  submitted = false;
  submitError: string | null = null;

  /** Error text for a control, shown only once the visitor has touched it (or tried to submit). */
  error(name: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[name];
    if (!control.errors || !(control.touched || control.dirty)) {
      return null;
    }
    const e = control.errors;
    switch (name) {
      case 'fullName': return e['maxlength'] ? 'Name is too long.' : 'Please enter your full name.';
      case 'email': return e['required'] ? 'Please enter your email address.' : 'Please enter a valid email address.';
      case 'mobileNumber': return e['required'] ? 'Please enter your mobile number.' : 'Please enter a valid 10-digit mobile number.';
      case 'course': return 'Please select your course / programme.';
      case 'batchYear': return 'Please select your batch / graduation year.';
      case 'linkedInUrl': return e['url'] ? 'Please paste a full link starting with http:// or https://' : 'Link is too long.';
      case 'consent': return 'Please agree to be contacted so we can stay in touch.';
      default: return e['maxlength'] ? 'This is too long.' : null;
    }
  }

  isConnectChecked(option: string): boolean {
    return this.form.controls.connectThrough.value.includes(option);
  }

  toggleConnect(option: string, checked: boolean): void {
    const current = this.form.controls.connectThrough.value.filter(value => value !== option);
    this.form.controls.connectThrough.setValue(checked ? [...current, option] : current);
  }

  onMobileInput(event: Event): void {
    // Digits only, max 10 — a pasted "+91 98765 43210" or "098765 43210"
    // keeps the 10-digit number, not the country code/trunk prefix.
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '');
    if (digits.length > 10) {
      digits = digits.replace(/^(?:91|0)/, '');
    }
    digits = digits.slice(0, 10);
    if (digits !== input.value) {
      input.value = digits;
      this.form.controls.mobileNumber.setValue(digits);
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.clearPhoto();

    if (!file) {
      return;
    }
    if (!PHOTO_TYPES.includes(file.type)) {
      this.photoError = 'Please upload a JPG, PNG or WEBP image.';
      input.value = '';
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      this.photoError = 'Photo must be 2 MB or smaller.';
      input.value = '';
      return;
    }
    this.photo = file;
    this.photoPreview = URL.createObjectURL(file);
  }

  removePhoto(input: HTMLInputElement): void {
    this.clearPhoto();
    input.value = '';
  }

  private clearPhoto(): void {
    if (this.photoPreview) {
      URL.revokeObjectURL(this.photoPreview);
    }
    this.photo = null;
    this.photoPreview = null;
    this.photoError = null;
  }

  submit(): void {
    this.submitError = null;
    if (this.form.invalid || this.photoError) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.apiService.PostRequest(ALUMNI_REGISTER_API, this.buildFormData(), true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.submitting = false;
          // The API answers 200 with { isSucceeded, message } even for a failed insert.
          if (res?.isSucceeded ?? res?.IsSucceeded ?? true) {
            this.submitted = true;
            this.clearPhoto();
          } else {
            this.submitError = res?.message ?? res?.Message ?? 'We could not save your registration. Please try again.';
          }
        },
        error: err => {
          console.error('Alumni registration error:', err);
          this.submitting = false;
          this.submitError = err?.error?.message
            ?? 'We could not submit your registration right now. Please try again in a little while.';
        }
      });
  }

  buildFormData(): FormData {
    const v = this.form.getRawValue();
    const data = new FormData();
    data.append('FullName', v.fullName.trim());
    data.append('Email', v.email.trim());
    data.append('MobileNumber', v.mobileNumber);
    data.append('Course', v.course);
    data.append('BatchYear', v.batchYear);
    data.append('Profession', v.profession.trim());
    data.append('Organisation', v.organisation.trim());
    data.append('Location', v.location.trim());
    // Kept in the order shown on the form, comma-separated.
    data.append('ConnectThrough', this.connectOptions.filter(o => v.connectThrough.includes(o)).join(', '));
    data.append('LinkedInUrl', v.linkedInUrl.trim());
    data.append('Consent', String(v.consent));
    if (this.photo) {
      data.append('Photo', this.photo, this.photo.name);
    }
    return data;
  }

  ngOnDestroy(): void {
    this.clearPhoto();
  }
}
