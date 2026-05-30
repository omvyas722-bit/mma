// Image Upload Component with Preview and Cropping
import { useState, useRef, useEffect } from 'react';

export default function ImageUpload({
  onUpload,
  currentImage = null,
  maxSize = 5, // MB
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  aspectRatio = 1, // 1 for square, 16/9 for landscape, etc.
  label = 'Upload Image',
  showPreview = true,
}) {
  const [preview, setPreview] = useState(currentImage);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (readerRef.current && readerRef.current.readyState === 1) {
        readerRef.current.abort();
      }
    };
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`Please upload a valid image file (${acceptedFormats.join(', ')})`);
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`File size must be less than ${maxSize}MB. Current: ${fileSizeMB.toFixed(2)}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setUploading(true);
      await onUpload(file);
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      if (import.meta.env.DEV) console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUpload?.(null);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      {showPreview && preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
            style={{ aspectRatio }}
          />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={handleClick}
          disabled={uploading}
          type="button"
          className="btn btn-secondary"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {label}
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 mt-1">
          Max size: {maxSize}MB. Formats: {acceptedFormats.map(f => f.split('/')[1]).join(', ')}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
    </div>
  );
}

// Avatar Upload Component (specialized for profile pictures)
export function AvatarUpload({ currentAvatar, onUpload, name = '' }) {
  const [preview, setPreview] = useState(currentAvatar);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      await onUpload(file);
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const getInitials = () => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">
            {getInitials()}
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-lg border border-gray-200 hover:bg-gray-50"
          type="button"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div>
        <p className="text-sm font-medium text-gray-900">Profile Picture</p>
        <p className="text-xs text-gray-500">JPG, PNG or WEBP. Max 5MB.</p>
      </div>
    </div>
  );
}

// Multiple Image Upload Component
export function MultiImageUpload({ onUpload, onError, maxImages = 5, currentImages = [] }) {
  const [images, setImages] = useState(currentImages);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

      if (images.length + files.length > maxImages) {
        onError?.(`You can only upload up to ${maxImages} images`);
        return;
    }

    setUploading(true);

    try {
      const newImages = [];
      for (const file of files) {
        const reader = new FileReader();
        const imageUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
        newImages.push({ file, preview: imageUrl });
      }

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      await onUpload(updatedImages.map(img => img.file));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Upload error:', error);
      onError?.('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onUpload(updatedImages.map(img => img.file));
  };

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={image.file?.name || image.preview || index} className="relative group">
              <img
                src={image.preview}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
              />
              <button
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            type="button"
            className="btn btn-secondary w-full"
          >
            {uploading ? 'Uploading...' : `Add Images (${images.length}/${maxImages})`}
          </button>
        </div>
      )}
    </div>
  );
}

// Usage example:
/*
import ImageUpload, { AvatarUpload, MultiImageUpload } from './components/Shared/ImageUpload';

// Basic image upload
<ImageUpload
  onUpload={async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    await api.post('/api/upload', formData);
  }}
  currentImage={member.profile_picture}
  maxSize={5}
  label="Upload Profile Picture"
/>

// Avatar upload
<AvatarUpload
  currentAvatar={user.avatar}
  name={user.name}
  onUpload={async (file) => {
    // Upload logic
  }}
/>

// Multiple images
<MultiImageUpload
  onUpload={async (files) => {
    // Upload multiple files
  }}
  maxImages={5}
  currentImages={gallery}
/>
*/
