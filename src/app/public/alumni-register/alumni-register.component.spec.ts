import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { ALUMNI_REGISTER_API, AlumniRegisterComponent, PHOTO_MAX_BYTES } from './alumni-register.component';
import { TEST_API_URL, provideTestConfig, provideTestHttp } from '../../testing/test-providers';

describe('AlumniRegisterComponent', () => {
  let http: HttpTestingController;

  function render() {
    TestBed.configureTestingModule({
      imports: [AlumniRegisterComponent],
      providers: [provideRouter([]), provideTestHttp(), provideTestConfig()]
    });
    const fixture = TestBed.createComponent(AlumniRegisterComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture;
  }
  const el = (fixture: ReturnType<typeof render>) => fixture.nativeElement as HTMLElement;
  const errors = (fixture: ReturnType<typeof render>) =>
    [...el(fixture).querySelectorAll('.field-error')].map(e => e.textContent!.trim());

  function fillValid(fixture: ReturnType<typeof render>) {
    fixture.componentInstance.form.patchValue({
      fullName: '  Asha Rai ',
      email: 'asha@example.com',
      mobileNumber: '9876543210',
      course: 'B.A. LL.B.',
      batchYear: '2015',
      consent: true
    });
  }
  const pendingPost = () => http.match(req => req.method === 'POST' && req.url === `${TEST_API_URL}/${ALUMNI_REGISTER_API}`);

  it('shows the welcome header and all form fields', () => {
    const fixture = render();
    expect(el(fixture).querySelector('h1')!.textContent).toContain('Welcome Back!');
    expect(el(fixture).textContent).toContain('It takes less than 2 minutes.');
    expect(el(fixture).querySelectorAll('select#course option:not([disabled])').length).toBe(5);
    expect(el(fixture).querySelectorAll('.check-grid input[type=checkbox]').length).toBe(5);
    expect(el(fixture).querySelector('input[type=file]#photo')).not.toBeNull();
  });

  it('blocks submit and flags only the required fields when empty', () => {
    const fixture = render();
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(errors(fixture).length).toBe(6);
    expect(pendingPost().length).toBe(0);
  });

  it('validates mobile number, email and LinkedIn link format', () => {
    const fixture = render();
    const form = fixture.componentInstance.form;
    form.patchValue({ mobileNumber: '12345', email: 'nope', linkedInUrl: 'linkedin.com/in/x' });
    expect(form.controls.mobileNumber.valid).toBeFalse();
    expect(form.controls.email.valid).toBeFalse();
    expect(form.controls.linkedInUrl.valid).toBeFalse();
    form.patchValue({ mobileNumber: '9876543210', email: 'a@b.co', linkedInUrl: 'https://linkedin.com/in/x' });
    expect(form.controls.mobileNumber.valid).toBeTrue();
    expect(form.controls.email.valid).toBeTrue();
    expect(form.controls.linkedInUrl.valid).toBeTrue();
  });

  it('keeps the 10-digit number when a +91 number is pasted', () => {
    const fixture = render();
    const input = el(fixture).querySelector<HTMLInputElement>('#mobileNumber')!;
    input.value = '+91 98765 43210';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.form.controls.mobileNumber.value).toBe('9876543210');
  });

  it('rejects a photo that is too large or not an image', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    const pick = (file: File) => component.onPhotoSelected({ target: { files: [file], value: 'x' } } as unknown as Event);

    pick(new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    expect(component.photo).toBeNull();
    expect(component.photoError).toContain('JPG, PNG or WEBP');

    pick(new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' }));
    expect(component.photo).toBeNull();
    expect(component.photoError).toContain('2 MB');

    pick(new File(['x'], 'me.png', { type: 'image/png' }));
    expect(component.photo?.name).toBe('me.png');
    expect(component.photoError).toBeNull();
  });

  it('posts multipart form data and shows the success message', () => {
    const fixture = render();
    fillValid(fixture);
    fixture.componentInstance.toggleConnect('Just keep me updated', true);
    fixture.componentInstance.toggleConnect('Alumni Events', true);
    fixture.componentInstance.submit();

    const [req] = pendingPost();
    const body = req.request.body as FormData;
    expect(body instanceof FormData).toBeTrue();
    expect(body.get('FullName')).toBe('Asha Rai');
    expect(body.get('MobileNumber')).toBe('9876543210');
    expect(body.get('Course')).toBe('B.A. LL.B.');
    expect(body.get('BatchYear')).toBe('2015');
    // Form order, not click order.
    expect(body.get('ConnectThrough')).toBe('Alumni Events, Just keep me updated');
    expect(body.get('Consent')).toBe('true');
    expect(body.has('Photo')).toBeFalse();

    req.flush({ message: 'Saved', isSucceeded: true });
    fixture.detectChanges();
    expect(el(fixture).textContent).toContain("You're officially back in the alumni circle!");
    expect(el(fixture).textContent).toContain('Thank you for staying connected with us.');
    expect(el(fixture).querySelector('form')).toBeNull();
  });

  it('stays on the form with an error when the API reports failure', () => {
    const fixture = render();
    fillValid(fixture);
    fixture.componentInstance.submit();
    pendingPost()[0].flush({ message: 'Email already registered', isSucceeded: false });
    fixture.detectChanges();
    expect(el(fixture).querySelector('.submit-error')!.textContent).toContain('Email already registered');
    expect(el(fixture).querySelector('form')).not.toBeNull();
  });

  it('shows a friendly error when the request fails', () => {
    const fixture = render();
    fillValid(fixture);
    fixture.componentInstance.submit();
    pendingPost()[0].flush('Not Found', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(el(fixture).querySelector('.submit-error')!.textContent).toContain('could not submit');
    expect(fixture.componentInstance.submitting).toBeFalse();
  });
});
