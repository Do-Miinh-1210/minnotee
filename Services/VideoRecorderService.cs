using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MinNote.Services
{
    public sealed class VideoRecorderSettings
    {
        [JsonPropertyName("folder")]
        public string Folder { get; set; } = "";

        /// <summary>"panel" (preview &amp; save modal) or "auto" (save directly to folder).</summary>
        [JsonPropertyName("saveMode")]
        public string SaveMode { get; set; } = "panel";

        /// <summary>"ultra" (24Mbps HiDPI), "high" (16Mbps), "standard" (8Mbps).</summary>
        [JsonPropertyName("quality")]
        public string Quality { get; set; } = "ultra";

        [JsonPropertyName("fps")]
        public int Fps { get; set; } = 60;

        /// <summary>"mp4" or "webm".</summary>
        [JsonPropertyName("format")]
        public string Format { get; set; } = "mp4";

        [JsonPropertyName("filePrefix")]
        public string FilePrefix { get; set; } = "MinNote";

        [JsonPropertyName("mic")]
        public bool Mic { get; set; } = true;

        [JsonPropertyName("micDeviceId")]
        public string MicDeviceId { get; set; } = "";

        [JsonPropertyName("showCursor")]
        public bool ShowCursor { get; set; } = true;
    }

    public sealed class RecordedVideoItem
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("path")]
        public string Path { get; set; } = "";

        [JsonPropertyName("sizeBytes")]
        public long SizeBytes { get; set; }

        [JsonPropertyName("modifiedMs")]
        public long ModifiedMs { get; set; }

        [JsonPropertyName("ext")]
        public string Ext { get; set; } = "";
    }

    /// <summary>
    /// Quản lý cài đặt lưu trữ, ghi video theo từng khối (chunked stream) trực tiếp ra ổ đĩa
    /// và quản lý danh sách video đã quay (thay thế hoàn toàn bảng tải xuống kiểu trình duyệt).
    /// </summary>
    public sealed class VideoRecorderService : IDisposable
    {
        public static VideoRecorderService Instance { get; } = new VideoRecorderService();

        private sealed class WriteSession : IDisposable
        {
            public required string Id { get; init; }
            public required string FinalPath { get; init; }
            public required string TempPath { get; init; }
            public required FileStream Stream { get; init; }
            public long BytesWritten;

            public void Dispose()
            {
                try { Stream.Dispose(); } catch { }
            }
        }

        private readonly object _settingsLock = new();
        private readonly ConcurrentDictionary<string, WriteSession> _sessions = new();
        private readonly ConcurrentDictionary<string, DateTime> _authorizedSavePaths = new(StringComparer.OrdinalIgnoreCase);
        private static readonly TimeSpan AuthorizedSavePathTtl = TimeSpan.FromMinutes(60);
        private VideoRecorderSettings? _cachedSettings;

        private static readonly string SettingsPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "MinNote",
            "recorder_settings.json");

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };

        private VideoRecorderService() { }

        public static string GetDefaultVideoFolder()
        {
            string videos = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
            if (string.IsNullOrWhiteSpace(videos))
            {
                videos = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            }
            if (string.IsNullOrWhiteSpace(videos))
            {
                videos = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            }
            return Path.Combine(videos, "MinNote");
        }

        public VideoRecorderSettings GetSettings()
        {
            lock (_settingsLock)
            {
                if (_cachedSettings != null)
                {
                    return CloneSettings(_cachedSettings);
                }

                VideoRecorderSettings settings = new();
                try
                {
                    if (File.Exists(SettingsPath))
                    {
                        string raw = File.ReadAllText(SettingsPath);
                        var loaded = JsonSerializer.Deserialize<VideoRecorderSettings>(raw, JsonOpts);
                        if (loaded != null) settings = loaded;
                    }
                }
                catch { }

                NormalizeSettings(settings);
                _cachedSettings = settings;
                return CloneSettings(settings);
            }
        }

        public VideoRecorderSettings SaveSettings(VideoRecorderSettings incoming)
        {
            lock (_settingsLock)
            {
                NormalizeSettings(incoming);
                EnsureFolderExists(incoming.Folder);
                _cachedSettings = CloneSettings(incoming);

                try
                {
                    string? dir = Path.GetDirectoryName(SettingsPath);
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                    File.WriteAllText(SettingsPath, JsonSerializer.Serialize(_cachedSettings, JsonOpts));
                }
                catch { }

                return CloneSettings(_cachedSettings);
            }
        }

        public VideoRecorderSettings SetFolder(string folderPath)
        {
            var current = GetSettings();
            if (!string.IsNullOrWhiteSpace(folderPath))
            {
                current.Folder = folderPath.Trim();
            }
            return SaveSettings(current);
        }

        private static void NormalizeSettings(VideoRecorderSettings s)
        {
            if (string.IsNullOrWhiteSpace(s.Folder))
            {
                s.Folder = GetDefaultVideoFolder();
            }
            else
            {
                try { s.Folder = Path.GetFullPath(s.Folder.Trim()); } catch { s.Folder = GetDefaultVideoFolder(); }
            }

            s.SaveMode = string.Equals(s.SaveMode, "auto", StringComparison.OrdinalIgnoreCase) ? "auto" : "panel";
            s.Quality = s.Quality?.ToLowerInvariant() switch
            {
                "standard" => "standard",
                "high" => "high",
                _ => "ultra"
            };
            s.Fps = s.Fps == 30 ? 30 : 60;
            s.Format = string.Equals(s.Format, "webm", StringComparison.OrdinalIgnoreCase) ? "webm" : "mp4";
            s.FilePrefix = SanitizeFileName(string.IsNullOrWhiteSpace(s.FilePrefix) ? "MinNote" : s.FilePrefix);
            if (string.IsNullOrWhiteSpace(s.FilePrefix)) s.FilePrefix = "MinNote";
            s.MicDeviceId ??= "";
        }

        private static VideoRecorderSettings CloneSettings(VideoRecorderSettings s) => new()
        {
            Folder = s.Folder,
            SaveMode = s.SaveMode,
            Quality = s.Quality,
            Fps = s.Fps,
            Format = s.Format,
            FilePrefix = s.FilePrefix,
            Mic = s.Mic,
            MicDeviceId = s.MicDeviceId,
            ShowCursor = s.ShowCursor
        };

        public string EnsureFolderExists(string? folder = null)
        {
            string target = string.IsNullOrWhiteSpace(folder) ? GetSettings().Folder : folder.Trim();
            try
            {
                Directory.CreateDirectory(target);
                return target;
            }
            catch
            {
                string fallback = GetDefaultVideoFolder();
                Directory.CreateDirectory(fallback);
                return fallback;
            }
        }

        public static string SanitizeFileName(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "MinNote_Video";
            char[] invalid = Path.GetInvalidFileNameChars();
            var chars = raw.Trim().Select(c => invalid.Contains(c) ? '_' : c).ToArray();
            string cleaned = new string(chars).Trim().TrimEnd('.');
            if (cleaned.Length > 120) cleaned = cleaned[..120].TrimEnd('.');
            return string.IsNullOrWhiteSpace(cleaned) ? "MinNote_Video" : cleaned;
        }

        public static string ResolveUniquePath(string folder, string baseName, string ext, bool allowOverwrite = false)
        {
            string cleanExt = ext.Trim().TrimStart('.').ToLowerInvariant();
            if (cleanExt != "mp4" && cleanExt != "webm") cleanExt = "mp4";

            string cleanBase = SanitizeFileName(baseName);
            if (cleanBase.EndsWith("." + cleanExt, StringComparison.OrdinalIgnoreCase))
            {
                cleanBase = cleanBase[..^(cleanExt.Length + 1)];
            }
            if (string.IsNullOrWhiteSpace(cleanBase))
            {
                cleanBase = $"MinNote_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}";
            }

            string candidate = Path.Combine(folder, $"{cleanBase}.{cleanExt}");
            if (allowOverwrite || !File.Exists(candidate))
            {
                return candidate;
            }

            for (int i = 1; i < 10000; i++)
            {
                string next = Path.Combine(folder, $"{cleanBase}_{i}.{cleanExt}");
                if (!File.Exists(next)) return next;
            }
            return Path.Combine(folder, $"{cleanBase}_{DateTime.Now:HHmmssfff}.{cleanExt}");
        }

        private static bool HasAllowedVideoExtension(string path)
        {
            string ext = Path.GetExtension(path);
            return string.Equals(ext, ".mp4", StringComparison.OrdinalIgnoreCase)
                || string.Equals(ext, ".webm", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsWithinDirectory(string canonicalFilePath, string? dirPath)
        {
            if (string.IsNullOrWhiteSpace(dirPath)) return false;
            try
            {
                string root = Path.GetFullPath(dirPath.Trim());
                if (!root.EndsWith(Path.DirectorySeparatorChar) && !root.EndsWith(Path.AltDirectorySeparatorChar))
                {
                    root += Path.DirectorySeparatorChar;
                }
                return canonicalFilePath.StartsWith(root, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        public void AuthorizeSavePath(string fullPath)
        {
            if (string.IsNullOrWhiteSpace(fullPath)) return;
            try
            {
                string canonical = Path.GetFullPath(fullPath.Trim());
                if (!HasAllowedVideoExtension(canonical)) return;

                DateTime nowUtc = DateTime.UtcNow;
                foreach (var kv in _authorizedSavePaths)
                {
                    if (kv.Value <= nowUtc)
                    {
                        _authorizedSavePaths.TryRemove(kv.Key, out _);
                    }
                }

                _authorizedSavePaths[canonical] = nowUtc.Add(AuthorizedSavePathTtl);
            }
            catch { }
        }

        private bool IsPathWithinAllowedVideoScope(string fullPath, bool requireVideoExt = true)
        {
            if (string.IsNullOrWhiteSpace(fullPath)) return false;
            try
            {
                string canonical = Path.GetFullPath(fullPath.Trim());
                if (canonical.IndexOf('"') >= 0) return false;
                if (requireVideoExt && !HasAllowedVideoExtension(canonical)) return false;

                if (IsWithinDirectory(canonical, EnsureFolderExists()))
                {
                    return true;
                }

                if (_authorizedSavePaths.TryGetValue(canonical, out DateTime expiresUtc))
                {
                    if (expiresUtc > DateTime.UtcNow)
                    {
                        return true;
                    }
                    _authorizedSavePaths.TryRemove(canonical, out _);
                }

                if (IsWithinDirectory(canonical, NativeScreenRecorder.GetTempDir()))
                {
                    return true;
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        public (string SessionId, string FinalPath) BeginWrite(string? explicitFullPath, string? folder, string? fileName, string? ext)
        {
            string finalPath;
            if (!string.IsNullOrWhiteSpace(explicitFullPath))
            {
                finalPath = Path.GetFullPath(explicitFullPath.Trim());
                if (!IsPathWithinAllowedVideoScope(finalPath, requireVideoExt: true))
                {
                    throw new UnauthorizedAccessException("Đường dẫn lưu video chưa được xác nhận qua hộp thoại lưu.");
                }
                string? parent = Path.GetDirectoryName(finalPath);
                if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);
            }
            else
            {
                string targetFolder = EnsureFolderExists(folder);
                string extension = string.IsNullOrWhiteSpace(ext) ? "mp4" : ext;
                string baseName = string.IsNullOrWhiteSpace(fileName)
                    ? $"{GetSettings().FilePrefix}_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}"
                    : fileName;
                finalPath = ResolveUniquePath(targetFolder, baseName, extension, allowOverwrite: false);
            }

            string sessionId = "rec_" + Guid.NewGuid().ToString("N");
            string tempPath = finalPath + ".part";
            var stream = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None, 262144, FileOptions.SequentialScan);
            var session = new WriteSession
            {
                Id = sessionId,
                FinalPath = finalPath,
                TempPath = tempPath,
                Stream = stream
            };
            _sessions[sessionId] = session;
            return (sessionId, finalPath);
        }

        public long WriteChunk(string sessionId, string base64Chunk)
        {
            if (!_sessions.TryGetValue(sessionId, out var session))
            {
                throw new InvalidOperationException("Phiên ghi video không tồn tại hoặc đã đóng.");
            }
            if (string.IsNullOrEmpty(base64Chunk)) return session.BytesWritten;

            byte[] data = Convert.FromBase64String(base64Chunk);
            session.Stream.Write(data, 0, data.Length);
            session.BytesWritten += data.Length;
            return session.BytesWritten;
        }

        public (string FinalPath, string FileName, long SizeBytes) FinishWrite(string sessionId)
        {
            if (!_sessions.TryRemove(sessionId, out var session))
            {
                throw new InvalidOperationException("Phiên ghi video không tồn tại.");
            }

            long size = session.BytesWritten;
            string tempPath = session.TempPath;
            string finalPath = session.FinalPath;

            try
            {
                session.Stream.Flush(true);
                session.Stream.Dispose();

                if (File.Exists(finalPath))
                {
                    File.Delete(finalPath);
                }
                File.Move(tempPath, finalPath);
                return (finalPath, Path.GetFileName(finalPath), size);
            }
            catch
            {
                try { session.Dispose(); } catch { }
                try { if (File.Exists(tempPath)) File.Delete(tempPath); } catch { }
                throw;
            }
        }

        public void AbortWrite(string sessionId)
        {
            if (_sessions.TryRemove(sessionId, out var session))
            {
                try { session.Dispose(); } catch { }
                try { if (File.Exists(session.TempPath)) File.Delete(session.TempPath); } catch { }
            }
        }

        public (string FinalPath, string FileName, long SizeBytes) CommitTempFile(
            string tempPath, string? explicitFullPath, string? folder, string? fileName, string? ext = "mp4")
        {
            if (string.IsNullOrWhiteSpace(tempPath) || !File.Exists(tempPath))
            {
                throw new FileNotFoundException("Không tìm thấy tệp video tạm để lưu.");
            }
            string fullTemp = Path.GetFullPath(tempPath.Trim());
            if (!IsWithinDirectory(fullTemp, NativeScreenRecorder.GetTempDir()) || !HasAllowedVideoExtension(fullTemp))
            {
                throw new UnauthorizedAccessException("Đường dẫn tệp video tạm không hợp lệ.");
            }

            string finalPath;
            if (!string.IsNullOrWhiteSpace(explicitFullPath))
            {
                finalPath = Path.GetFullPath(explicitFullPath.Trim());
                if (!IsPathWithinAllowedVideoScope(finalPath, requireVideoExt: true))
                {
                    throw new UnauthorizedAccessException("Đường dẫn lưu video chưa được xác nhận qua hộp thoại lưu.");
                }
                string? parent = Path.GetDirectoryName(finalPath);
                if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);
            }
            else
            {
                string targetFolder = EnsureFolderExists(folder);
                string extension = string.IsNullOrWhiteSpace(ext) ? "mp4" : ext;
                string baseName = string.IsNullOrWhiteSpace(fileName)
                    ? $"{GetSettings().FilePrefix}_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}"
                    : fileName;
                finalPath = ResolveUniquePath(targetFolder, baseName, extension, allowOverwrite: false);
            }

            if (File.Exists(finalPath))
            {
                File.Delete(finalPath);
            }
            try
            {
                File.Move(fullTemp, finalPath);
            }
            catch (IOException)
            {
                // Cross-volume move fallback (e.g. C:\AppData -> D:\Videos)
                File.Copy(fullTemp, finalPath, overwrite: true);
                try { File.Delete(fullTemp); } catch { }
            }

            long size = new FileInfo(finalPath).Length;
            return (finalPath, Path.GetFileName(finalPath), size);
        }

        public List<RecordedVideoItem> ListRecentVideos(string? folder = null, int maxCount = 25)
        {
            string target = EnsureFolderExists(folder);
            var result = new List<RecordedVideoItem>();
            try
            {
                var dir = new DirectoryInfo(target);
                if (!dir.Exists) return result;

                var files = dir.EnumerateFiles()
                    .Where(f =>
                    {
                        string e = f.Extension.ToLowerInvariant();
                        return e == ".mp4" || e == ".webm";
                    })
                    .OrderByDescending(f => f.LastWriteTimeUtc)
                    .Take(Math.Max(1, maxCount));

                foreach (var f in files)
                {
                    result.Add(new RecordedVideoItem
                    {
                        Name = f.Name,
                        Path = f.FullName,
                        SizeBytes = f.Length,
                        ModifiedMs = new DateTimeOffset(f.LastWriteTimeUtc).ToUnixTimeMilliseconds(),
                        Ext = f.Extension.TrimStart('.').ToLowerInvariant()
                    });
                }
            }
            catch { }
            return result;
        }

        public bool DeleteVideo(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath)) return false;
            string full = Path.GetFullPath(filePath.Trim());
            if (!IsPathWithinAllowedVideoScope(full, requireVideoExt: true))
            {
                throw new UnauthorizedAccessException("Chỉ được phép xóa tệp video (.mp4, .webm) trong phạm vi hợp lệ của MinNote.");
            }
            if (!File.Exists(full)) return false;
            File.Delete(full);
            return true;
        }

        public void OpenFolder(string? folder = null)
        {
            string target = EnsureFolderExists(folder).Replace("\"", "");
            Process.Start(new ProcessStartInfo
            {
                FileName = "explorer.exe",
                Arguments = $"\"{target}\"",
                UseShellExecute = true
            });
        }

        public void RevealFile(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath)) return;
            string full = Path.GetFullPath(filePath.Trim());
            if (!IsPathWithinAllowedVideoScope(full, requireVideoExt: true))
            {
                throw new UnauthorizedAccessException("Chỉ được phép hiển thị tệp video (.mp4, .webm) trong phạm vi hợp lệ của MinNote.");
            }
            string safeFull = full.Replace("\"", "");
            if (File.Exists(safeFull))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "explorer.exe",
                    Arguments = $"/select,\"{safeFull}\"",
                    UseShellExecute = true
                });
            }
            else
            {
                OpenFolder(Path.GetDirectoryName(safeFull));
            }
        }

        public void OpenFile(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath)) return;
            string full = Path.GetFullPath(filePath.Trim());
            if (!IsPathWithinAllowedVideoScope(full, requireVideoExt: true))
            {
                throw new UnauthorizedAccessException("Chỉ được phép mở tệp video (.mp4, .webm) trong phạm vi hợp lệ của MinNote.");
            }
            if (!File.Exists(full)) return;
            Process.Start(new ProcessStartInfo
            {
                FileName = full,
                UseShellExecute = true
            });
        }

        public void Dispose()
        {
            foreach (var key in _sessions.Keys.ToList())
            {
                AbortWrite(key);
            }
        }
    }
}
