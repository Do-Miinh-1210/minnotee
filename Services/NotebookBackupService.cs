using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace MinNote.Services
{
    public sealed class RecoverySessionMeta
    {
        [JsonPropertyName("cleanExit")]
        public bool CleanExit { get; set; } = true;

        [JsonPropertyName("pendingUpdateRestore")]
        public bool PendingUpdateRestore { get; set; }

        [JsonPropertyName("lastSavedUtc")]
        public string LastSavedUtc { get; set; } = "";

        [JsonPropertyName("lastReason")]
        public string LastReason { get; set; } = "";

        [JsonPropertyName("appVersion")]
        public string AppVersion { get; set; } = "";
    }

    public sealed class StartupRecoveryInfo
    {
        [JsonPropertyName("previousCleanExit")]
        public bool PreviousCleanExit { get; set; } = true;

        [JsonPropertyName("pendingUpdateRestore")]
        public bool PendingUpdateRestore { get; set; }

        [JsonPropertyName("lastSavedUtc")]
        public string LastSavedUtc { get; set; } = "";

        [JsonPropertyName("lastReason")]
        public string LastReason { get; set; } = "";
    }

    public sealed class BackupAppSettings
    {
        [JsonPropertyName("confirmExitWhenSaved")]
        public bool ConfirmExitWhenSaved { get; set; } = true;

        [JsonPropertyName("syncFolderPath")]
        public string SyncFolderPath { get; set; } = "";
    }

    public sealed class SessionSnapshotData
    {
        [JsonPropertyName("tabsJson")]
        public string TabsJson { get; set; } = "";

        [JsonPropertyName("placesJson")]
        public string PlacesJson { get; set; } = "";

        [JsonPropertyName("tabCount")]
        public int TabCount { get; set; }

        [JsonPropertyName("sheetCount")]
        public int SheetCount { get; set; }

        [JsonPropertyName("activeTabName")]
        public string ActiveTabName { get; set; } = "";

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = "";

        [JsonPropertyName("savedAtMs")]
        public long SavedAtMs { get; set; }

        [JsonPropertyName("savedAtUtc")]
        public string SavedAtUtc { get; set; } = "";
    }

    public sealed class HydratedNotebookFile
    {
        [JsonPropertyName("dir")]
        public string Dir { get; set; } = "";

        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("modifiedMs")]
        public long ModifiedMs { get; set; }

        [JsonPropertyName("sizeBytes")]
        public long SizeBytes { get; set; }

        [JsonPropertyName("base64")]
        public string Base64 { get; set; } = "";
    }

    public sealed class DetectedCloudFolder
    {
        [JsonPropertyName("label")]
        public string Label { get; set; } = "";

        [JsonPropertyName("path")]
        public string Path { get; set; } = "";
    }

    /// <summary>
    /// Quản lý lưu trữ an toàn ra ổ cứng NTFS (%LocalAppData%\MinNote\Notebooks),
    /// khôi phục phiên &amp; sheet sau tắt máy đột ngột / cập nhật,
    /// và đồng bộ 2 chiều ra thư mục Google Drive / OneDrive trên máy.
    /// </summary>
    public sealed class NotebookBackupService
    {
        public static NotebookBackupService Instance { get; } = new();

        private const long MaxWebMessageFileBytes = 48L * 1024 * 1024;

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };

        private static readonly char[] InvalidNameChars = Path.GetInvalidFileNameChars();

        private readonly object _stateLock = new();
        private readonly SemaphoreSlim _syncFolderGate = new(1, 1);

        public string AppDataDir { get; }
        public string NotebooksRoot { get; }
        public string BackupDir { get; }
        public string SessionFilePath { get; }
        public string RecoveryMetaPath { get; }
        public string SettingsPath { get; }

        private StartupRecoveryInfo _startupRecovery = new();
        private BackupAppSettings? _cachedSettings;

        private NotebookBackupService()
        {
            AppDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "MinNote");
            NotebooksRoot = Path.Combine(AppDataDir, "Notebooks");
            BackupDir = Path.Combine(AppDataDir, "Backup");
            SessionFilePath = Path.Combine(BackupDir, "session.json");
            RecoveryMetaPath = Path.Combine(BackupDir, "recovery_meta.json");
            SettingsPath = Path.Combine(AppDataDir, "app_settings.json");

            EnsureDirectoriesExist();
        }

        public void EnsureDirectoriesExist()
        {
            Directory.CreateDirectory(AppDataDir);
            Directory.CreateDirectory(NotebooksRoot);
            Directory.CreateDirectory(BackupDir);
        }

        /// <summary>Ghi tệp nhị phân theo kiểu nguyên tử (WriteThrough + rename đè) để tránh hỏng file khi mất điện.</summary>
        public static void WriteAllBytesAtomic(string targetPath, byte[] data)
        {
            string fullTarget = Path.GetFullPath(targetPath);
            string? dir = Path.GetDirectoryName(fullTarget);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            string tmpPath = fullTarget + ".tmp." + Guid.NewGuid().ToString("N")[..8];
            try
            {
                using (var fs = new FileStream(
                    tmpPath,
                    FileMode.Create,
                    FileAccess.Write,
                    FileShare.None,
                    65536,
                    FileOptions.WriteThrough))
                {
                    fs.Write(data, 0, data.Length);
                    fs.Flush(flushToDisk: true);
                }

                File.Move(tmpPath, fullTarget, overwrite: true);
            }
            catch
            {
                try
                {
                    if (File.Exists(tmpPath)) File.Delete(tmpPath);
                }
                catch { }
                throw;
            }
        }

        /// <summary>Ghi tệp UTF-8 theo kiểu nguyên tử (WriteThrough + rename đè).</summary>
        public static void WriteAllTextAtomic(string targetPath, string content)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(content);
            WriteAllBytesAtomic(targetPath, bytes);
        }

        private static string SanitizeSegment(string seg)
        {
            string clean = (seg ?? "").Trim();
            if (string.IsNullOrEmpty(clean) || clean == "." || clean == "..")
                throw new ArgumentException("Tên thư mục/tệp không hợp lệ.");
            if (clean.IndexOfAny(InvalidNameChars) >= 0 || clean.Contains('/') || clean.Contains('\\'))
                throw new ArgumentException("Tên thư mục/tệp chứa ký tự không hợp lệ.");
            return clean;
        }

        private static string[] ParseSafeDirSegments(string? dir)
        {
            if (string.IsNullOrWhiteSpace(dir)) return Array.Empty<string>();
            var parts = dir.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries);
            var list = new List<string>(parts.Length);
            foreach (var p in parts)
            {
                list.Add(SanitizeSegment(p));
            }
            return list.ToArray();
        }

        private string ResolveSafeDirUnder(string rootDir, string? relDir)
        {
            string baseFull = Path.GetFullPath(rootDir).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            var segs = ParseSafeDirSegments(relDir);
            string combined = segs.Length == 0 ? baseFull : Path.Combine(new[] { baseFull }.Concat(segs).ToArray());
            string full = Path.GetFullPath(combined);

            if (full != baseFull && !full.StartsWith(baseFull + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Đường dẫn vượt khỏi phạm vi lưu trữ MinNote.");
            }
            return full;
        }

        private string ResolveSafeNotebookPathUnder(string rootDir, string? relDir, string name)
        {
            string safeName = SanitizeSegment(name);
            string dirPath = ResolveSafeDirUnder(rootDir, relDir);
            string target = Path.GetFullPath(Path.Combine(dirPath, safeName + ".nrn"));
            string baseFull = Path.GetFullPath(rootDir).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

            if (!target.StartsWith(baseFull + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Đường dẫn tệp vượt khỏi phạm vi lưu trữ MinNote.");
            }
            return target;
        }

        /// <summary>Đọc trạng thái phiên trước và đánh dấu phiên hiện tại đang mở (cleanExit=false).</summary>
        public StartupRecoveryInfo MarkSessionStarted()
        {
            lock (_stateLock)
            {
                EnsureDirectoriesExist();
                var prev = ReadRecoveryMetaUnsafe();
                _startupRecovery = new StartupRecoveryInfo
                {
                    PreviousCleanExit = prev.CleanExit,
                    PendingUpdateRestore = prev.PendingUpdateRestore,
                    LastSavedUtc = prev.LastSavedUtc,
                    LastReason = prev.LastReason
                };

                var current = new RecoverySessionMeta
                {
                    CleanExit = false,
                    PendingUpdateRestore = false,
                    LastSavedUtc = prev.LastSavedUtc,
                    LastReason = "running",
                    AppVersion = GitHubUpdateService.Instance.CurrentVersion
                };
                try
                {
                    WriteAllTextAtomic(RecoveryMetaPath, JsonSerializer.Serialize(current, JsonOpts));
                }
                catch { }

                return _startupRecovery;
            }
        }

        public void MarkCleanExit(string reason, bool pendingUpdateRestore = false)
        {
            lock (_stateLock)
            {
                EnsureDirectoriesExist();
                var prev = ReadRecoveryMetaUnsafe();
                var meta = new RecoverySessionMeta
                {
                    CleanExit = true,
                    PendingUpdateRestore = pendingUpdateRestore,
                    LastSavedUtc = !string.IsNullOrWhiteSpace(prev.LastSavedUtc)
                        ? prev.LastSavedUtc
                        : DateTime.UtcNow.ToString("O"),
                    LastReason = reason ?? "exit",
                    AppVersion = GitHubUpdateService.Instance.CurrentVersion
                };
                if (reason == "exit" || reason == "update" || reason == "windows_shutdown")
                {
                    meta.LastSavedUtc = DateTime.UtcNow.ToString("O");
                }
                try
                {
                    WriteAllTextAtomic(RecoveryMetaPath, JsonSerializer.Serialize(meta, JsonOpts));
                }
                catch { }
            }
        }

        public StartupRecoveryInfo GetStartupRecoveryInfo()
        {
            lock (_stateLock)
            {
                return _startupRecovery;
            }
        }

        private RecoverySessionMeta ReadRecoveryMetaUnsafe()
        {
            try
            {
                if (File.Exists(RecoveryMetaPath))
                {
                    string json = File.ReadAllText(RecoveryMetaPath, Encoding.UTF8);
                    return JsonSerializer.Deserialize<RecoverySessionMeta>(json, JsonOpts) ?? new RecoverySessionMeta();
                }
            }
            catch { }
            return new RecoverySessionMeta();
        }

        public BackupAppSettings GetSettings()
        {
            lock (_stateLock)
            {
                if (_cachedSettings != null)
                {
                    return new BackupAppSettings
                    {
                        ConfirmExitWhenSaved = _cachedSettings.ConfirmExitWhenSaved,
                        SyncFolderPath = _cachedSettings.SyncFolderPath
                    };
                }

                BackupAppSettings loaded = new();
                try
                {
                    if (File.Exists(SettingsPath))
                    {
                        string json = File.ReadAllText(SettingsPath, Encoding.UTF8);
                        loaded = JsonSerializer.Deserialize<BackupAppSettings>(json, JsonOpts) ?? new BackupAppSettings();
                    }
                }
                catch { }

                loaded.SyncFolderPath ??= "";
                _cachedSettings = loaded;
                return new BackupAppSettings
                {
                    ConfirmExitWhenSaved = loaded.ConfirmExitWhenSaved,
                    SyncFolderPath = loaded.SyncFolderPath
                };
            }
        }

        public BackupAppSettings SaveSettings(bool? confirmExitWhenSaved, string? syncFolderPath)
        {
            lock (_stateLock)
            {
                var current = GetSettings();
                if (confirmExitWhenSaved.HasValue)
                {
                    current.ConfirmExitWhenSaved = confirmExitWhenSaved.Value;
                }
                if (syncFolderPath != null)
                {
                    string trimmed = syncFolderPath.Trim();
                    current.SyncFolderPath = string.IsNullOrEmpty(trimmed) ? "" : Path.GetFullPath(trimmed);
                }

                _cachedSettings = current;
                EnsureDirectoriesExist();
                WriteAllTextAtomic(SettingsPath, JsonSerializer.Serialize(current, JsonOpts));
                return new BackupAppSettings
                {
                    ConfirmExitWhenSaved = current.ConfirmExitWhenSaved,
                    SyncFolderPath = current.SyncFolderPath
                };
            }
        }

        public void MirrorWriteFile(string dir, string name, byte[] nrnBytes, long modifiedMs)
        {
            string localPath = ResolveSafeNotebookPathUnder(NotebooksRoot, dir, name);
            WriteAllBytesAtomic(localPath, nrnBytes);
            ApplyTimestamp(localPath, modifiedMs);
            UpdateLastSavedTimestamp();

            var settings = GetSettings();
            if (!string.IsNullOrWhiteSpace(settings.SyncFolderPath) && Directory.Exists(settings.SyncFolderPath))
            {
                string syncBase = GetSyncNotebooksRoot(settings.SyncFolderPath);
                byte[] copy = nrnBytes;
                _ = Task.Run(async () =>
                {
                    await _syncFolderGate.WaitAsync().ConfigureAwait(false);
                    try
                    {
                        string syncPath = ResolveSafeNotebookPathUnder(syncBase, dir, name);
                        WriteAllBytesAtomic(syncPath, copy);
                        ApplyTimestamp(syncPath, modifiedMs);
                    }
                    catch { }
                    finally
                    {
                        _syncFolderGate.Release();
                    }
                });
            }
        }

        public void MirrorRemoveFile(string dir, string name)
        {
            string localPath = ResolveSafeNotebookPathUnder(NotebooksRoot, dir, name);
            if (File.Exists(localPath))
            {
                File.Delete(localPath);
            }

            var settings = GetSettings();
            if (!string.IsNullOrWhiteSpace(settings.SyncFolderPath) && Directory.Exists(settings.SyncFolderPath))
            {
                string syncBase = GetSyncNotebooksRoot(settings.SyncFolderPath);
                _ = Task.Run(async () =>
                {
                    await _syncFolderGate.WaitAsync().ConfigureAwait(false);
                    try
                    {
                        string syncPath = ResolveSafeNotebookPathUnder(syncBase, dir, name);
                        if (File.Exists(syncPath)) File.Delete(syncPath);
                    }
                    catch { }
                    finally
                    {
                        _syncFolderGate.Release();
                    }
                });
            }
        }

        public void MirrorMakeDir(string dir)
        {
            if (string.IsNullOrWhiteSpace(dir)) return;
            string localDir = ResolveSafeDirUnder(NotebooksRoot, dir);
            Directory.CreateDirectory(localDir);

            var settings = GetSettings();
            if (!string.IsNullOrWhiteSpace(settings.SyncFolderPath) && Directory.Exists(settings.SyncFolderPath))
            {
                try
                {
                    string syncDir = ResolveSafeDirUnder(GetSyncNotebooksRoot(settings.SyncFolderPath), dir);
                    Directory.CreateDirectory(syncDir);
                }
                catch { }
            }
        }

        public void MirrorRemoveDir(string dir)
        {
            if (string.IsNullOrWhiteSpace(dir)) return;
            string localDir = ResolveSafeDirUnder(NotebooksRoot, dir);
            if (Directory.Exists(localDir))
            {
                Directory.Delete(localDir, recursive: true);
            }

            var settings = GetSettings();
            if (!string.IsNullOrWhiteSpace(settings.SyncFolderPath) && Directory.Exists(settings.SyncFolderPath))
            {
                try
                {
                    string syncDir = ResolveSafeDirUnder(GetSyncNotebooksRoot(settings.SyncFolderPath), dir);
                    if (Directory.Exists(syncDir)) Directory.Delete(syncDir, recursive: true);
                }
                catch { }
            }
        }

        public void MirrorMoveFile(string oldDir, string oldName, string newDir, string newName)
        {
            string oldPath = ResolveSafeNotebookPathUnder(NotebooksRoot, oldDir, oldName);
            string newPath = ResolveSafeNotebookPathUnder(NotebooksRoot, newDir, newName);
            if (File.Exists(oldPath))
            {
                byte[] bytes = File.ReadAllBytes(oldPath);
                long mtime = new DateTimeOffset(File.GetLastWriteTimeUtc(oldPath)).ToUnixTimeMilliseconds();
                WriteAllBytesAtomic(newPath, bytes);
                ApplyTimestamp(newPath, mtime);
                if (!string.Equals(oldPath, newPath, StringComparison.OrdinalIgnoreCase))
                {
                    File.Delete(oldPath);
                }
            }

            var settings = GetSettings();
            if (!string.IsNullOrWhiteSpace(settings.SyncFolderPath) && Directory.Exists(settings.SyncFolderPath))
            {
                try
                {
                    string syncBase = GetSyncNotebooksRoot(settings.SyncFolderPath);
                    string sOld = ResolveSafeNotebookPathUnder(syncBase, oldDir, oldName);
                    string sNew = ResolveSafeNotebookPathUnder(syncBase, newDir, newName);
                    if (File.Exists(sOld))
                    {
                        byte[] bytes = File.ReadAllBytes(sOld);
                        WriteAllBytesAtomic(sNew, bytes);
                        if (!string.Equals(sOld, sNew, StringComparison.OrdinalIgnoreCase)) File.Delete(sOld);
                    }
                }
                catch { }
            }
        }

        public void MirrorMoveDir(string oldDir, string newDir)
        {
            if (string.IsNullOrWhiteSpace(oldDir) || string.IsNullOrWhiteSpace(newDir)) return;
            string oldPath = ResolveSafeDirUnder(NotebooksRoot, oldDir);
            string newPath = ResolveSafeDirUnder(NotebooksRoot, newDir);
            if (Directory.Exists(oldPath) && !string.Equals(oldPath, newPath, StringComparison.OrdinalIgnoreCase))
            {
                string? parent = Path.GetDirectoryName(newPath);
                if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);
                if (Directory.Exists(newPath)) Directory.Delete(newPath, true);
                Directory.Move(oldPath, newPath);
            }
        }

        public void SaveSessionSnapshot(
            string tabsJson,
            string placesJson,
            int tabCount,
            int sheetCount,
            string activeTabName,
            string reason)
        {
            EnsureDirectoriesExist();
            var snap = new SessionSnapshotData
            {
                TabsJson = tabsJson ?? "",
                PlacesJson = placesJson ?? "",
                TabCount = tabCount,
                SheetCount = sheetCount,
                ActiveTabName = activeTabName ?? "",
                Reason = reason ?? "autosave",
                SavedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                SavedAtUtc = DateTime.UtcNow.ToString("O")
            };

            string json = JsonSerializer.Serialize(snap, JsonOpts);
            WriteAllTextAtomic(SessionFilePath, json);
            UpdateLastSavedTimestamp();

            var settings = GetSettings();
            if (!string.IsNullOrWhiteSpace(settings.SyncFolderPath) && Directory.Exists(settings.SyncFolderPath))
            {
                try
                {
                    string syncSessionPath = Path.Combine(GetSyncBackupRoot(settings.SyncFolderPath), "session.json");
                    WriteAllTextAtomic(syncSessionPath, json);
                }
                catch { }
            }
        }

        public SessionSnapshotData? ReadSessionSnapshot()
        {
            try
            {
                if (!File.Exists(SessionFilePath)) return null;
                string json = File.ReadAllText(SessionFilePath, Encoding.UTF8);
                return JsonSerializer.Deserialize<SessionSnapshotData>(json, JsonOpts);
            }
            catch
            {
                return null;
            }
        }

        public object GetHydrationPayload()
        {
            EnsureDirectoriesExist();
            var (dirs, files) = ScanNotebooksTree(NotebooksRoot, includeBase64: true);
            var session = ReadSessionSnapshot();
            var recovery = GetStartupRecoveryInfo();
            var settings = GetSettings();

            return new
            {
                notebooksDir = NotebooksRoot,
                dirs,
                files,
                session,
                recovery,
                settings
            };
        }

        public object GetStatusInfo()
        {
            EnsureDirectoriesExist();
            var (_, files) = ScanNotebooksTree(NotebooksRoot, includeBase64: false);
            long totalBytes = files.Sum(f => f.SizeBytes);

            RecoverySessionMeta meta;
            lock (_stateLock)
            {
                meta = ReadRecoveryMetaUnsafe();
            }

            var session = ReadSessionSnapshot();
            var settings = GetSettings();
            int syncCount = 0;
            string lastFolderSyncUtc = "";
            string syncTargetDir = "";

            if (!string.IsNullOrWhiteSpace(settings.SyncFolderPath) && Directory.Exists(settings.SyncFolderPath))
            {
                syncTargetDir = GetSyncBackupRoot(settings.SyncFolderPath);
                string syncNbDir = GetSyncNotebooksRoot(settings.SyncFolderPath);
                if (Directory.Exists(syncNbDir))
                {
                    try
                    {
                        var syncFiles = Directory.GetFiles(syncNbDir, "*.nrn", SearchOption.AllDirectories);
                        syncCount = syncFiles.Length;
                        if (syncFiles.Length > 0)
                        {
                            DateTime maxUtc = syncFiles.Max(f => File.GetLastWriteTimeUtc(f));
                            lastFolderSyncUtc = maxUtc.ToString("O");
                        }
                    }
                    catch { }
                }
            }

            return new
            {
                localBackupDir = AppDataDir,
                notebooksDir = NotebooksRoot,
                notebookCount = files.Count,
                totalSizeBytes = totalBytes,
                lastSavedUtc = !string.IsNullOrWhiteSpace(session?.SavedAtUtc) ? session.SavedAtUtc : meta.LastSavedUtc,
                sessionTabCount = session?.TabCount ?? 0,
                sessionSheetCount = session?.SheetCount ?? 0,
                activeTabName = session?.ActiveTabName ?? "",
                confirmExitWhenSaved = settings.ConfirmExitWhenSaved,
                syncFolderPath = settings.SyncFolderPath,
                syncTargetDir,
                syncFolderFileCount = syncCount,
                lastFolderSyncUtc,
                detectedCloudFolders = DetectCloudFolders()
            };
        }

        public List<DetectedCloudFolder> DetectCloudFolders()
        {
            var results = new List<DetectedCloudFolder>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            void TryAdd(string label, string? path)
            {
                if (string.IsNullOrWhiteSpace(path)) return;
                try
                {
                    string full = Path.GetFullPath(path);
                    if (Directory.Exists(full) && seen.Add(full))
                    {
                        results.Add(new DetectedCloudFolder { Label = label, Path = full });
                    }
                }
                catch { }
            }

            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            TryAdd("Google Drive (My Drive)", @"G:\My Drive");
            TryAdd("Google Drive (Drive của tôi)", @"G:\Drive của tôi");
            if (!string.IsNullOrEmpty(userProfile))
            {
                TryAdd("Google Drive", Path.Combine(userProfile, "Google Drive"));
                TryAdd("Google Drive (My Drive)", Path.Combine(userProfile, "Google Drive", "My Drive"));
            }

            TryAdd("OneDrive", Environment.GetEnvironmentVariable("OneDrive"));
            TryAdd("OneDrive Cá nhân", Environment.GetEnvironmentVariable("OneDriveConsumer"));
            TryAdd("OneDrive Cơ quan", Environment.GetEnvironmentVariable("OneDriveCommercial"));
            if (!string.IsNullOrEmpty(userProfile))
            {
                TryAdd("OneDrive", Path.Combine(userProfile, "OneDrive"));
            }

            return results;
        }

        public async Task<object> SyncToFolderNowAsync(string? customFolder = null)
        {
            string? folder = !string.IsNullOrWhiteSpace(customFolder) ? customFolder.Trim() : GetSettings().SyncFolderPath;
            if (string.IsNullOrWhiteSpace(folder) || !Directory.Exists(folder))
            {
                throw new InvalidOperationException("Chưa chọn thư mục đồng bộ hợp lệ trên máy.");
            }

            await _syncFolderGate.WaitAsync().ConfigureAwait(false);
            try
            {
                EnsureDirectoriesExist();
                string targetRoot = GetSyncBackupRoot(folder);
                string targetNb = GetSyncNotebooksRoot(folder);
                Directory.CreateDirectory(targetRoot);
                Directory.CreateDirectory(targetNb);

                int synced = 0;
                foreach (string src in Directory.GetFiles(NotebooksRoot, "*.nrn", SearchOption.AllDirectories))
                {
                    string rel = Path.GetRelativePath(NotebooksRoot, src);
                    string dest = Path.Combine(targetNb, rel);
                    byte[] bytes = File.ReadAllBytes(src);
                    WriteAllBytesAtomic(dest, bytes);
                    File.SetLastWriteTimeUtc(dest, File.GetLastWriteTimeUtc(src));
                    synced++;
                }

                if (File.Exists(SessionFilePath))
                {
                    WriteAllBytesAtomic(Path.Combine(targetRoot, "session.json"), File.ReadAllBytes(SessionFilePath));
                }

                string syncedAtUtc = DateTime.UtcNow.ToString("O");
                return new
                {
                    syncedCount = synced,
                    targetDir = targetRoot,
                    syncedAtUtc
                };
            }
            finally
            {
                _syncFolderGate.Release();
            }
        }

        public async Task<object> RestoreFromFolderAsync(string? customFolder = null)
        {
            string? folder = !string.IsNullOrWhiteSpace(customFolder) ? customFolder.Trim() : GetSettings().SyncFolderPath;
            if (string.IsNullOrWhiteSpace(folder) || !Directory.Exists(folder))
            {
                throw new InvalidOperationException("Chưa chọn thư mục đồng bộ hợp lệ trên máy.");
            }

            await _syncFolderGate.WaitAsync().ConfigureAwait(false);
            try
            {
                EnsureDirectoriesExist();
                string backupRoot = GetSyncBackupRoot(folder);
                string srcNbRoot = Directory.Exists(GetSyncNotebooksRoot(folder))
                    ? GetSyncNotebooksRoot(folder)
                    : (Directory.Exists(backupRoot) ? backupRoot : folder);

                var restoredFiles = new List<HydratedNotebookFile>();
                if (Directory.Exists(srcNbRoot))
                {
                    foreach (string src in Directory.GetFiles(srcNbRoot, "*.nrn", SearchOption.AllDirectories))
                    {
                        string rel = Path.GetRelativePath(srcNbRoot, src);
                        string? relDirRaw = Path.GetDirectoryName(rel);
                        string relDir = string.IsNullOrEmpty(relDirRaw) || relDirRaw == "."
                            ? ""
                            : relDirRaw.Replace('\\', '/');
                        string name = Path.GetFileNameWithoutExtension(src);

                        long mtime = new DateTimeOffset(File.GetLastWriteTimeUtc(src)).ToUnixTimeMilliseconds();
                        byte[] bytes = File.ReadAllBytes(src);
                        string localDest = ResolveSafeNotebookPathUnder(NotebooksRoot, relDir, name);
                        WriteAllBytesAtomic(localDest, bytes);
                        ApplyTimestamp(localDest, mtime);

                        if (bytes.Length <= MaxWebMessageFileBytes)
                        {
                            restoredFiles.Add(new HydratedNotebookFile
                            {
                                Dir = relDir,
                                Name = name,
                                ModifiedMs = mtime,
                                SizeBytes = bytes.Length,
                                Base64 = Convert.ToBase64String(bytes)
                            });
                        }
                    }
                }

                SessionSnapshotData? session = null;
                string syncSessionPath = Path.Combine(backupRoot, "session.json");
                if (File.Exists(syncSessionPath))
                {
                    try
                    {
                        string json = File.ReadAllText(syncSessionPath, Encoding.UTF8);
                        session = JsonSerializer.Deserialize<SessionSnapshotData>(json, JsonOpts);
                    }
                    catch { }
                }

                return new
                {
                    restoredCount = restoredFiles.Count,
                    files = restoredFiles,
                    session,
                    sourceDir = srcNbRoot
                };
            }
            finally
            {
                _syncFolderGate.Release();
            }
        }

        public void OpenFolderInExplorer(string which)
        {
            EnsureDirectoriesExist();
            string target = NotebooksRoot;
            if (string.Equals(which, "sync", StringComparison.OrdinalIgnoreCase))
            {
                string syncPath = GetSettings().SyncFolderPath;
                if (string.IsNullOrWhiteSpace(syncPath) || !Directory.Exists(syncPath))
                {
                    throw new InvalidOperationException("Chưa có thư mục đồng bộ hợp lệ.");
                }
                string sub = GetSyncBackupRoot(syncPath);
                target = Directory.Exists(sub) ? sub : syncPath;
            }
            else if (string.Equals(which, "appdata", StringComparison.OrdinalIgnoreCase))
            {
                target = AppDataDir;
            }

            Process.Start(new ProcessStartInfo("explorer.exe", target)
            {
                UseShellExecute = true
            });
        }

        public List<(string Dir, string Name, string FullPath, long ModifiedMs)> ListAllLocalNotebookFiles()
        {
            EnsureDirectoriesExist();
            var list = new List<(string Dir, string Name, string FullPath, long ModifiedMs)>();
            foreach (string file in Directory.GetFiles(NotebooksRoot, "*.nrn", SearchOption.AllDirectories))
            {
                string rel = Path.GetRelativePath(NotebooksRoot, file);
                string? relDirRaw = Path.GetDirectoryName(rel);
                string relDir = string.IsNullOrEmpty(relDirRaw) || relDirRaw == "."
                    ? ""
                    : relDirRaw.Replace('\\', '/');
                string name = Path.GetFileNameWithoutExtension(file);
                long mtime = new DateTimeOffset(File.GetLastWriteTimeUtc(file)).ToUnixTimeMilliseconds();
                list.Add((relDir, name, file, mtime));
            }
            return list;
        }

        public static string GetSyncBackupRoot(string baseSyncFolder) =>
            Path.Combine(baseSyncFolder.Trim(), "MinNote_Backup");

        public static string GetSyncNotebooksRoot(string baseSyncFolder) =>
            Path.Combine(GetSyncBackupRoot(baseSyncFolder), "Notebooks");

        private (List<string> Dirs, List<HydratedNotebookFile> Files) ScanNotebooksTree(string root, bool includeBase64)
        {
            var dirs = new List<string>();
            var files = new List<HydratedNotebookFile>();
            if (!Directory.Exists(root)) return (dirs, files);

            foreach (string d in Directory.GetDirectories(root, "*", SearchOption.AllDirectories))
            {
                string rel = Path.GetRelativePath(root, d).Replace('\\', '/');
                if (!string.IsNullOrWhiteSpace(rel) && rel != ".")
                {
                    dirs.Add(rel);
                }
            }

            foreach (string file in Directory.GetFiles(root, "*.nrn", SearchOption.AllDirectories))
            {
                try
                {
                    var fi = new FileInfo(file);
                    string rel = Path.GetRelativePath(root, file);
                    string? relDirRaw = Path.GetDirectoryName(rel);
                    string relDir = string.IsNullOrEmpty(relDirRaw) || relDirRaw == "."
                        ? ""
                        : relDirRaw.Replace('\\', '/');
                    string name = Path.GetFileNameWithoutExtension(file);
                    long mtime = new DateTimeOffset(fi.LastWriteTimeUtc).ToUnixTimeMilliseconds();

                    string b64 = "";
                    if (includeBase64 && fi.Length > 0 && fi.Length <= MaxWebMessageFileBytes)
                    {
                        b64 = Convert.ToBase64String(File.ReadAllBytes(file));
                    }

                    files.Add(new HydratedNotebookFile
                    {
                        Dir = relDir,
                        Name = name,
                        ModifiedMs = mtime,
                        SizeBytes = fi.Length,
                        Base64 = b64
                    });
                }
                catch { }
            }

            return (dirs, files);
        }

        private void UpdateLastSavedTimestamp()
        {
            lock (_stateLock)
            {
                try
                {
                    var meta = ReadRecoveryMetaUnsafe();
                    meta.LastSavedUtc = DateTime.UtcNow.ToString("O");
                    WriteAllTextAtomic(RecoveryMetaPath, JsonSerializer.Serialize(meta, JsonOpts));
                }
                catch { }
            }
        }

        private static void ApplyTimestamp(string path, long modifiedMs)
        {
            if (modifiedMs <= 0) return;
            try
            {
                var dt = DateTimeOffset.FromUnixTimeMilliseconds(modifiedMs).UtcDateTime;
                File.SetLastWriteTimeUtc(path, dt);
            }
            catch { }
        }
    }
}
