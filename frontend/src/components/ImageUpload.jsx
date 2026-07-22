import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

/**
 * Uploads an image straight to Cloudinary using a signature from our API.
 *
 * The file never touches our server: we only issue a short-lived signature
 * that fixes the folder, formats and transformation. That keeps large uploads
 * off the API entirely.
 */
const ImageUpload = ({ kind = 'menu', value, onChange, label = 'Image' }) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const signature = await api.getUploadSignature(kind, user?.token);

      // Checked here for a fast, clear message; Cloudinary enforces it too,
      // so this is convenience rather than the actual control.
      if (file.size > signature.maxBytes) {
        throw new Error(`Image must be under ${Math.round(signature.maxBytes / 1024 / 1024)}MB`);
      }

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', signature.apiKey);
      form.append('timestamp', signature.timestamp);
      form.append('signature', signature.signature);
      form.append('folder', signature.folder);
      form.append('allowed_formats', signature.allowedFormats.join(','));
      form.append('transformation', 'c_limit,w_1600,h_1600,q_auto:good');

      const response = await fetch(signature.uploadUrl, { method: 'POST', body: form });
      if (!response.ok) {
        throw new Error('Upload was rejected. Please try a different image.');
      }

      const result = await response.json();
      onChange(result.secure_url);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Allows re-selecting the same file after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const inputId = `image-upload-${kind}`;

  return (
    <div className="image-upload">
      <label htmlFor={inputId}>{label}</label>

      {value && (
        <div className="image-upload-preview">
          <img src={value} alt="Selected upload preview" />
          <button type="button" onClick={() => onChange('')} disabled={uploading}>
            Remove
          </button>
        </div>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFile}
        disabled={uploading}
      />

      {uploading && <p className="image-upload-status">Uploading…</p>}
      {error && (
        <p className="image-upload-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
