# Bukti Pengambilan Feature - Deployment Guide

## Phase 1: Core Upload Feature - COMPLETED ✅

### Files Created/Modified:

1. **NEW: `js/services/storage-service.js`** (141 lines)

   - Complete Firebase Storage service
   - Image compression (max 500KB)
   - Upload, validate, delete functions
   - Organized folder structure (year/month)

2. **MODIFIED: `data-servis.html`**

   - Added SweetAlert2 CDN
   - Added browser-image-compression library
   - Added file input in update modal
   - Added image preview section
   - Added photo viewer modal

3. **MODIFIED: `js/pages/data-servis.js`**

   - Imported storage-service functions
   - Added image preview handler
   - Modified saveStatusUpdate with photo upload
   - Added validation (photo mandatory when "Sudah Diambil")
   - Added "Bukti Pengambilan" column in table
   - Added viewPhoto function for lightbox
   - Updated with SweetAlert notifications

4. **MODIFIED: `js/services/servis-service.js`**

   - Updated updateServisStatus function signature
   - Added buktiPengambilanUrl and buktiPengambilanPath parameters
   - Store photo metadata in Firestore

5. **NEW: `storage.rules`**
   - Firebase Storage security rules
   - Authenticated access only
   - Max 5MB file size
   - Images only (JPEG/PNG)

### Firebase Storage Deployment:

**IMPORTANT**: You must deploy the storage rules to Firebase before the feature will work.

#### Option 1: Using Firebase CLI (Recommended)

```powershell
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init storage

# Deploy storage rules
firebase deploy --only storage
```

#### Option 2: Using Firebase Console (Manual)

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: **melati-app**
3. Navigate to **Storage** → **Rules**
4. Copy the content from `storage.rules` file
5. Paste into the Firebase Console editor
6. Click **Publish**

### Verification Checklist:

- [ ] Browser-image-compression library loaded (check browser console)
- [ ] SweetAlert2 library loaded
- [ ] Firebase Storage rules deployed
- [ ] Test upload with status "Sudah Diambil"
- [ ] Verify photo appears in table with icon button
- [ ] Test view photo in lightbox modal
- [ ] Verify photo stored in correct path: `/bukti-pengambilan/{year}/{month}/`
- [ ] Test validation: photo mandatory when "Sudah Diambil"
- [ ] Test file size limit and compression

### Storage Structure:

```
gs://your-bucket/bukti-pengambilan/
  └── 2024/
      └── 01/
          ├── servis_abc123_1704067200000.jpg
          ├── custom_xyz789_1704153600000.jpg
          └── ...
```

### File Naming Convention:

Format: `{jenisData}_{servisId}_{timestamp}.jpg`

Example:

- `servis_GVxJK4Ym7Rn0kLmP8qRs_1704067200000.jpg`
- `custom_TnZ2Xb9Lp5Qs8Yr3FmWv_1704153600000.jpg`

### User Flow:

1. User opens data servis page
2. Click "Edit" button on a row
3. Change "Status Pengambilan" to "Sudah Diambil"
4. Form expands showing:
   - Staf Handle (required)
   - Waktu Pengambilan (auto-filled)
   - **Bukti Pengambilan (required - NEW)**
5. User selects photo file (max 10MB)
6. Preview shows selected image
7. Click "Simpan"
8. Photo compresses automatically to max 500KB
9. Upload to Firebase Storage
10. URL saved to Firestore
11. Success notification shown
12. Table updates with photo icon button
13. Click icon to view full photo in lightbox

### Error Handling:

- Invalid file type → SweetAlert error
- File too large (>10MB) → SweetAlert error
- Missing photo when "Sudah Diambil" → SweetAlert warning
- Upload failure → SweetAlert error with message
- Compression failure → SweetAlert error

### Budget Management Strategy:

**Current Implementation**: Upload only (Phase 1)

**Future Phase 2**: Export & Delete feature will allow:

- Export data to Excel with download links
- Export photos as ZIP file
- Batch delete from Storage and Firestore
- Recommended: Monthly export and delete to minimize storage costs

**Estimated Storage**:

- Average file size: 300-500KB (after compression)
- 100 transactions/month = ~30-50MB
- 12 months = ~360-600MB (~0.6GB)
- Firebase Free Tier: 5GB storage, 1GB/day download
- Paid Plan: $0.026/GB/month for storage

### Testing:

1. **Test Upload**:

   - Create test servis entry
   - Update status to "Sudah Diambil"
   - Upload test image (try large file >2MB)
   - Verify compression works
   - Check Firebase Storage console

2. **Test Validation**:

   - Try to save without photo → should block
   - Try invalid file type → should block
   - Try file >10MB → should block

3. **Test Display**:

   - Verify icon appears in table
   - Click icon → lightbox opens
   - Image loads correctly

4. **Test Edge Cases**:
   - Change status back to "Belum Diambil" → photo fields cleared
   - Upload then remove → can upload again
   - Multiple edits → photo persists

### Known Limitations:

1. **Legacy Data**: Old records without photos will show "-" in Bukti Pengambilan column (acceptable per requirements)

2. **No Delete on Status Change**: If user changes status from "Sudah Diambil" back to "Belum Diambil", the photo remains in Storage (will be cleaned in Phase 2)

3. **Single Photo Only**: Only one photo per transaction (per requirements)

4. **Manual Storage Management**: No automatic cleanup yet (Phase 2 feature)

### Next Steps (Phase 2 - Future):

- [ ] Create export-data.html page
- [ ] Create export-service.js
- [ ] Implement Excel export with photo links
- [ ] Implement ZIP download of photos
- [ ] Implement batch delete from Storage
- [ ] Implement batch delete from Firestore
- [ ] Add date range selector for export
- [ ] Add progress indicators
- [ ] Add confirmation dialogs

### Support:

If you encounter issues:

1. Check browser console for errors
2. Verify Firebase Storage rules deployed
3. Check Firebase project permissions
4. Verify file path in Storage console
5. Test network connectivity

### Security Notes:

- Only authenticated users can upload/view photos
- Photos stored in organized folders by date
- File size limits prevent abuse
- Only image files allowed (JPEG/PNG)
- Unique filenames prevent conflicts
