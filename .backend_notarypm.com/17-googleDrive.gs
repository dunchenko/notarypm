/*
  Google Drive helpers for Apps Script.
  Copy this file into GAS as GoogleDrive.gs.
*/
const DRIVE_FOLDER_NAME = 'INTAKES';
const DRIVE_PARENT_FOLDER_ID = '1A9a_V0XajDe79zIJa3Uff7ndX-LXiWD9';
const TEMP_UPLOAD_FOLDER_NAME = 'Temp';
const TEMP_UPLOAD_FOLDER_ID = '1H4PLy_Q7OPJHVHlx-1znHq68OQ_gpJtA';
const TEMP_IMG_FOLDER_NAME = 'IMG';
const TEMP_TXT_FOLDER_NAME = 'Txt';
const TEMP_TESTTEXT_SHEET_FILE_NAME = 'testText-log';
const TEMP_TESTTEXT_SHEET_TAB_NAME = 'Entries';
const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const DRIVE_FILE_FIELDS = 'id,name,parents,webViewLink,webContentLink,mimeType,trashed,size';
const DRIVE_FOLDER_FIELDS = 'id,name,parents,webViewLink,mimeType,trashed';
const DRIVE_RESUMABLE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';

function buildDriveFileOpenUrl(fileId, fallbackUrl) {
  const cleanId = truncate(normalizeSingleLine(fileId || ''), 220);
  if (cleanId && /^[A-Za-z0-9_-]{10,}$/.test(cleanId)) {
    return `https://drive.google.com/file/d/${encodeUriValue(cleanId)}/view`;
  }
  let normalizedFallback = truncate(normalizeSingleLine(fallbackUrl || ''), 1000);
  if (!normalizedFallback) return '';
  if (/^\/\//.test(normalizedFallback)) {
    normalizedFallback = `https:${normalizedFallback}`;
  } else if (/^(?:www\.)?(?:drive|docs)\.google\.com\//i.test(normalizedFallback)) {
    normalizedFallback = `https://${normalizedFallback}`;
  }
  if (/^http:\/\/(?:www\.)?(?:drive|docs)\.google\.com\//i.test(normalizedFallback)) {
    normalizedFallback = normalizedFallback.replace(/^http:\/\//i, 'https://');
  }
  return sanitizeHttpUrl(normalizedFallback, 1000);
}

function buildDriveFolderOpenUrl(folderId, fallbackUrl) {
  const cleanId = truncate(normalizeSingleLine(folderId || ''), 220);
  if (cleanId && /^[A-Za-z0-9_-]{10,}$/.test(cleanId)) {
    return `https://drive.google.com/drive/folders/${encodeUriValue(cleanId)}`;
  }
  let normalizedFallback = truncate(normalizeSingleLine(fallbackUrl || ''), 1000);
  if (!normalizedFallback) return '';
  if (/^\/\//.test(normalizedFallback)) {
    normalizedFallback = `https:${normalizedFallback}`;
  } else if (/^(?:www\.)?(?:drive|docs)\.google\.com\//i.test(normalizedFallback)) {
    normalizedFallback = `https://${normalizedFallback}`;
  }
  if (/^http:\/\/(?:www\.)?(?:drive|docs)\.google\.com\//i.test(normalizedFallback)) {
    normalizedFallback = normalizedFallback.replace(/^http:\/\//i, 'https://');
  }
  return sanitizeHttpUrl(normalizedFallback, 1000);
}

function getFolderByIdSafe(folderId) {
  const clean = normalizeSingleLine(folderId || '');
  if (!clean) return null;
  try {
    return DriveApp.getFolderById(clean);
  } catch (e) {
    return null;
  }
}

function getFileByIdSafe(fileId) {
  const clean = normalizeSingleLine(fileId || '');
  if (!clean) return null;
  try {
    return DriveApp.getFileById(clean);
  } catch (e) {
    return null;
  }
}

function getDriveApiCommonArgs(fields) {
  return {
    fields: fields || DRIVE_FILE_FIELDS,
    supportsAllDrives: true
  };
}

function canUseAdvancedDriveFiles() {
  try {
    return Boolean(
      typeof Drive !== 'undefined' &&
      Drive &&
      Drive.Files &&
      typeof Drive.Files.get === 'function' &&
      typeof Drive.Files.list === 'function' &&
      typeof Drive.Files.create === 'function' &&
      typeof Drive.Files.update === 'function'
    );
  } catch (e) {
    return false;
  }
}

function getDriveAppItemParentIds(item) {
  const parentIds = [];
  if (!item || typeof item.getParents !== 'function') return parentIds;
  try {
    const parents = item.getParents();
    while (parents.hasNext()) {
      const parent = parents.next();
      const parentId = normalizeDriveId(parent && typeof parent.getId === 'function' ? parent.getId() : '', 180);
      if (parentId) parentIds.push(parentId);
    }
  } catch (e) { }
  return parentIds;
}

function toDriveMetaFromDriveAppFile(file) {
  if (!file) return null;
  return {
    id: normalizeDriveId(file.getId(), 180),
    name: normalizeSingleLine(file.getName()),
    parents: getDriveAppItemParentIds(file),
    webViewLink: normalizeSingleLine(file.getUrl() || ''),
    webContentLink: normalizeSingleLine(file.getUrl() || ''),
    mimeType: normalizeSingleLine(file.getMimeType ? file.getMimeType() : ''),
    trashed: Boolean(file.isTrashed && file.isTrashed()),
    size: Number(file.getSize ? file.getSize() : 0) || 0
  };
}

function toDriveMetaFromDriveAppFolder(folder) {
  if (!folder) return null;
  return {
    id: normalizeDriveId(folder.getId(), 180),
    name: normalizeSingleLine(folder.getName()),
    parents: getDriveAppItemParentIds(folder),
    webViewLink: normalizeSingleLine(folder.getUrl() || ''),
    webContentLink: normalizeSingleLine(folder.getUrl() || ''),
    mimeType: DRIVE_FOLDER_MIME_TYPE,
    trashed: Boolean(folder.isTrashed && folder.isTrashed())
  };
}

function escapeDriveQueryValue(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function getDriveFileMetaById(fileId, fields) {
  const cleanId = normalizeDriveId(fileId || '', 180);
  if (!cleanId) return null;
  if (canUseAdvancedDriveFiles()) {
    try {
      return Drive.Files.get(cleanId, getDriveApiCommonArgs(fields || DRIVE_FILE_FIELDS));
    } catch (e) { }
  }
  const file = getFileByIdSafe(cleanId);
  if (file) return toDriveMetaFromDriveAppFile(file);
  const folder = getFolderByIdSafe(cleanId);
  if (folder) return toDriveMetaFromDriveAppFolder(folder);
  return null;
}

function listDriveFiles(query, fields, pageSize) {
  const normalizedQuery = normalizeSingleLine(query || '');
  if (!normalizedQuery) return [];
  if (!canUseAdvancedDriveFiles()) return [];
  const items = [];
  let pageToken = '';
  do {
    const response = Drive.Files.list({
      q: normalizedQuery,
      fields: `files(${fields || DRIVE_FILE_FIELDS}),nextPageToken`,
      pageSize: Math.max(1, Number(pageSize) || 100),
      pageToken: pageToken || '',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    const files = Array.isArray(response && response.files) ? response.files : [];
    for (let i = 0; i < files.length; i++) {
      items.push(files[i]);
    }
    pageToken = normalizeSingleLine(response && response.nextPageToken ? response.nextPageToken : '');
  } while (pageToken);
  return items;
}

function findDriveFileByExactName(parentId, name, mimeType) {
  const cleanParentId = normalizeDriveId(parentId || '', 180);
  const cleanName = normalizeSingleLine(name || '');
  if (!cleanParentId || !cleanName) return null;
  if (canUseAdvancedDriveFiles()) {
    const clauses = [
      `'${escapeDriveQueryValue(cleanParentId)}' in parents`,
      'trashed = false',
      `name = '${escapeDriveQueryValue(cleanName)}'`
    ];
    if (mimeType) {
      clauses.push(`mimeType = '${escapeDriveQueryValue(mimeType)}'`);
    }
    const matches = listDriveFiles(clauses.join(' and '), mimeType === DRIVE_FOLDER_MIME_TYPE ? DRIVE_FOLDER_FIELDS : DRIVE_FILE_FIELDS, 10);
    if (matches.length) return matches[0];
  }
  const parentFolder = getFolderByIdSafe(cleanParentId);
  if (!parentFolder) return null;
  try {
    if (mimeType === DRIVE_FOLDER_MIME_TYPE) {
      const folders = parentFolder.getFoldersByName(cleanName);
      return folders.hasNext() ? toDriveMetaFromDriveAppFolder(folders.next()) : null;
    }
    const files = parentFolder.getFilesByName(cleanName);
    return files.hasNext() ? toDriveMetaFromDriveAppFile(files.next()) : null;
  } catch (e) {
    return null;
  }
}

function findDriveFolderContainingSession(parentId, sessionId) {
  const cleanParentId = normalizeDriveId(parentId || '', 180);
  const cleanSessionId = normalizeSingleLine(sessionId || '');
  if (!cleanParentId || !cleanSessionId) return null;
  if (canUseAdvancedDriveFiles()) {
    const matches = listDriveFiles(
      [
        `'${escapeDriveQueryValue(cleanParentId)}' in parents`,
        'trashed = false',
        `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
        `name contains '${escapeDriveQueryValue(cleanSessionId)}'`
      ].join(' and '),
      DRIVE_FOLDER_FIELDS,
      25
    );
    if (matches.length) return matches[0];
  }
  const parentFolder = getFolderByIdSafe(cleanParentId);
  if (!parentFolder) return null;
  try {
    const folders = parentFolder.getFolders();
    while (folders.hasNext()) {
      const folder = folders.next();
      if (String(folder.getName() || '').indexOf(cleanSessionId) !== -1) {
        return toDriveMetaFromDriveAppFolder(folder);
      }
    }
  } catch (e) { }
  return null;
}

function createDriveFolder(parentId, folderName) {
  const cleanParentId = normalizeDriveId(parentId || '', 180);
  const safeName = sanitizeFileName(folderName || 'Folder');
  if (!cleanParentId) {
    throw new Error('Parent folder ID is required.');
  }
  if (canUseAdvancedDriveFiles()) {
    try {
      const created = Drive.Files.create({
        name: safeName,
        mimeType: DRIVE_FOLDER_MIME_TYPE,
        parents: [cleanParentId]
      });
      const meta = getDriveFileMetaById(created && created.id ? created.id : '', DRIVE_FOLDER_FIELDS);
      if (meta) return meta;
    } catch (e) { }
  }
  const parentFolder = getFolderByIdSafe(cleanParentId);
  if (!parentFolder) throw new Error('Parent folder could not be resolved.');
  return toDriveMetaFromDriveAppFolder(parentFolder.createFolder(safeName));
}

function createDriveFile(parentId, fileName, mimeType, bytes) {
  const cleanParentId = normalizeDriveId(parentId || '', 180);
  const safeName = sanitizeFileName(fileName || 'file');
  const blobBytes = Array.isArray(bytes) ? bytes : [];
  if (!cleanParentId) {
    throw new Error('Parent folder ID is required.');
  }
  const blob = Utilities.newBlob(blobBytes, normalizeSingleLine(mimeType || '') || 'application/octet-stream', safeName);
  if (canUseAdvancedDriveFiles()) {
    try {
      return Drive.Files.create({
        name: safeName,
        parents: [cleanParentId]
      }, blob, getDriveApiCommonArgs(DRIVE_FILE_FIELDS));
    } catch (e) { }
  }
  const parentFolder = getFolderByIdSafe(cleanParentId);
  if (!parentFolder) throw new Error('Parent folder could not be resolved.');
  return toDriveMetaFromDriveAppFile(parentFolder.createFile(blob));
}

function normalizeDriveUploadKind(value) {
  const clean = normalizeSingleLine(value || '').toLowerCase();
  if (clean === 'camera' || clean === 'camera_evidence' || clean === 'x_mirror' || clean === 'test_lens') {
    return 'camera';
  }
  return 'attachment';
}

function normalizeDriveUploadSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) return 0;
  return Math.floor(size);
}

function getOrCreateDriveUploadSessionFolder(sessionId, uploadKind) {
  const cleanSessionId = truncate(
    normalizeSingleLine(sessionId || '').replace(/[^A-Za-z0-9_-]/g, ''),
    120
  ) || Utilities.getUuid();
  const tempRoot = getTempUploadRootFolder();
  const parentFolder = uploadKind === 'camera'
    ? getOrCreateSubFolder(tempRoot, TEMP_IMG_FOLDER_NAME)
    : tempRoot;
  const sessionFolder = getOrCreateSubFolder(parentFolder, cleanSessionId);
  const sessionFolderMeta = getDriveFileMetaById(sessionFolder.getId(), DRIVE_FOLDER_FIELDS);
  return {
    sessionId: cleanSessionId,
    folder: sessionFolder,
    folderId: sessionFolder.getId(),
    folderUrl: buildDriveFolderOpenUrl(sessionFolder.getId(), sessionFolderMeta && sessionFolderMeta.webViewLink),
    folderName: normalizeSingleLine(sessionFolder.getName() || '')
  };
}

function createDriveResumableUploadSession(data) {
  const payload = data && typeof data === 'object' ? data : {};
  const uploadKind = normalizeDriveUploadKind(
    payload.uploadKind || payload.kind || payload.fileKind || payload.source || payload.target || ''
  );
  const baseName = sanitizeFileName(payload.name || payload.fileName || payload.filename || 'attachment');
  const ext = getFileExtension(baseName);
  const fileType = normalizeSingleLine(payload.type || payload.mimeType || payload.mime || '').toLowerCase()
    || guessMimeByExt(ext);
  const clientFileKey = normalizeTempClientFileKey(
    payload.clientFileKey || payload.client_file_key || payload.tempFileKey || payload.temp_file_key || ''
  );
  const sizeBytes = normalizeDriveUploadSize(
    payload.sizeBytes || payload.size || payload.byteLength || payload.contentLength || 0
  );

  if (!baseName) throw new Error('File name is required.');
  if (!isAllowedFileType(fileType, ext)) throw new Error(`Unsupported file type: ${baseName}`);
  if (uploadKind === 'camera' && String(fileType || '').indexOf('image/') !== 0) {
    throw new Error('Camera evidence must be an image.');
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) throw new Error(`File too large: ${baseName}`);

  const folderInfo = getOrCreateDriveUploadSessionFolder(
    payload.sessionId || payload.sid || payload.k || '',
    uploadKind
  );
  const storedName = buildTempUploadStoredFileName(baseName, clientFileKey);
  const metadata = {
    name: storedName,
    parents: [folderInfo.folderId],
    mimeType: fileType
  };
  const initUrl = `${DRIVE_RESUMABLE_UPLOAD_ENDPOINT}?uploadType=resumable&supportsAllDrives=true&fields=${encodeUriValue(DRIVE_FILE_FIELDS)}`;
  const response = UrlFetchApp.fetch(initUrl, {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    payload: JSON.stringify(metadata),
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
      'X-Upload-Content-Type': fileType,
      'X-Upload-Content-Length': String(sizeBytes),
      'Origin': normalizeSingleLine(payload.origin || 'https://hannadunchenko.com')
    },
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const headers = response.getHeaders ? response.getHeaders() : {};
  const uploadUrl = normalizeSingleLine(
    (headers && (headers.Location || headers.location)) || ''
  );

  if (code < 200 || code >= 300 || !uploadUrl) {
    const body = truncate(normalizeSingleLine(response.getContentText() || ''), 400);
    throw new Error(`Drive upload session failed (${code})${body ? `: ${body}` : ''}`);
  }

  return {
    success: true,
    uploadKind: uploadKind,
    sessionId: folderInfo.sessionId,
    folderId: folderInfo.folderId,
    folderUrl: folderInfo.folderUrl,
    folderName: folderInfo.folderName,
    uploadUrl: uploadUrl,
    name: baseName,
    storedName: storedName,
    type: fileType,
    sizeBytes: sizeBytes,
    clientFileKey: clientFileKey,
    v: folderInfo.folderId,
    u: folderInfo.folderUrl,
    t: folderInfo.folderName
  };
}

function updateDriveFileMetadata(fileId, resource, fields, extraArgs) {
  const cleanId = normalizeDriveId(fileId || '', 180);
  if (!cleanId) return null;
  if (canUseAdvancedDriveFiles()) {
    try {
      const args = getDriveApiCommonArgs(fields || DRIVE_FILE_FIELDS);
      if (extraArgs && typeof extraArgs === 'object') {
        Object.keys(extraArgs).forEach(key => {
          args[key] = extraArgs[key];
        });
      }
      return Drive.Files.update(resource || {}, cleanId, null, args);
    } catch (e) { }
  }
  const file = getFileByIdSafe(cleanId);
  if (file) {
    const args = extraArgs && typeof extraArgs === 'object' ? extraArgs : {};
    const addParents = String(args.addParents || '').split(',').map(v => normalizeDriveId(v, 180)).filter(Boolean);
    const removeParents = String(args.removeParents || '').split(',').map(v => normalizeDriveId(v, 180)).filter(Boolean);
    addParents.forEach(parentId => {
      const folder = getFolderByIdSafe(parentId);
      if (!folder) return;
      try { folder.addFile(file); } catch (e) { }
    });
    removeParents.forEach(parentId => {
      const folder = getFolderByIdSafe(parentId);
      if (!folder) return;
      try { folder.removeFile(file); } catch (e) { }
    });
    if (resource && resource.name) {
      try { file.setName(sanitizeFileName(resource.name)); } catch (e) { }
    }
    if (resource && typeof resource.trashed === 'boolean') {
      try { file.setTrashed(resource.trashed); } catch (e) { }
    }
    return toDriveMetaFromDriveAppFile(file);
  }
  const folder = getFolderByIdSafe(cleanId);
  if (folder) {
    if (resource && resource.name) {
      try { folder.setName(sanitizeFileName(resource.name)); } catch (e) { }
    }
    if (resource && typeof resource.trashed === 'boolean') {
      try { folder.setTrashed(resource.trashed); } catch (e) { }
    }
    return toDriveMetaFromDriveAppFolder(folder);
  }
  return null;
}

function moveDriveFileToFolder(fileId, targetFolderId, nextName) {
  const cleanFileId = normalizeDriveId(fileId || '', 180);
  const cleanTargetFolderId = normalizeDriveId(targetFolderId || '', 180);
  if (!cleanFileId || !cleanTargetFolderId) return null;
  const current = getDriveFileMetaById(cleanFileId, DRIVE_FILE_FIELDS);
  if (!current) return null;

  const currentParents = Array.isArray(current.parents) ? current.parents.filter(Boolean) : [];
  const args = {};
  if (currentParents.indexOf(cleanTargetFolderId) === -1) {
    args.addParents = cleanTargetFolderId;
  }
  const removableParents = currentParents.filter(parentId => parentId !== cleanTargetFolderId);
  if (removableParents.length) {
    args.removeParents = removableParents.join(',');
  }

  const resource = {};
  const safeNextName = sanitizeFileName(nextName || '');
  if (safeNextName && normalizeSingleLine(current.name || '') !== safeNextName) {
    resource.name = safeNextName;
  }

  if (!Object.keys(args).length && !Object.keys(resource).length) {
    return current;
  }

  return updateDriveFileMetadata(cleanFileId, resource, DRIVE_FILE_FIELDS, args);
}

function setDriveItemTrashed(fileId, trashed) {
  const cleanId = normalizeDriveId(fileId || '', 180);
  if (!cleanId) return false;
  try {
    const updated = updateDriveFileMetadata(cleanId, { trashed: trashed === true }, 'id,trashed');
    return Boolean(updated && updated.id);
  } catch (e) {
    return false;
  }
}

function moveFileToFolderSafe(fileId, folder) {
  if (!folder || !fileId) return '';
  try {
    const moved = moveDriveFileToFolder(fileId, folder.getId(), '');
    return buildDriveFileOpenUrl(moved && moved.id, moved && (moved.webViewLink || moved.webContentLink));
  } catch (e) {
    return '';
  }
}

function isDriveFileParentedByFolder(file, folder) {
  if (!file || !folder) return false;
  const fileId = normalizeDriveId(typeof file.getId === 'function' ? file.getId() : file.id, 180);
  const targetFolderId = normalizeDriveId(typeof folder.getId === 'function' ? folder.getId() : folder.id, 180);
  if (!fileId || !targetFolderId) return false;
  const meta = getDriveFileMetaById(fileId, 'id,parents');
  return Boolean(meta && Array.isArray(meta.parents) && meta.parents.indexOf(targetFolderId) !== -1);
}

function buildEmailDriveAttachments(uploadedFiles) {
  const attachments = [];
  let currentTotalSize = 0;
  const maxTotalAttachmentSize = 15 * 1024 * 1024;
  if (!Array.isArray(uploadedFiles)) return attachments;

  uploadedFiles.forEach(f => {
    if (!(f && f.id)) return;
    try {
      const dFile = DriveApp.getFileById(f.id);
      const fSize = dFile.getSize();
      if (currentTotalSize + fSize <= maxTotalAttachmentSize) {
        attachments.push(dFile.getBlob());
        currentTotalSize += fSize;
      }
    } catch (attErr) {
      Logger.log(`Skipping attachment for ${(f && f.name) || 'unknown'}: ${attErr.message}`);
    }
  });

  return attachments;
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}

function getClientBookingsParentFolder() {
  const byId = getFolderByIdSafe(DRIVE_PARENT_FOLDER_ID);
  return byId || getOrCreateFolder(DRIVE_FOLDER_NAME);
}

function getTempUploadRootFolder() {
  const byId = getFolderByIdSafe(TEMP_UPLOAD_FOLDER_ID);
  return byId || getOrCreateFolder(TEMP_UPLOAD_FOLDER_NAME);
}

function getOrCreateSubFolder(parentFolder, folderName) {
  if (!parentFolder) throw new Error('Parent folder is required.');
  const parentId = normalizeDriveId(parentFolder.getId(), 180);
  const safeName = sanitizeFileName(folderName || 'Folder');
  const existing = findDriveFileByExactName(parentId, safeName, DRIVE_FOLDER_MIME_TYPE);
  if (existing && existing.id) {
    return getFolderByIdSafe(existing.id) || parentFolder;
  }
  const created = createDriveFolder(parentId, safeName);
  return getFolderByIdSafe(created && created.id) || parentFolder.createFolder(safeName);
}

function normalizeDriveId(value, maxLen) {
  return truncate(
    normalizeSingleLine(value || '').replace(/[^A-Za-z0-9_-]/g, ''),
    Number.isInteger(maxLen) && maxLen > 0 ? maxLen : 160
  );
}

function buildClientFolderLabel(name, bookingId) {
  const bookingDate = Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy.MM.dd HH-mm');
  const safeName = sanitizeFileName(name || 'Client').replace(/\./g, '_');
  return `${safeName} ${bookingDate}`.trim();
}

function alignPreparedFolderName(folder, name) {
  if (!folder) return '';
  const currentName = normalizeSingleLine(folder.getName());
  const safeName = sanitizeFileName(name || 'Client').replace(/\./g, '_');
  const timestampMatch = currentName.match(/(\d{4}\.\d{2}\.\d{2}\s\d{2}-\d{2})$/);
  const timestamp = timestampMatch
    ? timestampMatch[1]
    : Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy.MM.dd HH-mm');
  const nextName = `${safeName} ${timestamp}`.trim();
  if (nextName && nextName !== currentName) {
    try { folder.setName(nextName); } catch (e) { }
  }
  return normalizeSingleLine(folder.getName());
}

function resolveReusableClientFolder(parentFolder, folderId) {
  if (!parentFolder) return null;
  const cleanId = normalizeDriveId(folderId || '', 180);
  if (!cleanId) return null;
  const meta = getDriveFileMetaById(cleanId, DRIVE_FOLDER_FIELDS);
  if (!meta || meta.mimeType !== DRIVE_FOLDER_MIME_TYPE) return null;
  const parentId = normalizeDriveId(parentFolder.getId(), 180);
  if (Array.isArray(meta.parents) && meta.parents.indexOf(parentId) !== -1) {
    return getFolderByIdSafe(cleanId);
  }
  return null;
}

function prepareClientFolder(data) {
  try {
    const name = normalizeSingleLine(data && (data.name || data.n));
    if (name.length < NAME_MIN || name.length > NAME_MAX || hasUnsafeChars(name)) {
      return { success: false, error: 'Invalid name.' };
    }

    const parentFolder = getClientBookingsParentFolder();
    const existingFolderId = normalizeDriveId(
      data && (data.folderId || data.v || data.precreatedFolderId || data.preFolderId || data.pre_folder_id || data.prefolderId || data.z3),
      180
    );
    const reusable = resolveReusableClientFolder(parentFolder, existingFolderId);
    if (reusable) {
      const alignedName = alignPreparedFolderName(reusable, name);
      const reusableFolderUrl = buildDriveFolderOpenUrl(reusable.getId(), reusable.getUrl());
      return {
        success: true,
        folderId: reusable.getId(),
        folderUrl: reusableFolderUrl,
        folderName: alignedName || reusable.getName(),
        v: reusable.getId(),
        u: reusableFolderUrl,
        t: alignedName || reusable.getName(),
        reused: true
      };
    }

    const folderLabel = buildClientFolderLabel(name, '');
    const createdMeta = createDriveFolder(parentFolder.getId(), folderLabel);
    const clientFolder = getFolderByIdSafe(createdMeta && createdMeta.id);
    if (!clientFolder) throw new Error('Failed to create final intake folder.');
    return {
      success: true,
      folderId: clientFolder.getId(),
      folderUrl: buildDriveFolderOpenUrl(clientFolder.getId(), createdMeta && createdMeta.webViewLink),
      folderName: clientFolder.getName(),
      v: clientFolder.getId(),
      u: buildDriveFolderOpenUrl(clientFolder.getId(), createdMeta && createdMeta.webViewLink),
      t: clientFolder.getName(),
      reused: false
    };
  } catch (e) {
    return { success: false, error: String(e && e.message ? e.message : e) };
  }
}

function resolvePrebookingUploadFolderMeta(data) {
  try {
    const payload = data && typeof data === 'object' ? data : {};
    const name = normalizeSingleLine(payload.name || payload.n || '');
    const existingFolderId = normalizeDriveId(
      payload.folderId || payload.v || payload.precreatedFolderId || payload.preFolderId || payload.pre_folder_id || payload.prefolderId || payload.z3 || '',
      180
    );
    if (!existingFolderId && (name.length < NAME_MIN || name.length > NAME_MAX || hasUnsafeChars(name))) {
      return null;
    }

    const prepared = prepareClientFolder({
      name: name,
      n: name,
      folderId: existingFolderId,
      v: existingFolderId
    });
    if (!prepared || prepared.success !== true) return null;

    const folderId = normalizeDriveId(prepared.folderId || prepared.v || '', 180);
    const folder = getFolderByIdSafe(folderId);
    if (!folder) return null;
    const folderMeta = getDriveFileMetaById(folderId, DRIVE_FOLDER_FIELDS);

    return {
      folder: folder,
      folderId: folder.getId(),
      folderUrl: buildDriveFolderOpenUrl(folder.getId(), folderMeta && folderMeta.webViewLink),
      folderName: normalizeSingleLine(prepared.folderName || prepared.t || folder.getName() || '')
    };
  } catch (e) {
    return null;
  }
}

/**
 * Final INTAKE promotion policy.
 * Only files explicitly present in the user's final visible list may move from Temp.
 */
class FinalIntakeFilePolicy {
  static hasFinalTempReference(file) {
    return Boolean(
      file &&
      file.synced === true &&
      normalizeDriveId(file.fileId || file.id || '', 180) &&
      normalizeTempClientFileKey(file.clientFileKey || file.client_file_key || '')
    );
  }

  static hasExpectedTempName(file, fileMeta) {
    const baseName = sanitizeFileName(file && file.name || 'attachment');
    const clientFileKey = normalizeTempClientFileKey(file && (file.clientFileKey || file.client_file_key) || '');
    const expectedName = buildTempUploadStoredFileName(baseName, clientFileKey);
    const actualName = normalizeSingleLine(fileMeta && fileMeta.name || '');
    return Boolean(expectedName && actualName === expectedName);
  }

  static canPromoteDriveFile(file, fileMeta, tempSessionFolderMeta, clientFolder) {
    const clientFolderId = normalizeDriveId(
      clientFolder && typeof clientFolder.getId === 'function' ? clientFolder.getId() : '',
      180
    );
    const tempFolderId = normalizeDriveId(tempSessionFolderMeta && tempSessionFolderMeta.id || '', 180);
    const parentIds = Array.isArray(fileMeta && fileMeta.parents)
      ? fileMeta.parents.map(parentId => normalizeDriveId(parentId, 180)).filter(Boolean)
      : [];

    if (clientFolderId && parentIds.indexOf(clientFolderId) !== -1) return true;
    return Boolean(
      tempFolderId &&
      parentIds.indexOf(tempFolderId) !== -1 &&
      FinalIntakeFilePolicy.hasExpectedTempName(file, fileMeta)
    );
  }
}

function saveClientDataAndFiles(data) {
  const parentFolder = getClientBookingsParentFolder();
  const existingFolderId = normalizeDriveId(
    data.precreatedFolderId || data.preFolderId || data.pre_folder_id || data.prefolderId || data.folderId || data.z3 || '',
    180
  );
  const reusableFolder = resolveReusableClientFolder(parentFolder, existingFolderId);
  const createdClientFolderMeta = reusableFolder
    ? null
    : createDriveFolder(parentFolder.getId(), buildClientFolderLabel(data.name, data.bookingId));
  const clientFolder = reusableFolder || getFolderByIdSafe(createdClientFolderMeta && createdClientFolderMeta.id);
  if (!clientFolder) {
    throw new Error('Failed to prepare the final INTAKES folder.');
  }
  const clientFolderMeta = getDriveFileMetaById(clientFolder.getId(), DRIVE_FOLDER_FIELDS);
  const clientFolderUrl = buildDriveFolderOpenUrl(clientFolder.getId(), clientFolderMeta && clientFolderMeta.webViewLink);
  const uploadedFiles = [];

  let info = 'CLIENT BOOKING DETAILS\n======================\n\n';
  info += `Name: ${data.name}\n`;
  info += `Occupation: ${data.occupation || 'N/A'}\n`;
  info += `Phone: ${data.phone}\n`;
  info += `Email: ${data.email}\n`;
  info += `Date: ${data.dateStr}\n`;
  if (data.service) info += `Service: ${getBookingServiceDisplayText(data) || data.service}\n`;
  if (data.dob) info += `DOB: ${data.dob}\n`;
  if (data.age) info += `Age: ${data.age}\n`;
  if (data.referralSource) info += `Referral Source: ${normalizeSingleLine(data.referralSource)}\n`;
  if (data.deadline) info += `Deadline: ${data.deadline}\n`;
  info += `Terms Accepted: ${data.agreeTerms ? 'Yes' : 'No'}\n`;
  if (data.address) info += `Address: ${data.address}\n`;
  if (data.cameraEvidenceSessionId) info += `Camera Evidence Session: ${data.cameraEvidenceSessionId}\n`;
  info += `\nNOTES:\n${data.notes || 'None'}\n\nTechnical:\nClient Context: ${data.userInfo || 'N/A'}`;

  const buildFinalAttachmentName = (baseName, prefix) => {
    if (!prefix) return baseName;
    return baseName.indexOf(`${prefix}-`) === 0 ? baseName : `${prefix}-${baseName}`;
  };

  const moveOrAppendDriveFiles = (files, prefix, isCamera) => {
    if (!files || !Array.isArray(files)) return;

    let tempSessionFolderMeta = null;
    try {
      const sessionId = isCamera ? data.cameraEvidenceSessionId : data.fileSessionId;
      const cleanSessionId = normalizeSingleLine(sessionId || '');
      if (cleanSessionId) {
        const tempRoot = getTempUploadRootFolder();
        let searchRoot = tempRoot;
        if (isCamera) {
          searchRoot = getOrCreateSubFolder(tempRoot, TEMP_IMG_FOLDER_NAME);
        }
        tempSessionFolderMeta = findDriveFolderContainingSession(searchRoot.getId(), cleanSessionId);
      }
    } catch (e) { }

    files.forEach(file => {
      try {
        const baseName = sanitizeFileName(file.name || 'attachment');
        const finalName = buildFinalAttachmentName(baseName, prefix);
        let moved = false;

        if (file.synced === true && !FinalIntakeFilePolicy.hasFinalTempReference(file)) {
          Logger.log(`Skipped Temp file without final reference: ${baseName}`);
          return;
        }

        if (file.fileId) {
          try {
            const fileMeta = getDriveFileMetaById(file.fileId, DRIVE_FILE_FIELDS);
            if (FinalIntakeFilePolicy.canPromoteDriveFile(file, fileMeta, tempSessionFolderMeta, clientFolder)) {
              const movedMeta = moveDriveFileToFolder(file.fileId, clientFolder.getId(), finalName);
              if (movedMeta && movedMeta.id) {
                uploadedFiles.push({
                  name: finalName,
                  url: buildDriveFileOpenUrl(movedMeta.id, movedMeta.webViewLink || movedMeta.webContentLink || ''),
                  id: movedMeta.id
                });
                moved = true;
              }
            }
          } catch (moveErr) {
            Logger.log(`Move by ID failed for ${baseName}: ${moveErr.message}`);
          }
        }

        if (!moved && file.bytes && file.bytes.length) {
          const fileName = finalName;
          const ext = getFileExtension(fileName);
          const fileType = normalizeSingleLine(file.type || '').toLowerCase() || guessMimeByExt(ext);
          const driveFile = createDriveFile(clientFolder.getId(), fileName, fileType, file.bytes);
          uploadedFiles.push({
            name: fileName,
            url: buildDriveFileOpenUrl(driveFile && driveFile.id, driveFile && (driveFile.webViewLink || driveFile.webContentLink || '')),
            id: driveFile && driveFile.id ? driveFile.id : ''
          });
        } else if (!moved && file.synced) {
          Logger.log(`Skipped Temp file outside final session folder: ${baseName}`);
        }
      } catch (e) { }
    });
  };

  moveOrAppendDriveFiles(data.files, '', false);
  // Diagnostic camera-test files are not final intake attachments; user photos are in data.files.

  const clientFolderFallbackUrl = clientFolderUrl || buildDriveFolderOpenUrl(clientFolder.getId(), '');
  if (uploadedFiles.length > 0) {
    info += '\nATTACHED FILES:\n';
    uploadedFiles.forEach(f => {
      const driveUrl = buildDriveFileOpenUrl(f && f.id, (f && f.url) || '') || clientFolderFallbackUrl;
      if (driveUrl) info += `- ${f.name}: ${driveUrl}\n`;
      else info += `- ${f.name} (Link unavailable)\n`;
    });
  }

  const clientInfoFileName = 'Client_Info.txt';
  const textBytes = Utilities.newBlob(info, MimeType.PLAIN_TEXT, clientInfoFileName).getBytes();
  const textFile = createDriveFile(clientFolder.getId(), clientInfoFileName, MimeType.PLAIN_TEXT, textBytes);
  uploadedFiles.unshift({
    name: clientInfoFileName,
    url: buildDriveFileOpenUrl(textFile && textFile.id, textFile && (textFile.webViewLink || textFile.webContentLink || '')),
    id: textFile && textFile.id ? textFile.id : ''
  });

  return {
    folderId: clientFolder.getId(),
    folderUrl: clientFolderUrl,
    files: uploadedFiles
  };
}

function isClientInfoFileName(fileName) {
  const normalized = normalizeSingleLine(fileName || '').toLowerCase();
  return normalized === 'client_info.txt';
}

function getUserUploadedFiles(uploadedFiles) {
  return Array.isArray(uploadedFiles)
    ? uploadedFiles.filter(file => !isClientInfoFileName(file && file.name))
    : [];
}

function saveCameraEvidenceDuplicateFiles(sessionId, files) {
  const tempRoot = getTempUploadRootFolder();
  const imgRoot = getOrCreateSubFolder(tempRoot, TEMP_IMG_FOLDER_NAME);
  const timestamp = Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd_HH-mm-ss');
  const sessionFolderMeta = createDriveFolder(imgRoot.getId(), `${timestamp}_${sessionId}`);
  const sessionFolder = getFolderByIdSafe(sessionFolderMeta && sessionFolderMeta.id);
  if (!sessionFolder) {
    throw new Error('Could not create Temp/IMG session folder.');
  }
  const uploadedFiles = [];

  files.forEach((file, idx) => {
    if (!file || !file.bytes || !file.bytes.length) return;
    const role = idx === 0 ? 'front' : 'rear';
    const baseName = sanitizeFileName(file.name || `camera-${role}.jpg`);
    const fileName = `${role}-${baseName}`;
    const ext = getFileExtension(fileName);
    const fileType = normalizeSingleLine(file.type || '').toLowerCase() || guessMimeByExt(ext);
    const driveFile = createDriveFile(sessionFolder.getId(), fileName, fileType, file.bytes);
    uploadedFiles.push({
      name: fileName,
      url: buildDriveFileOpenUrl(driveFile && driveFile.id, driveFile && (driveFile.webViewLink || driveFile.webContentLink || '')),
      id: driveFile && driveFile.id ? driveFile.id : ''
    });
  });

  return {
    folderId: sessionFolder.getId(),
    folderUrl: buildDriveFolderOpenUrl(sessionFolder.getId(), sessionFolderMeta && sessionFolderMeta.webViewLink),
    files: uploadedFiles
  };
}

function saveCameraEvidenceFilesToFolder(folder, files) {
  if (!folder) throw new Error('Client folder is required for camera evidence upload.');
  const uploadedFiles = [];

  files.forEach((file) => {
    if (!file || !file.bytes || !file.bytes.length) return;
    const baseName = sanitizeFileName(file.name || 'camera-evidence.jpg');
    const ext = getFileExtension(baseName);
    const fileType = normalizeSingleLine(file.type || '').toLowerCase() || guessMimeByExt(ext);
    const existing = findDriveFileByExactName(folder.getId(), baseName, '');
    const driveFile = existing && existing.id
      ? moveDriveFileToFolder(existing.id, folder.getId(), baseName)
      : createDriveFile(folder.getId(), baseName, fileType, file.bytes);
    uploadedFiles.push({
      name: baseName,
      url: buildDriveFileOpenUrl(driveFile && driveFile.id, driveFile && (driveFile.webViewLink || driveFile.webContentLink || '')),
      id: driveFile && driveFile.id ? driveFile.id : ''
    });
  });

  return {
    folderId: folder.getId(),
    folderUrl: buildDriveFolderOpenUrl(folder.getId(), ''),
    files: uploadedFiles
  };
}

function testFiles(data) {
  const normalizedFiles = validateAndNormalizeFiles(data.files || data.p);
  const sessionId = truncate(
    normalizeSingleLine(data.sessionId || data.sid || data.k || '').replace(/[^A-Za-z0-9_-]/g, ''),
    120
  ) || Utilities.getUuid();
  const sessionFolder = getOrCreateSubFolder(getTempUploadRootFolder(), sessionId);
  const sessionFolderMeta = getDriveFileMetaById(sessionFolder.getId(), DRIVE_FOLDER_FIELDS);
  const uploadedFiles = [];
  const uploadsTargetLabel = 'Temp upload';

  normalizedFiles.forEach((file, idx) => {
    if (!file || !file.bytes || !file.bytes.length) return;

    const baseName = sanitizeFileName(file.name || `attachment-${idx + 1}`);
    const storedName = buildTempUploadStoredFileName(baseName, file.clientFileKey || '');
    const ext = getFileExtension(storedName);
    const fileType = normalizeSingleLine(file.type || '').toLowerCase() || guessMimeByExt(ext);
    const existing = findDriveFileByExactName(sessionFolder.getId(), storedName, '');
    const driveFile = existing && existing.id
      ? moveDriveFileToFolder(existing.id, sessionFolder.getId(), storedName)
      : createDriveFile(sessionFolder.getId(), storedName, fileType, file.bytes);
    uploadedFiles.push({
      name: baseName,
      storedName: storedName,
      url: buildDriveFileOpenUrl(driveFile && driveFile.id, driveFile && (driveFile.webViewLink || driveFile.webContentLink || '')),
      id: driveFile && driveFile.id ? driveFile.id : '',
      clientFileKey: file.clientFileKey || ''
    });
  });

  const detailLinks = uploadedFiles.slice(0, 6).map((file, idx) => ({
    label: truncate(normalizeSingleLine(file && file.name ? file.name : `testFiles file ${idx + 1}`), 80),
    url: truncate(normalizeSingleLine(file && file.url ? file.url : ''), 500)
  })).filter(link => link.label && link.url);
  const folderUrlForLog = truncate(normalizeSingleLine(buildDriveFolderOpenUrl(sessionFolder.getId(), sessionFolderMeta && sessionFolderMeta.webViewLink) || ''), 500);
  if (folderUrlForLog) {
    detailLinks.unshift({ label: 'testFiles folder', url: folderUrlForLog });
  }

  try {
    logUsage({
      event: 'testFiles',
      details: `${uploadsTargetLabel} | Session: ${sessionId} | Files: ${uploadedFiles.length}`,
      detailLinks: detailLinks,
      sessionId: sessionId,
      fileSessionId: sessionId,
      testFilesSessionId: sessionId,
      folderId: sessionFolder.getId(),
      folderUrl: folderUrlForLog,
      severity: 'info',
      userInfo: data.userInfo || '',
      fingerprint: data.fingerprint || '',
      countryCode: data.countryCode || '',
      city: data.city || '',
      ip: data.ip || '',
      lang: data.lang || '',
      os: data.os || '',
      deviceModel: data.deviceModel || '',
      screenResolution: data.screenResolution || '',
      viewport: data.viewport || '',
      timezone: data.timezone || '',
      cores: data.cores || '',
      memoryGB: data.memoryGB || '',
      network: data.network || '',
      touchPoints: data.touchPoints || '',
      colorDepth: data.colorDepth || '',
      pageUrl: data.pageUrl || '',
      referrer: data.referrer || '',
      userAgent: data.userAgent || ''
    });
  } catch (e) { }

  return {
    success: true,
    sessionId: sessionId,
    folderId: sessionFolder.getId(),
    folderUrl: buildDriveFolderOpenUrl(sessionFolder.getId(), sessionFolderMeta && sessionFolderMeta.webViewLink),
    folderName: normalizeSingleLine(sessionFolder.getName() || ''),
    v: sessionFolder.getId(),
    u: buildDriveFolderOpenUrl(sessionFolder.getId(), sessionFolderMeta && sessionFolderMeta.webViewLink),
    t: normalizeSingleLine(sessionFolder.getName() || ''),
    files: uploadedFiles
  };
}

function handleCameraDualCapture(data) {
  const normalizedFiles = validateAndNormalizeCameraEvidenceFiles(data.files || data.p);
  if (normalizedFiles.length !== 2) {
    throw new Error('Exactly 2 camera evidence photos are required.');
  }

  const sessionId = truncate(
    normalizeSingleLine(data.sessionId || data.k || '').replace(/[^A-Za-z0-9_-]/g, ''),
    120
  ) || Utilities.getUuid();
  const saved = saveCameraEvidenceDuplicateFiles(sessionId, normalizedFiles);
  const slotIso = truncate(normalizeSingleLine(data.slotIso || data.q || ''), 40);
  const slotText = truncate(normalizeSingleLine(data.slotText || data.r || ''), 80);
  const detailLinks = [];
  const cameraFolderUrl = truncate(normalizeSingleLine(saved.folderUrl || ''), 500);
  if (cameraFolderUrl) {
    detailLinks.push({ label: 'Camera folder', url: cameraFolderUrl });
  }
  saved.files.forEach((f, idx) => {
    detailLinks.push({
      label: idx === 0 ? 'Front Camera File' : 'Rear Camera File',
      url: f.url
    });
  });

  const logResult = logUsage({
    event: 'CAMERA EVIDENCE DUPLICATE',
    details: `Session: ${sessionId} | Slot: ${slotIso || 'N/A'} ${slotText || ''}`.trim(),
    sessionId: sessionId,
    cameraEvidenceSessionId: sessionId,
    folderUrl: saved.folderUrl || '',
    severity: 'info',
    userInfo: data.userInfo || '',
    fingerprint: data.fingerprint || '',
    countryCode: data.countryCode || '',
    city: data.city || '',
    ip: data.ip || '',
    lang: data.lang || '',
    os: data.os || '',
    deviceModel: data.deviceModel || '',
    screenResolution: data.screenResolution || '',
    viewport: data.viewport || '',
    timezone: data.timezone || '',
    cores: data.cores || '',
    memoryGB: data.memoryGB || '',
    network: data.network || '',
    touchPoints: data.touchPoints || '',
    colorDepth: data.colorDepth || '',
    pageUrl: data.pageUrl || '',
    referrer: data.referrer || '',
    userAgent: data.userAgent || '',
    detailLinks: detailLinks
  });

  return {
    success: true,
    sessionId: sessionId,
    folderId: saved.folderId || '',
    folderUrl: saved.folderUrl,
    folderName: '',
    v: saved.folderId || '',
    u: saved.folderUrl || '',
    t: '',
    files: saved.files,
    log: logResult
  };
}

function trashFolderById(folderId) {
  return setDriveItemTrashed(folderId, true);
}

function trashCameraEvidenceFoldersBySession(sessionId) {
  const cleanSessionId = normalizeSingleLine(sessionId || '');
  if (!cleanSessionId) return 0;
  let removed = 0;

  const trashSessionFoldersInRoot = (rootId) => {
    const cleanRootId = normalizeDriveId(rootId || '', 180);
    if (!cleanRootId) return;
    const matches = listDriveFiles(
      [
        `'${escapeDriveQueryValue(cleanRootId)}' in parents`,
        'trashed = false',
        `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
        `name contains '${escapeDriveQueryValue(cleanSessionId)}'`
      ].join(' and '),
      DRIVE_FOLDER_FIELDS,
      50
    );
    matches.forEach(folderMeta => {
      if (folderMeta && folderMeta.id && setDriveItemTrashed(folderMeta.id, true)) {
        removed++;
      }
    });
  };

  const tempRoot = getTempUploadRootFolder();
  if (tempRoot) {
    const imgRoot = getOrCreateSubFolder(tempRoot, TEMP_IMG_FOLDER_NAME);
    if (imgRoot) {
      trashSessionFoldersInRoot(imgRoot.getId());
    }
  }

  const parent = getClientBookingsParentFolder();
  if (parent) {
    const evidenceFolder = findDriveFileByExactName(parent.getId(), '_CameraEvidenceDuplicates', DRIVE_FOLDER_MIME_TYPE);
    if (evidenceFolder && evidenceFolder.id) {
      trashSessionFoldersInRoot(evidenceFolder.id);
    }
  }

  return removed;
}

function exportClientSnapshot(meta) {
  const bookingId = normalizeSingleLine(meta.bookingId || '') || Utilities.getUuid().slice(0, 8);
  const timestamp = Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyy-MM-dd HH:mm:ss');
  const lines = [
    'INTERNAL CLIENT SNAPSHOT',
    `Exported at: ${timestamp}`,
    `Booking ID: ${normalizeSingleLine(meta.bookingId || 'N/A')}`,
    `Name: ${normalizeSingleLine(meta.name || 'N/A')}`,
    `Email: ${normalizeSingleLine(meta.email || 'N/A')}`,
    `Phone: ${normalizeSingleLine(meta.phone || 'N/A')}`,
    `Service: ${normalizeSingleLine(meta.service || 'N/A')}`,
    `Appointment: ${normalizeSingleLine(meta.slotIso || 'N/A')}`,
    `Folder ID: ${normalizeSingleLine(meta.folderId || 'N/A')}`,
    `Camera Session: ${normalizeSingleLine(meta.cameraEvidenceSessionId || 'N/A')}`,
    `Keep Note: ${normalizeSingleLine(meta.keepNoteName || 'N/A')}`
  ];
  const fileName = `Client_Snapshot_${bookingId}_${Utilities.formatDate(new Date(), TORONTO_TZ, 'yyyyMMdd_HHmmss')}.txt`;
  const parentFolder = getClientBookingsParentFolder();
  const file = createDriveFile(
    parentFolder.getId(),
    fileName,
    MimeType.PLAIN_TEXT,
    Utilities.newBlob(lines.join('\n'), MimeType.PLAIN_TEXT, fileName).getBytes()
  );
  return buildDriveFileOpenUrl(file && file.id, file && (file.webViewLink || file.webContentLink || ''));
}

function getOrCreateTempTxtSpreadsheet() {
  const tempRoot = getTempUploadRootFolder();
  const txtFolder = getOrCreateSubFolder(tempRoot, TEMP_TXT_FOLDER_NAME);
  const existing = txtFolder.getFilesByName(TEMP_TESTTEXT_SHEET_FILE_NAME);
  if (existing.hasNext()) {
    return SpreadsheetApp.openById(existing.next().getId());
  }

  const ss = SpreadsheetApp.create(TEMP_TESTTEXT_SHEET_FILE_NAME);
  const file = DriveApp.getFileById(ss.getId());
  txtFolder.addFile(file);
  try {
    DriveApp.getRootFolder().removeFile(file);
  } catch (e) { }
  return ss;
}

function collectTempDocumentLinksBySessionId(sessionId, maxLinks) {
  const cleanSessionId = truncate(
    normalizeSingleLine(sessionId || '').replace(/[^A-Za-z0-9_-]/g, ''),
    120
  );
  if (!cleanSessionId) return [];

  const limit = Math.max(1, Number(maxLinks) || 12);
  const links = [];
  try {
    const tempRoot = getTempUploadRootFolder();
    let sessionFolderMeta = findDriveFolderContainingSession(tempRoot.getId(), cleanSessionId);
    if (!sessionFolderMeta) {
      const imgRoot = getOrCreateSubFolder(tempRoot, TEMP_IMG_FOLDER_NAME);
      sessionFolderMeta = imgRoot ? findDriveFolderContainingSession(imgRoot.getId(), cleanSessionId) : null;
    }

    if (!sessionFolderMeta || !sessionFolderMeta.id) return [];

    const files = listDriveFiles(
      [
        `'${escapeDriveQueryValue(sessionFolderMeta.id)}' in parents`,
        'trashed = false'
      ].join(' and '),
      DRIVE_FILE_FIELDS,
      limit
    );
    for (let i = 0; i < files.length && links.length < limit; i++) {
      const f = files[i];
      const url = truncate(normalizeSingleLine(buildDriveFileOpenUrl(f && f.id, f && (f.webViewLink || f.webContentLink || '')) || ''), 500);
      if (!url) continue;
      links.push({
        label: truncate(normalizeSingleLine((f && f.name) || `Temp file ${links.length + 1}`), 140),
        url: url
      });
    }
  } catch (e) { }

  return links;
}

function buildTempLinksRichTextValue(links) {
  const normalized = Array.isArray(links) ? links.filter(link =>
    link && normalizeSingleLine(link.label) && normalizeSingleLine(link.url)
  ) : [];
  if (!normalized.length) return null;

  const lines = normalized.map((link, idx) => `${idx + 1}. ${normalizeSingleLine(link.label)}`);
  const text = lines.join('\n');
  let builder = SpreadsheetApp.newRichTextValue().setText(text);
  let cursor = 0;

  normalized.forEach((link, idx) => {
    const line = lines[idx];
    const start = cursor;
    const end = start + line.length;
    builder = builder.setLinkUrl(start, end, normalizeSingleLine(link.url));
    cursor = end + 1;
  });

  return builder.build();
}

function buildSheet2MirrorLinks(d, sessionId) {
  const src = (d && typeof d === 'object') ? d : {};
  const links = [];
  const seen = {};
  const pushLink = (label, url) => {
    const safeLabel = truncate(normalizeSingleLine(label || ''), 140);
    const safeUrl = sanitizeHttpUrl(url, 1000);
    if (!safeLabel || !safeUrl || seen[safeUrl]) return;
    seen[safeUrl] = true;
    links.push({ label: safeLabel, url: safeUrl });
  };

  normalizeDetailLinks(src.detailLinks).forEach(link => pushLink(link.label, link.url));

  const folderUrl = buildDriveFolderOpenUrl(
    src.folderId || src.folder_id || '',
    src.folderUrl || src.folder_url || ''
  );
  if (folderUrl) {
    pushLink('Drive Folder', folderUrl);
  }

  collectTempDocumentLinksBySessionId(sessionId, 12).forEach(link => pushLink(link.label, link.url));
  return links.slice(0, 12);
}

/**
 * AUTHORIZATION HELPER — Run this function once from the GAS editor
 * to trigger the OAuth consent screen and grant Drive permissions.
 * After authorization is complete, you can comment out or delete this function.
 *
 * Steps:
 *   1. Select "triggerDriveAuthorization" in the function dropdown at the top of the GAS editor.
 *   2. Click Run (▶).
 *   3. Accept all permissions in the popup (including Google Drive access).
 *   4. Check the Execution log — it should print "Drive authorization OK".
 *   5. Re-deploy: Deploy → Manage deployments → Edit → New version → Deploy.
 */
function triggerDriveAuthorization() {
  // Touch DriveApp to request the https://www.googleapis.com/auth/drive scope.
  const rootFolder = DriveApp.getRootFolder();
  Logger.log('DriveApp root folder: ' + rootFolder.getName());

  // Touch the Temp upload folder to confirm access.
  const tempFolderId = TEMP_UPLOAD_FOLDER_ID;
  if (tempFolderId) {
    const tempFolder = getFolderByIdSafe(tempFolderId);
    Logger.log('Temp folder resolved: ' + (tempFolder ? tempFolder.getName() : 'NOT FOUND — check TEMP_UPLOAD_FOLDER_ID'));
  }

  // Test ScriptApp.getOAuthToken() — this is what resumable uploads use.
  const token = ScriptApp.getOAuthToken();
  Logger.log('OAuth token length: ' + (token ? token.length : 0));

  // If Advanced Drive Service is enabled, verify it.
  if (canUseAdvancedDriveFiles()) {
    Logger.log('Advanced Drive Service: ENABLED ✓');
  } else {
    Logger.log('Advanced Drive Service: NOT AVAILABLE — go to Services (+) and add Drive API v3');
  }

  Logger.log('Drive authorization OK. You can now re-deploy and comment out this function.');
}
