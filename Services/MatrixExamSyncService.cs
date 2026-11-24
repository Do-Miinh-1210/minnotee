using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace MinNote.Services
{
    public sealed class MeaAiExecutionResult
    {
        [JsonPropertyName("ok")]
        public bool Ok { get; set; }

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("provider")]
        public string Provider { get; set; } = string.Empty;

        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("latencyMs")]
        public long LatencyMs { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }

    public sealed class MeaTestConnectionResult
    {
        [JsonPropertyName("ok")]
        public bool Ok { get; set; }

        [JsonPropertyName("reply")]
        public string Reply { get; set; } = string.Empty;

        [JsonPropertyName("latencyMs")]
        public long LatencyMs { get; set; }

        [JsonPropertyName("provider")]
        public string Provider { get; set; } = string.Empty;

        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }

    public sealed class MeaSyncStatusInfo
    {
        [JsonPropertyName("configPath")]
        public string ConfigPath { get; set; } = string.Empty;

        [JsonPropertyName("configExists")]
        public bool ConfigExists { get; set; }

        [JsonPropertyName("pySettingsPath")]
        public string PySettingsPath { get; set; } = string.Empty;

        [JsonPropertyName("pySettingsExists")]
        public bool PySettingsExists { get; set; }

        [JsonPropertyName("questionBankPath")]
        public string QuestionBankPath { get; set; } = string.Empty;

        [JsonPropertyName("questionBankPaths")]
        public List<string> QuestionBankPaths { get; set; } = new();

        [JsonPropertyName("questionBankSources")]
        public List<MeaQuestionSourceInfo> QuestionBankSources { get; set; } = new();

        [JsonPropertyName("questionBankExists")]
        public bool QuestionBankExists { get; set; }

        [JsonPropertyName("questionBankSchema")]
        public string QuestionBankSchema { get; set; } = "None";

        [JsonPropertyName("questionCount")]
        public long QuestionCount { get; set; }

        [JsonPropertyName("figuresDir")]
        public string FiguresDir { get; set; } = string.Empty;

        [JsonPropertyName("figuresExists")]
        public bool FiguresExists { get; set; }

        [JsonPropertyName("figureCount")]
        public int FigureCount { get; set; }
    }

    public sealed class MeaQuestionSourceInfo
    {
        [JsonPropertyName("key")]
        public string Key { get; set; } = string.Empty;

        [JsonPropertyName("label")]
        public string Label { get; set; } = string.Empty;

        [JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;

        [JsonPropertyName("schema")]
        public string Schema { get; set; } = "None";

        [JsonPropertyName("count")]
        public int Count { get; set; }

        [JsonPropertyName("isPrimary")]
        public bool IsPrimary { get; set; }
    }

    public sealed class MeaAiConfigDto
    {
        [JsonPropertyName("provider")]
        public string Provider { get; set; } = "Google Gemini";

        [JsonPropertyName("model")]
        public string Model { get; set; } = "gemini-2.5-flash";

        [JsonPropertyName("providers")]
        public List<string> Providers { get; set; } = new();

        [JsonPropertyName("modelsByProvider")]
        public Dictionary<string, List<string>> ModelsByProvider { get; set; } = new();

        [JsonPropertyName("providerKeyUrls")]
        public Dictionary<string, string> ProviderKeyUrls { get; set; } = new();

        [JsonPropertyName("keyRotation")]
        public bool KeyRotation { get; set; } = true;

        [JsonPropertyName("maskedKeysByProvider")]
        public Dictionary<string, string> MaskedKeysByProvider { get; set; } = new();

        [JsonPropertyName("keyCountsByProvider")]
        public Dictionary<string, int> KeyCountsByProvider { get; set; } = new();

        [JsonPropertyName("hasKeyByProvider")]
        public Dictionary<string, bool> HasKeyByProvider { get; set; } = new();

        [JsonPropertyName("antigravityInstalled")]
        public bool AntigravityInstalled { get; set; }

        [JsonPropertyName("openAfterExport")]
        public bool OpenAfterExport { get; set; } = true;

        [JsonPropertyName("syncStatus")]
        public MeaSyncStatusInfo SyncStatus { get; set; } = new();
    }

    public sealed class MeaSaveAiConfigRequest
    {
        public string Provider { get; set; } = "Google Gemini";
        public string Model { get; set; } = "gemini-2.5-flash";
        public string? RawKeys { get; set; }
        public bool KeyEdited { get; set; }
        public bool ClearKey { get; set; }
        public Dictionary<string, string>? KeysByProvider { get; set; }
        public bool? KeyRotation { get; set; }
    }

    public sealed class MeaResolvedImage
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("dataUrl")]
        public string DataUrl { get; set; } = string.Empty;
    }

    public sealed class MeaQuestionDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("subject")]
        public string Subject { get; set; } = "Toán";

        [JsonPropertyName("grade")]
        public int Grade { get; set; } = 12;

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("level")]
        public string Level { get; set; } = "Thông hiểu";

        [JsonPropertyName("qtype")]
        public string Qtype { get; set; } = "MultipleChoice4";

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("options")]
        public Dictionary<string, string> Options { get; set; } = new();

        [JsonPropertyName("correctAnswer")]
        public string CorrectAnswer { get; set; } = string.Empty;

        [JsonPropertyName("explanation")]
        public string Explanation { get; set; } = string.Empty;

        [JsonPropertyName("tikzCode")]
        public string TikzCode { get; set; } = string.Empty;

        [JsonPropertyName("images")]
        public List<string> Images { get; set; } = new();

        [JsonPropertyName("resolvedImages")]
        public List<MeaResolvedImage> ResolvedImages { get; set; } = new();

        [JsonPropertyName("inlineImages")]
        public Dictionary<string, string> InlineImages { get; set; } = new();

        [JsonPropertyName("source")]
        public string Source { get; set; } = string.Empty;

        [JsonPropertyName("createdAt")]
        public string CreatedAt { get; set; } = string.Empty;

        [JsonPropertyName("updatedAt")]
        public string UpdatedAt { get; set; } = string.Empty;

        [JsonPropertyName("chapterName")]
        public string ChapterName { get; set; } = string.Empty;

        [JsonPropertyName("lessonName")]
        public string LessonName { get; set; } = string.Empty;

        [JsonPropertyName("sourceDb")]
        public string SourceDb { get; set; } = string.Empty;

        [JsonPropertyName("sourceLabel")]
        public string SourceLabel { get; set; } = string.Empty;
    }

    public sealed class MeaQuestionFacets
    {
        [JsonPropertyName("grades")]
        public List<int> Grades { get; set; } = new();

        [JsonPropertyName("topics")]
        public List<string> Topics { get; set; } = new();

        [JsonPropertyName("levels")]
        public List<string> Levels { get; set; } = new();

        [JsonPropertyName("qtypes")]
        public List<string> Qtypes { get; set; } = new();
    }

    public sealed class MeaQuestionListResult
    {
        [JsonPropertyName("dbPath")]
        public string DbPath { get; set; } = string.Empty;

        [JsonPropertyName("dbPaths")]
        public List<string> DbPaths { get; set; } = new();

        [JsonPropertyName("sources")]
        public List<MeaQuestionSourceInfo> Sources { get; set; } = new();

        [JsonPropertyName("schema")]
        public string Schema { get; set; } = "None";

        [JsonPropertyName("total")]
        public int Total { get; set; }

        [JsonPropertyName("filteredTotal")]
        public int FilteredTotal { get; set; }

        [JsonPropertyName("limit")]
        public int Limit { get; set; }

        [JsonPropertyName("offset")]
        public int Offset { get; set; }

        [JsonPropertyName("facets")]
        public MeaQuestionFacets Facets { get; set; } = new();

        [JsonPropertyName("questions")]
        public List<MeaQuestionDto> Questions { get; set; } = new();
    }

    public sealed class MeaFigureIndexEntry
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("tags")]
        public List<string> Tags { get; set; } = new();

        [JsonPropertyName("created_at")]
        public string CreatedAt { get; set; } = string.Empty;

        [JsonPropertyName("source")]
        public string Source { get; set; } = "manual";

        [JsonPropertyName("tex_filename")]
        public string TexFilename { get; set; } = string.Empty;

        [JsonPropertyName("png_filename")]
        public string PngFilename { get; set; } = string.Empty;

        [JsonPropertyName("char_count")]
        public int CharCount { get; set; }

        [JsonPropertyName("tikz_hash")]
        public string TikzHash { get; set; } = string.Empty;
    }

    public sealed class MeaFigureDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("tags")]
        public List<string> Tags { get; set; } = new();

        [JsonPropertyName("createdAt")]
        public string CreatedAt { get; set; } = string.Empty;

        [JsonPropertyName("source")]
        public string Source { get; set; } = "manual";

        [JsonPropertyName("texFilename")]
        public string TexFilename { get; set; } = string.Empty;

        [JsonPropertyName("pngFilename")]
        public string PngFilename { get; set; } = string.Empty;

        [JsonPropertyName("charCount")]
        public int CharCount { get; set; }

        [JsonPropertyName("tikzHash")]
        public string TikzHash { get; set; } = string.Empty;

        [JsonPropertyName("hasPng")]
        public bool HasPng { get; set; }

        [JsonPropertyName("hasMnoteJson")]
        public bool HasMnoteJson { get; set; }

        [JsonPropertyName("pngDataUrl")]
        public string? PngDataUrl { get; set; }

        [JsonPropertyName("tikzCode")]
        public string? TikzCode { get; set; }

        [JsonPropertyName("mnoteJson")]
        public string? MnoteJson { get; set; }
    }

    /// <summary>
    /// Dịch vụ đồng bộ hai chiều 100% tương thích với MatrixExamAI Pro (MEA_v5.0):
    /// 1. Bảo mật API Key DPAPI (tương thích từng byte với AppSecurityGuardService).
    /// 2. Cấu hình AI dùng chung (config.json + mirror app_settings.json) & thực thi 6 nhà cung cấp AI.
    /// 3. Đồng bộ Ngân hàng câu hỏi SQLite hai chiều (tự nhận diện cả schema C# và Python + ảnh [HINH_ANH: ...]).
    /// 4. Đồng bộ Kho hình TikZ song song (index.json + figure_*.tex/png/mnote.json).
    /// 5. FileSystemWatcher chống rung 450ms phát sự kiện thời gian thực tới WebView2.
    /// </summary>
    public sealed class MatrixExamSyncService : IDisposable
    {
        public static MatrixExamSyncService Instance { get; } = new();

        private const string DpapiPrefix = "enc:dpapi:";
        private const int CRYPTPROTECT_UI_FORBIDDEN = 0x1;
        private const string DatabaseFileName = "question_bank.db";
        private const int WatcherDebounceMs = 1200;
        private const long SelfWriteSuppressMs = 1800;
        private const long StartupWatcherWarmupMs = 2500;
        private readonly long _serviceStartTicks = Environment.TickCount64;
        private string _lastQbFingerprint = string.Empty;
        private string _lastFigFingerprint = string.Empty;
        private string _lastCfgFingerprint = string.Empty;

        private static readonly UTF8Encoding Utf8NoBom = new(encoderShouldEmitUTF8Identifier: false);
        private static readonly HttpClient SharedHttp = new() { Timeout = Timeout.InfiniteTimeSpan };
        private static readonly JsonSerializerOptions PrettyJsonOptions = new()
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };
        private static readonly JsonSerializerOptions CompactJsonOptions = new()
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };
        private static readonly Regex InlineImageRegex = new(@"\[HINH_ANH:\s*([^\]]+?)\s*\]", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex SafeModelIdRegex = new(@"^[A-Za-z0-9][A-Za-z0-9._:-]*$", RegexOptions.Compiled);
        private static readonly Regex NineRouterKeyRegex = new(@"sk-[a-f0-9]{16}-[a-z0-9]{6}-[a-f0-9]{8}", RegexOptions.Compiled);

        private readonly object _configLock = new();
        private readonly object _figureLock = new();
        private readonly object _watcherLock = new();
        private readonly ConcurrentDictionary<string, long> _lastSelfWriteTicks = new(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, Timer> _debounceTimers = new(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, string> _emfPngCache = new(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, (List<string> Models, DateTime UtcAt)> _cachedLiveModels = new(StringComparer.OrdinalIgnoreCase);
        private static readonly TimeSpan LiveModelCacheTtl = TimeSpan.FromMinutes(15);

        private FileSystemWatcher? _configWatcher;
        private readonly List<FileSystemWatcher> _qbWatchers = new();
        private FileSystemWatcher? _figuresWatcher;
        private readonly HashSet<string> _watchedQbDirs = new(StringComparer.OrdinalIgnoreCase);
        private string _watchedFiguresDir = string.Empty;
        private bool _disposed;

        public event Action<string, object>? SyncChanged;

        public static readonly IReadOnlyList<string> SupportedProviders = new[]
        {
            "Google Gemini",
            "Antigravity",
            "9Router",
            "Anthropic Claude",
            "DeepSeek",
            "OpenAI GPT"
        };

        public static readonly Dictionary<string, List<string>> DefaultModelsByProvider = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Google Gemini"] = new()
            {
                "gemini-2.5-flash",
                "gemini-2.5-pro",
                "gemini-2.5-flash-lite",
                "gemini-3-flash-preview",
                "gemini-3.1-pro-preview",
                "gemini-3.1-flash-lite-preview",
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "gemini-2.0-flash-exp",
                "gemini-1.5-pro",
                "gemini-1.5-flash"
            },
            ["Antigravity"] = new()
            {
                "gemini-3.8-flash-medium",
                "gemini-3.8-flash-high",
                "gemini-3.8-flash-low",
                "gemini-4-neon-medium",
                "gemini-4-neon-high",
                "gemini-4-neon-low",
                "gemini-4-neon-xhigh",
                "gemini-4-carbon-medium",
                "gemini-4-carbon-high",
                "gemini-4-carbon-low",
                "gemini-4-argon-medium",
                "gemini-4-argon-high",
                "gemini-4-argon-low",
                "gemini-4-hydrogen-medium",
                "gemini-4-hydrogen-high",
                "gemini-4-hydrogen-low",
                "gemini-4-hydrogen-xhigh",
                "gemini-pro-orchestrator-neon",
                "gemini-pro-orchestrator",
                "gemini-pro-orchestrator-argon",
                "claude-sonnet-5-5-medium",
                "claude-sonnet-5-5-high",
                "claude-sonnet-5-5-low",
                "claude-opus-5-5-medium",
                "claude-opus-5-5-high",
                "claude-opus-5-5-low",
                "gpt-oss-120b-medium"
            },
            ["9Router"] = new()
            {
                "ag/gemini-3.8-flash-medium",
                "ag/gemini-3.8-flash-high",
                "ag/gemini-3.8-flash-low",
                "ag/gemini-3.8-flash",
                "ag/gemini-4-carbon-medium",
                "ag/gemini-4-carbon-high",
                "ag/gemini-4-argon-medium",
                "ag/gemini-4-argon-high",
                "ag/claude-sonnet-5-5-medium",
                "ag/claude-sonnet-5-5-high",
                "ag/claude-opus-5-5-medium",
                "ag/claude-sonnet-4-6",
                "ag/claude-opus-4-6-thinking",
                "ag/gemini-3.1-pro-high",
                "ag/gpt-oss-120b-medium",
                "anthropic/claude-sonnet-4-20250514",
                "anthropic/claude-opus-4-20250514",
                "openai/gpt-4o",
                "deepseek/deepseek-chat"
            },
            ["Anthropic Claude"] = new()
            {
                "claude-sonnet-4-6",
                "claude-opus-4-6",
                "claude-sonnet-4-5",
                "claude-opus-4-5",
                "claude-haiku-4-5",
                "claude-sonnet-4-20250514",
                "claude-opus-4-20250514",
                "claude-3-7-sonnet-latest",
                "claude-3-5-sonnet-latest",
                "claude-3-5-haiku-latest",
                "claude-sonnet-5",
                "claude-opus-5"
            },
            ["DeepSeek"] = new()
            {
                "deepseek-chat",
                "deepseek-reasoner",
                "deepseek-v4.1-flash"
            },
            ["OpenAI GPT"] = new()
            {
                "gpt-5.2",
                "gpt-5",
                "gpt-5-mini",
                "gpt-4.1",
                "gpt-4.1-mini",
                "gpt-4.1-nano",
                "gpt-4o",
                "gpt-4o-mini",
                "o3",
                "o4-mini",
                "gpt-4.5"
            }
        };

        public static readonly Dictionary<string, string> ProviderKeyUrls = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Google Gemini"] = "https://aistudio.google.com/apikey",
            ["Antigravity"] = "",
            ["9Router"] = "http://localhost:20128",
            ["Anthropic Claude"] = "https://console.anthropic.com/settings/keys",
            ["DeepSeek"] = "https://platform.deepseek.com/api_keys",
            ["OpenAI GPT"] = "https://platform.openai.com/api-keys"
        };

        public static string LocalAppDataMeaDir =>
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MatrixExamAI");

        public static string ConfigFilePath => Path.Combine(LocalAppDataMeaDir, "config.json");

        public static string ExamGeneratorDir =>
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".exam_generator");

        public static string PySettingsFilePath => Path.Combine(ExamGeneratorDir, "app_settings.json");

        private MatrixExamSyncService()
        {
        }

        #region Windows DPAPI P/Invoke (Byte-compatible with MEA_v5.0 AppSecurityGuardService)

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct DATA_BLOB
        {
            public int cbData;
            public IntPtr pbData;
        }

        [DllImport("crypt32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern bool CryptProtectData(
            ref DATA_BLOB pDataIn,
            string szDataDescr,
            ref DATA_BLOB pOptionalEntropy,
            IntPtr pvReserved,
            IntPtr pPromptStruct,
            int dwFlags,
            ref DATA_BLOB pDataOut);

        [DllImport("crypt32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern bool CryptUnprotectData(
            ref DATA_BLOB pDataIn,
            StringBuilder? ppszDataDescr,
            ref DATA_BLOB pOptionalEntropy,
            IntPtr pvReserved,
            IntPtr pPromptStruct,
            int dwFlags,
            ref DATA_BLOB pDataOut);

        [DllImport("kernel32.dll")]
        private static extern IntPtr LocalFree(IntPtr hMem);

        public static string ProtectSecret(string? plainText)
        {
            if (string.IsNullOrEmpty(plainText)) return string.Empty;
            if (plainText.StartsWith(DpapiPrefix, StringComparison.Ordinal)) return plainText;

            try
            {
                byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
                byte[] cipherBytes = ProtectBytes(plainBytes);
                return DpapiPrefix + Convert.ToBase64String(cipherBytes);
            }
            catch (Exception ex)
            {
                throw new CryptographicException("Không mã hóa được khóa bí mật bằng Windows DPAPI; khóa không được lưu.", ex);
            }
        }

        public static string UnprotectSecret(string? cipherText)
        {
            if (string.IsNullOrEmpty(cipherText)) return string.Empty;
            if (!cipherText.StartsWith(DpapiPrefix, StringComparison.Ordinal)) return cipherText;

            try
            {
                string base64 = cipherText.Substring(DpapiPrefix.Length);
                byte[] cipherBytes = Convert.FromBase64String(base64);
                if (cipherBytes.Length == 0) return string.Empty;
                byte[] plainBytes = UnprotectBytes(cipherBytes);
                return Encoding.UTF8.GetString(plainBytes);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[MatrixExamSyncService] UnprotectSecret failed: {ex.Message}");
                return string.Empty;
            }
        }

        public static byte[] ProtectBytes(byte[] plainBytes)
        {
            if (plainBytes.Length == 0) return Array.Empty<byte>();
            DATA_BLOB inBlob = new();
            DATA_BLOB outBlob = new();
            DATA_BLOB entropyBlob = new();

            GCHandle inHandle = GCHandle.Alloc(plainBytes, GCHandleType.Pinned);
            try
            {
                inBlob.pbData = inHandle.AddrOfPinnedObject();
                inBlob.cbData = plainBytes.Length;

                if (CryptProtectData(ref inBlob, "MEA_PRO_SECRET", ref entropyBlob, IntPtr.Zero, IntPtr.Zero, CRYPTPROTECT_UI_FORBIDDEN, ref outBlob))
                {
                    try
                    {
                        byte[] result = new byte[outBlob.cbData];
                        Marshal.Copy(outBlob.pbData, result, 0, outBlob.cbData);
                        return result;
                    }
                    finally
                    {
                        if (outBlob.pbData != IntPtr.Zero) LocalFree(outBlob.pbData);
                    }
                }
                throw new InvalidOperationException($"CryptProtectData failed with Win32 error {Marshal.GetLastWin32Error()}");
            }
            finally
            {
                inHandle.Free();
            }
        }

        public static byte[] UnprotectBytes(byte[] cipherBytes)
        {
            if (cipherBytes.Length == 0) return Array.Empty<byte>();
            DATA_BLOB inBlob = new();
            DATA_BLOB outBlob = new();
            DATA_BLOB entropyBlob = new();

            GCHandle inHandle = GCHandle.Alloc(cipherBytes, GCHandleType.Pinned);
            try
            {
                inBlob.pbData = inHandle.AddrOfPinnedObject();
                inBlob.cbData = cipherBytes.Length;

                if (CryptUnprotectData(ref inBlob, null, ref entropyBlob, IntPtr.Zero, IntPtr.Zero, CRYPTPROTECT_UI_FORBIDDEN, ref outBlob))
                {
                    try
                    {
                        byte[] result = new byte[outBlob.cbData];
                        Marshal.Copy(outBlob.pbData, result, 0, outBlob.cbData);
                        return result;
                    }
                    finally
                    {
                        if (outBlob.pbData != IntPtr.Zero) LocalFree(outBlob.pbData);
                    }
                }
                throw new InvalidOperationException($"CryptUnprotectData failed with Win32 error {Marshal.GetLastWin32Error()}");
            }
            finally
            {
                inHandle.Free();
            }
        }

        #endregion

        #region Key Helpers & Normalization

        public static List<string> SplitKeys(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
            return raw.Split(new[] { '\r', '\n', ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                      .Select(k => k.Trim())
                      .Where(k => !string.IsNullOrEmpty(k) && !k.StartsWith("#", StringComparison.Ordinal))
                      .Distinct(StringComparer.Ordinal)
                      .ToList();
        }

        public static string MaskKeys(string? raw)
        {
            var keys = SplitKeys(raw);
            if (keys.Count == 0) return string.Empty;
            return string.Join(Environment.NewLine, keys.Select(k =>
                k.Length <= 8 ? "••••••••" : $"{k[..4]}••••••••{k[^4..]}"));
        }

        public static string NormalizeProviderName(string? provider)
        {
            string p = (provider ?? string.Empty).Trim();
            if (string.IsNullOrEmpty(p)) return "Google Gemini";
            if (p.Equals("Google", StringComparison.OrdinalIgnoreCase) ||
                p.Equals("Gemini", StringComparison.OrdinalIgnoreCase) ||
                p.Equals("Google Gemini", StringComparison.OrdinalIgnoreCase))
                return "Google Gemini";
            if (p.StartsWith("Antigravity", StringComparison.OrdinalIgnoreCase))
                return "Antigravity";
            if (p.Equals("9Router", StringComparison.OrdinalIgnoreCase))
                return "9Router";
            if (p.Equals("Anthropic Claude", StringComparison.OrdinalIgnoreCase) ||
                p.Equals("Claude", StringComparison.OrdinalIgnoreCase) ||
                p.Equals("Anthropic", StringComparison.OrdinalIgnoreCase))
                return "Anthropic Claude";
            if (p.Equals("DeepSeek", StringComparison.OrdinalIgnoreCase))
                return "DeepSeek";
            if (p.StartsWith("OpenAI", StringComparison.OrdinalIgnoreCase))
                return "OpenAI GPT";
            return p;
        }

        private static bool IsAntigravityProvider(string? provider) =>
            string.Equals(NormalizeProviderName(provider), "Antigravity", StringComparison.OrdinalIgnoreCase);

        private static string GetDefaultModelForProvider(string provider)
        {
            string norm = NormalizeProviderName(provider);
            if (DefaultModelsByProvider.TryGetValue(norm, out var list) && list.Count > 0)
                return list[0];
            return "gemini-2.5-flash";
        }

        #endregion

        #region Shared AI Config (Read-Merge-Write Atomic + app_settings.json Mirror)

        private sealed class InternalAiConfig
        {
            public string Provider { get; set; } = "Google Gemini";
            public string Model { get; set; } = "gemini-2.5-flash";
            public bool KeyRotation { get; set; } = true;
            public bool OpenAfterExport { get; set; } = true;
            public string QuestionBankDir { get; set; } = string.Empty;
            public Dictionary<string, string> KeysByProvider { get; set; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, string> SavedModelsByProvider { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        }

        private InternalAiConfig ReadInternalConfig()
        {
            lock (_configLock)
            {
                var cfg = new InternalAiConfig();
                bool hasExplicitProvider = false;
                bool hasExplicitModel = false;
                string topApiKey = string.Empty;

                if (File.Exists(ConfigFilePath))
                {
                    try
                    {
                        string json = File.ReadAllText(ConfigFilePath, Encoding.UTF8);
                        using var doc = JsonDocument.Parse(json);
                        var root = doc.RootElement;

                        if (root.TryGetProperty("provider", out var pProv) && pProv.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(pProv.GetString()))
                        {
                            cfg.Provider = NormalizeProviderName(pProv.GetString());
                            hasExplicitProvider = true;
                        }
                        if (root.TryGetProperty("model", out var pModel) && pModel.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(pModel.GetString()))
                        {
                            cfg.Model = pModel.GetString()!.Trim();
                            hasExplicitModel = true;
                        }
                        if (root.TryGetProperty("apiKey", out var pKey) && pKey.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(pKey.GetString()))
                        {
                            topApiKey = UnprotectSecret(pKey.GetString()!.Trim());
                        }
                        if (root.TryGetProperty("nineRouterApiKey", out var p9) && p9.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(p9.GetString()))
                        {
                            string k9 = UnprotectSecret(p9.GetString()!.Trim());
                            if (!string.IsNullOrWhiteSpace(k9)) cfg.KeysByProvider["9Router"] = k9;
                        }
                        if (root.TryGetProperty("openAiApiKey", out var pOai) && pOai.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(pOai.GetString()))
                        {
                            string ko = UnprotectSecret(pOai.GetString()!.Trim());
                            if (!string.IsNullOrWhiteSpace(ko)) cfg.KeysByProvider["OpenAI GPT"] = ko;
                        }
                        if (root.TryGetProperty("keysByProvider", out var pDict) && pDict.ValueKind == JsonValueKind.Object)
                        {
                            foreach (var prop in pDict.EnumerateObject())
                            {
                                if (prop.Value.ValueKind == JsonValueKind.String)
                                {
                                    string normKey = NormalizeProviderName(prop.Name);
                                    cfg.KeysByProvider[normKey] = UnprotectSecret(prop.Value.GetString()!.Trim());
                                }
                            }
                        }
                        if (root.TryGetProperty("keyRotation", out var pRot))
                        {
                            cfg.KeyRotation = ReadFlexibleBool(pRot, true);
                        }
                        if (root.TryGetProperty("openAfterExport", out var pOpen))
                        {
                            cfg.OpenAfterExport = ReadFlexibleBool(pOpen, true);
                        }
                        if (root.TryGetProperty("questionBankDir", out var pQb) && pQb.ValueKind == JsonValueKind.String)
                        {
                            cfg.QuestionBankDir = (pQb.GetString() ?? string.Empty).Trim();
                        }

                        if (!hasExplicitProvider && !string.IsNullOrEmpty(topApiKey) && topApiKey.StartsWith("sk-", StringComparison.OrdinalIgnoreCase))
                        {
                            cfg.Provider = "9Router";
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[MatrixExamSyncService] Read config.json error: {ex.Message}");
                    }
                }

                // Read mirror app_settings.json for fallbacks & per-provider saved model
                if (File.Exists(PySettingsFilePath))
                {
                    try
                    {
                        string pyJson = File.ReadAllText(PySettingsFilePath, Encoding.UTF8);
                        using var doc = JsonDocument.Parse(pyJson);
                        var root = doc.RootElement;

                        if (!hasExplicitProvider && string.IsNullOrEmpty(topApiKey) && !IsAntigravityProvider(cfg.Provider) &&
                            root.TryGetProperty("selected_ai_provider", out var pyProv) && pyProv.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(pyProv.GetString()))
                        {
                            cfg.Provider = NormalizeProviderName(pyProv.GetString());
                        }
                        if (!hasExplicitModel && root.TryGetProperty("selected_ai_model", out var pyModel) && pyModel.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(pyModel.GetString()))
                        {
                            cfg.Model = pyModel.GetString()!.Trim();
                        }
                        if (string.IsNullOrWhiteSpace(cfg.QuestionBankDir) && root.TryGetProperty("nhch_dir", out var pyQb) && pyQb.ValueKind == JsonValueKind.String)
                        {
                            cfg.QuestionBankDir = (pyQb.GetString() ?? string.Empty).Trim();
                        }
                        foreach (var prop in root.EnumerateObject())
                        {
                            if (prop.Name.StartsWith("selected_ai_model_", StringComparison.OrdinalIgnoreCase) &&
                                prop.Value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(prop.Value.GetString()))
                            {
                                string provPart = prop.Name.Substring("selected_ai_model_".Length);
                                cfg.SavedModelsByProvider[NormalizeProviderName(provPart)] = prop.Value.GetString()!.Trim();
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[MatrixExamSyncService] Read app_settings.json error: {ex.Message}");
                    }
                }

                if (!string.IsNullOrEmpty(topApiKey) && !IsAntigravityProvider(cfg.Provider) &&
                    (!cfg.KeysByProvider.TryGetValue(cfg.Provider, out var existingProvKey) || string.IsNullOrWhiteSpace(existingProvKey)))
                {
                    cfg.KeysByProvider[cfg.Provider] = topApiKey;
                }

                if (string.IsNullOrWhiteSpace(cfg.Model))
                {
                    cfg.Model = GetDefaultModelForProvider(cfg.Provider);
                }

                return cfg;
            }
        }

        private static bool ReadFlexibleBool(JsonElement el, bool fallback)
        {
            if (el.ValueKind == JsonValueKind.True) return true;
            if (el.ValueKind == JsonValueKind.False) return false;
            if (el.ValueKind == JsonValueKind.String && bool.TryParse(el.GetString(), out bool parsed)) return parsed;
            return fallback;
        }

        public async Task<MeaAiConfigDto> GetAiConfigAsync()
        {
            var cfg = ReadInternalConfig();
            var status = await GetSyncStatusAsync().ConfigureAwait(false);

            var modelsMap = new Dictionary<string, List<string>>();
            var maskedMap = new Dictionary<string, string>();
            var countMap = new Dictionary<string, int>();
            var hasKeyMap = new Dictionary<string, bool>();

            foreach (var prov in SupportedProviders)
            {
                var list = new List<string>();
                if (_cachedLiveModels.TryGetValue(prov, out var cached) &&
                    (DateTime.UtcNow - cached.UtcAt) <= LiveModelCacheTtl &&
                    cached.Models.Count > 0)
                {
                    list.AddRange(cached.Models);
                }
                else if (DefaultModelsByProvider.TryGetValue(prov, out var defs))
                {
                    list.AddRange(defs);
                }
                if (string.Equals(prov, cfg.Provider, StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(cfg.Model) &&
                    !list.Contains(cfg.Model, StringComparer.OrdinalIgnoreCase))
                {
                    list.Insert(0, cfg.Model);
                }
                else if (cfg.SavedModelsByProvider.TryGetValue(prov, out var savedProvModel) &&
                         !string.IsNullOrWhiteSpace(savedProvModel) &&
                         !list.Contains(savedProvModel, StringComparer.OrdinalIgnoreCase))
                {
                    list.Insert(0, savedProvModel);
                }
                modelsMap[prov] = list;

                string raw = cfg.KeysByProvider.TryGetValue(prov, out var k) ? k : string.Empty;
                var split = SplitKeys(raw);
                maskedMap[prov] = MaskKeys(raw);
                countMap[prov] = split.Count;
                hasKeyMap[prov] = split.Count > 0;
            }

            return new MeaAiConfigDto
            {
                Provider = cfg.Provider,
                Model = cfg.Model,
                Providers = SupportedProviders.ToList(),
                ModelsByProvider = modelsMap,
                ProviderKeyUrls = new Dictionary<string, string>(ProviderKeyUrls),
                KeyRotation = cfg.KeyRotation,
                MaskedKeysByProvider = maskedMap,
                KeyCountsByProvider = countMap,
                HasKeyByProvider = hasKeyMap,
                AntigravityInstalled = FindAntigravityExecutable() != null,
                OpenAfterExport = cfg.OpenAfterExport,
                SyncStatus = status
            };
        }

        public (string Provider, string RawKeys, int KeyCount, string Masked) RevealApiKey(string? provider = null)
        {
            var cfg = ReadInternalConfig();
            string targetProv = string.IsNullOrWhiteSpace(provider) ? cfg.Provider : NormalizeProviderName(provider);
            string raw = cfg.KeysByProvider.TryGetValue(targetProv, out var k) ? k : string.Empty;
            var keys = SplitKeys(raw);
            return (targetProv, raw, keys.Count, MaskKeys(raw));
        }

        public async Task<MeaAiConfigDto> SaveAiConfigAsync(MeaSaveAiConfigRequest req)
        {
            string provider = NormalizeProviderName(req.Provider);
            string model = string.IsNullOrWhiteSpace(req.Model) ? GetDefaultModelForProvider(provider) : req.Model.Trim();

            lock (_configLock)
            {
                // 1. Read existing config.json as JsonObject so ALL unrelated keys are preserved
                JsonObject configObj = new();
                if (File.Exists(ConfigFilePath))
                {
                    try
                    {
                        var parsed = JsonNode.Parse(File.ReadAllText(ConfigFilePath, Encoding.UTF8));
                        if (parsed is JsonObject existingObj) configObj = existingObj;
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[MatrixExamSyncService] Existing config.json parse fallback: {ex.Message}");
                    }
                }

                // 2. Collect existing decrypted keys across all providers
                var plainKeys = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                if (configObj["keysByProvider"] is JsonObject existingKeysObj)
                {
                    foreach (var kv in existingKeysObj)
                    {
                        string val = kv.Value?.GetValue<string>() ?? string.Empty;
                        plainKeys[NormalizeProviderName(kv.Key)] = UnprotectSecret(val);
                    }
                }
                if (configObj["nineRouterApiKey"] is JsonValue v9 && v9.TryGetValue<string>(out var s9) && !string.IsNullOrWhiteSpace(s9) && !plainKeys.ContainsKey("9Router"))
                {
                    plainKeys["9Router"] = UnprotectSecret(s9);
                }
                if (configObj["openAiApiKey"] is JsonValue vOai && vOai.TryGetValue<string>(out var sOai) && !string.IsNullOrWhiteSpace(sOai) && !plainKeys.ContainsKey("OpenAI GPT"))
                {
                    plainKeys["OpenAI GPT"] = UnprotectSecret(sOai);
                }
                if (configObj["provider"] is JsonValue vPrevProv && vPrevProv.TryGetValue<string>(out var prevProvStr) &&
                    configObj["apiKey"] is JsonValue vTopKey && vTopKey.TryGetValue<string>(out var topKeyStr) && !string.IsNullOrWhiteSpace(topKeyStr))
                {
                    string prevNorm = NormalizeProviderName(prevProvStr);
                    if (!plainKeys.TryGetValue(prevNorm, out var existPrev) || string.IsNullOrWhiteSpace(existPrev))
                    {
                        plainKeys[prevNorm] = UnprotectSecret(topKeyStr);
                    }
                }

                // 3. Apply incoming key updates (never accidentally overwrite with masked placeholder dots)
                if (req.KeysByProvider != null)
                {
                    foreach (var kv in req.KeysByProvider)
                    {
                        string pNorm = NormalizeProviderName(kv.Key);
                        if (IsAntigravityProvider(pNorm)) continue;
                        string candidate = (kv.Value ?? string.Empty).Trim();
                        if (!candidate.Contains("••••", StringComparison.Ordinal))
                        {
                            plainKeys[pNorm] = candidate;
                        }
                    }
                }

                if (!IsAntigravityProvider(provider))
                {
                    if (req.ClearKey)
                    {
                        plainKeys[provider] = string.Empty;
                    }
                    else if (req.RawKeys != null && (req.KeyEdited || !req.RawKeys.Contains("••••", StringComparison.Ordinal)))
                    {
                        string candidate = req.RawKeys.Trim();
                        if (!candidate.Contains("••••", StringComparison.Ordinal))
                        {
                            plainKeys[provider] = candidate;
                        }
                    }
                }

                string activePlainKey = plainKeys.TryGetValue(provider, out var ak) ? ak : string.Empty;
                string nineRouterPlain = plainKeys.TryGetValue("9Router", out var k9) ? k9 : string.Empty;
                string openAiPlain = plainKeys.TryGetValue("OpenAI GPT", out var kOai) ? kOai : string.Empty;

                // 4. Encrypt every secret with DPAPI before serializing
                var protectedKeysObj = new JsonObject();
                foreach (var kv in plainKeys)
                {
                    protectedKeysObj[kv.Key] = string.IsNullOrEmpty(kv.Value) ? string.Empty : ProtectSecret(kv.Value);
                }

                configObj["provider"] = provider;
                configObj["model"] = model;
                configObj["apiKey"] = IsAntigravityProvider(provider) || string.IsNullOrEmpty(activePlainKey)
                    ? string.Empty
                    : ProtectSecret(activePlainKey);
                configObj["nineRouterApiKey"] = string.IsNullOrEmpty(nineRouterPlain) ? string.Empty : ProtectSecret(nineRouterPlain);
                configObj["openAiApiKey"] = string.IsNullOrEmpty(openAiPlain) ? string.Empty : ProtectSecret(openAiPlain);
                configObj["keysByProvider"] = protectedKeysObj;
                if (req.KeyRotation.HasValue)
                {
                    configObj["keyRotation"] = req.KeyRotation.Value;
                }
                else if (configObj["keyRotation"] is null)
                {
                    configObj["keyRotation"] = true;
                }

                MarkSelfWrite("config_changed");
                WriteAllTextAtomic(ConfigFilePath, configObj.ToJsonString(PrettyJsonOptions));

                // 5. Mirror provider/model ONLY into ~/.exam_generator/app_settings.json (NEVER API keys!)
                try
                {
                    JsonObject pyObj = new();
                    if (File.Exists(PySettingsFilePath))
                    {
                        try
                        {
                            var parsedPy = JsonNode.Parse(File.ReadAllText(PySettingsFilePath, Encoding.UTF8));
                            if (parsedPy is JsonObject existingPy) pyObj = existingPy;
                        }
                        catch { }
                    }
                    pyObj["selected_ai_provider"] = provider;
                    pyObj["selected_ai_model"] = model;
                    pyObj[$"selected_ai_model_{provider}"] = model;
                    WriteAllTextAtomic(PySettingsFilePath, pyObj.ToJsonString(PrettyJsonOptions));
                }
                catch (Exception exMirror)
                {
                    Debug.WriteLine($"[MatrixExamSyncService] Mirror app_settings.json notice: {exMirror.Message}");
                }
            }

            EnsureWatchersStarted();
            return await GetAiConfigAsync().ConfigureAwait(false);
        }

        #endregion

        #region AI Execution (All 6 Providers + Multi-Key Rotation + 9Router -> Gemini Fallback)

        public Task<(List<string> Models, bool Live, string? Note)> RefreshModelsAsync(string? provider = null, CancellationToken ct = default) =>
            RefreshModelsAsync(provider, overrideRawKeys: null, ct);

        public async Task<(List<string> Models, bool Live, string? Note)> RefreshModelsAsync(
            string? provider,
            string? overrideRawKeys,
            CancellationToken ct = default)
        {
            var cfg = ReadInternalConfig();
            string targetProv = string.IsNullOrWhiteSpace(provider) ? cfg.Provider : NormalizeProviderName(provider);
            var defaults = DefaultModelsByProvider.TryGetValue(targetProv, out var d) ? new List<string>(d) : new List<string>();

            if (string.Equals(targetProv, "9Router", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    timeoutCts.CancelAfter(TimeSpan.FromSeconds(4));
                    using var response = await SharedHttp.GetAsync("http://localhost:20128/v1/models", timeoutCts.Token).ConfigureAwait(false);
                    if (response.IsSuccessStatusCode)
                    {
                        string body = await response.Content.ReadAsStringAsync(timeoutCts.Token).ConfigureAwait(false);
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
                        {
                            var rawList = new List<string>();
                            foreach (var item in data.EnumerateArray())
                            {
                                if (item.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(idProp.GetString()))
                                {
                                    rawList.Add(idProp.GetString()!.Trim());
                                }
                            }
                            if (rawList.Count > 0)
                            {
                                var sorted = Sort9RouterModels(rawList);
                                _cachedLiveModels[targetProv] = (sorted, DateTime.UtcNow);
                                return (sorted, true, $"Tìm thấy {sorted.Count} mô hình đang chạy trên 9Router (cổng 20128).");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[MatrixExamSyncService] Fetch 9Router models notice: {ex.Message}");
                }

                return (defaults, false, "9Router chưa chạy trên cổng 20128 — đang hiển thị danh sách mặc định.");
            }

            if (IsAntigravityProvider(targetProv))
            {
                string? exe = FindAntigravityExecutable();
                if (exe != null)
                {
                    try
                    {
                        var (stdout, stderr, _, timedOut) = await RunAgyProcessAsync(
                            exe,
                            new[] { "models" },
                            string.Empty,
                            Path.GetTempPath(),
                            TimeSpan.FromSeconds(20),
                            ct).ConfigureAwait(false);

                        if (!timedOut && !string.IsNullOrWhiteSpace(stdout))
                        {
                            var models = stdout.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                                .Select(line =>
                                {
                                    string t = line.Trim();
                                    if (t.Contains('\t')) return t.Split('\t')[0].Trim();
                                    int sp = t.IndexOf(' ');
                                    return sp > 0 ? t[..sp].Trim() : t;
                                })
                                .Where(id => SafeModelIdRegex.IsMatch(id))
                                .Distinct(StringComparer.OrdinalIgnoreCase)
                                .ToList();

                            if (models.Count > 0)
                            {
                                _cachedLiveModels[targetProv] = (models, DateTime.UtcNow);
                                return (models, true, $"Tìm thấy {models.Count} mô hình khả dụng từ Antigravity CLI.");
                            }
                        }
                        return (defaults, false,
                            string.IsNullOrWhiteSpace(stderr) ? "Không đọc được danh sách từ agy — đang dùng danh sách mặc định." : stderr.Trim());
                    }
                    catch (Exception ex)
                    {
                        return (defaults, false, ex.Message);
                    }
                }

                return (defaults, false, "Chưa tìm thấy agy.exe — đang hiển thị danh sách mặc định.");
            }

            string apiKey = ResolveFirstProviderKey(cfg, targetProv, overrideRawKeys);
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return (defaults, false, $"Đang dùng danh sách chuẩn ({defaults.Count} model). Nhập API Key nếu muốn tải danh sách trực tiếp từ {targetProv}.");
            }

            try
            {
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(8));

                if (string.Equals(targetProv, "Google Gemini", StringComparison.OrdinalIgnoreCase))
                {
                    string url = $"https://generativelanguage.googleapis.com/v1beta/models?key={Uri.EscapeDataString(apiKey)}&pageSize=100";
                    using var response = await SharedHttp.GetAsync(url, timeoutCts.Token).ConfigureAwait(false);
                    if (response.IsSuccessStatusCode)
                    {
                        string body = await response.Content.ReadAsStringAsync(timeoutCts.Token).ConfigureAwait(false);
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("models", out var modelsArr) && modelsArr.ValueKind == JsonValueKind.Array)
                        {
                            var found = new List<string>();
                            foreach (var m in modelsArr.EnumerateArray())
                            {
                                bool canGen = false;
                                if (m.TryGetProperty("supportedGenerationMethods", out var gm) && gm.ValueKind == JsonValueKind.Array)
                                {
                                    foreach (var item in gm.EnumerateArray())
                                    {
                                        if (string.Equals(item.GetString(), "generateContent", StringComparison.OrdinalIgnoreCase))
                                        {
                                            canGen = true;
                                            break;
                                        }
                                    }
                                }
                                if (!canGen) continue;
                                if (m.TryGetProperty("name", out var nEl) && nEl.ValueKind == JsonValueKind.String)
                                {
                                    string id = (nEl.GetString() ?? string.Empty).Trim();
                                    if (id.StartsWith("models/", StringComparison.OrdinalIgnoreCase))
                                        id = id.Substring(7);
                                    if (!string.IsNullOrWhiteSpace(id) &&
                                        !id.Contains("embedding", StringComparison.OrdinalIgnoreCase) &&
                                        !id.Contains("aqa", StringComparison.OrdinalIgnoreCase) &&
                                        !id.Contains("imagen", StringComparison.OrdinalIgnoreCase) &&
                                        !id.Contains("veo", StringComparison.OrdinalIgnoreCase) &&
                                        !id.Contains("learnlm", StringComparison.OrdinalIgnoreCase) &&
                                        !id.StartsWith("gemma-2", StringComparison.OrdinalIgnoreCase))
                                    {
                                        found.Add(id);
                                    }
                                }
                            }
                            if (found.Count > 0)
                            {
                                var sorted = SortGeminiModels(found);
                                _cachedLiveModels[targetProv] = (sorted, DateTime.UtcNow);
                                return (sorted, true, $"Tìm thấy {sorted.Count} mô hình Google Gemini.");
                            }
                        }
                    }
                }
                else if (string.Equals(targetProv, "OpenAI GPT", StringComparison.OrdinalIgnoreCase))
                {
                    using var reqMsg = new HttpRequestMessage(HttpMethod.Get, "https://api.openai.com/v1/models");
                    reqMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                    using var response = await SharedHttp.SendAsync(reqMsg, timeoutCts.Token).ConfigureAwait(false);
                    if (response.IsSuccessStatusCode)
                    {
                        string body = await response.Content.ReadAsStringAsync(timeoutCts.Token).ConfigureAwait(false);
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("data", out var dataArr) && dataArr.ValueKind == JsonValueKind.Array)
                        {
                            var found = new List<string>();
                            foreach (var m in dataArr.EnumerateArray())
                            {
                                string id = m.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String ? (idEl.GetString() ?? string.Empty).Trim() : string.Empty;
                                if (string.IsNullOrEmpty(id)) continue;
                                bool allowedPrefix = id.StartsWith("gpt-", StringComparison.OrdinalIgnoreCase) ||
                                                     id.StartsWith("o1", StringComparison.OrdinalIgnoreCase) ||
                                                     id.StartsWith("o3", StringComparison.OrdinalIgnoreCase) ||
                                                     id.StartsWith("o4", StringComparison.OrdinalIgnoreCase) ||
                                                     id.StartsWith("chatgpt-", StringComparison.OrdinalIgnoreCase);
                                bool excluded = id.Contains("audio", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("realtime", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("transcribe", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("tts", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("whisper", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("embedding", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("dall-e", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("moderation", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("search", StringComparison.OrdinalIgnoreCase) ||
                                                id.Contains("instruct", StringComparison.OrdinalIgnoreCase);
                                if (allowedPrefix && !excluded) found.Add(id);
                            }
                            if (found.Count > 0)
                            {
                                var sorted = found.Distinct(StringComparer.OrdinalIgnoreCase)
                                                  .OrderByDescending(id => id, StringComparer.OrdinalIgnoreCase)
                                                  .ToList();
                                _cachedLiveModels[targetProv] = (sorted, DateTime.UtcNow);
                                return (sorted, true, $"Tìm thấy {sorted.Count} mô hình OpenAI GPT.");
                            }
                        }
                    }
                }
                else if (string.Equals(targetProv, "Anthropic Claude", StringComparison.OrdinalIgnoreCase))
                {
                    using var reqMsg = new HttpRequestMessage(HttpMethod.Get, "https://api.anthropic.com/v1/models");
                    reqMsg.Headers.Add("x-api-key", apiKey);
                    reqMsg.Headers.Add("anthropic-version", "2023-06-01");
                    using var response = await SharedHttp.SendAsync(reqMsg, timeoutCts.Token).ConfigureAwait(false);
                    if (response.IsSuccessStatusCode)
                    {
                        string body = await response.Content.ReadAsStringAsync(timeoutCts.Token).ConfigureAwait(false);
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("data", out var dataArr) && dataArr.ValueKind == JsonValueKind.Array)
                        {
                            var found = new List<string>();
                            foreach (var m in dataArr.EnumerateArray())
                            {
                                string id = m.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String ? (idEl.GetString() ?? string.Empty).Trim() : string.Empty;
                                if (!string.IsNullOrEmpty(id)) found.Add(id);
                            }
                            if (found.Count > 0)
                            {
                                var dedup = found.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                                _cachedLiveModels[targetProv] = (dedup, DateTime.UtcNow);
                                return (dedup, true, $"Tìm thấy {dedup.Count} mô hình Anthropic Claude.");
                            }
                        }
                    }
                }
                else if (string.Equals(targetProv, "DeepSeek", StringComparison.OrdinalIgnoreCase))
                {
                    using var reqMsg = new HttpRequestMessage(HttpMethod.Get, "https://api.deepseek.com/v1/models");
                    reqMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                    using var response = await SharedHttp.SendAsync(reqMsg, timeoutCts.Token).ConfigureAwait(false);
                    if (response.IsSuccessStatusCode)
                    {
                        string body = await response.Content.ReadAsStringAsync(timeoutCts.Token).ConfigureAwait(false);
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("data", out var dataArr) && dataArr.ValueKind == JsonValueKind.Array)
                        {
                            var found = new List<string>();
                            foreach (var m in dataArr.EnumerateArray())
                            {
                                string id = m.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String ? (idEl.GetString() ?? string.Empty).Trim() : string.Empty;
                                if (!string.IsNullOrEmpty(id)) found.Add(id);
                            }
                            if (found.Count > 0)
                            {
                                var dedup = found.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                                _cachedLiveModels[targetProv] = (dedup, DateTime.UtcNow);
                                return (dedup, true, $"Tìm thấy {dedup.Count} mô hình DeepSeek.");
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[MatrixExamSyncService] RefreshModels({targetProv}) notice: {ex.Message}");
            }

            return (defaults, false, $"Không tải được danh sách trực tiếp từ {targetProv} — đang dùng {defaults.Count} mô hình mặc định.");
        }

        private static string ResolveFirstProviderKey(InternalAiConfig cfg, string provider, string? overrideRawKeys)
        {
            string raw = string.Empty;
            if (!string.IsNullOrWhiteSpace(overrideRawKeys) && !overrideRawKeys.Contains("••••", StringComparison.Ordinal))
            {
                raw = overrideRawKeys;
            }
            else if (cfg.KeysByProvider.TryGetValue(provider, out var stored) && !string.IsNullOrWhiteSpace(stored))
            {
                raw = stored;
            }
            else
            {
                raw = provider switch
                {
                    "Google Gemini" => Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY") ?? string.Empty,
                    "9Router" => Environment.GetEnvironmentVariable("NINEROUTER_API_KEY") ?? Environment.GetEnvironmentVariable("NINEROUTER_KEY") ?? TryRead9RouterLocalKey(),
                    "OpenAI GPT" => Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? string.Empty,
                    "Anthropic Claude" => Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY") ?? string.Empty,
                    "DeepSeek" => Environment.GetEnvironmentVariable("DEEPSEEK_API_KEY") ?? string.Empty,
                    _ => string.Empty
                };
            }
            return SplitKeys(raw).FirstOrDefault() ?? string.Empty;
        }

        private static List<string> Sort9RouterModels(IEnumerable<string> models)
        {
            static int Rank(string id)
            {
                if (id.StartsWith("ag/gemini-3.8", StringComparison.OrdinalIgnoreCase)) return 0;
                if (id.StartsWith("ag/gemini-4", StringComparison.OrdinalIgnoreCase)) return 1;
                if (id.StartsWith("ag/claude", StringComparison.OrdinalIgnoreCase)) return 2;
                if (id.StartsWith("ag/", StringComparison.OrdinalIgnoreCase)) return 3;
                if (id.StartsWith("gemini", StringComparison.OrdinalIgnoreCase)) return 4;
                if (id.Contains("claude", StringComparison.OrdinalIgnoreCase)) return 5;
                if (id.Contains("gpt-", StringComparison.OrdinalIgnoreCase) || id.StartsWith("openai/", StringComparison.OrdinalIgnoreCase)) return 6;
                if (id.Contains("deepseek", StringComparison.OrdinalIgnoreCase)) return 7;
                if (id.Contains("qwen", StringComparison.OrdinalIgnoreCase)) return 8;
                return 9;
            }
            return models
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(Rank)
                .ThenBy(id => id, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static List<string> SortGeminiModels(IEnumerable<string> models)
        {
            static int Rank(string id)
            {
                if (id.StartsWith("gemini-3", StringComparison.OrdinalIgnoreCase)) return 0;
                if (id.StartsWith("gemini-2.5", StringComparison.OrdinalIgnoreCase)) return 1;
                if (id.StartsWith("gemini-2.0", StringComparison.OrdinalIgnoreCase)) return 2;
                if (id.StartsWith("gemini-1.5", StringComparison.OrdinalIgnoreCase)) return 3;
                return 4;
            }
            return models
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(Rank)
                .ThenBy(id => id, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        public async Task<MeaTestConnectionResult> TestConnectionAsync(
            string? overrideProvider = null,
            string? overrideModel = null,
            string? overrideRawKeys = null,
            CancellationToken ct = default)
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            string targetProv = string.IsNullOrWhiteSpace(overrideProvider)
                ? ReadInternalConfig().Provider
                : NormalizeProviderName(overrideProvider);
            timeoutCts.CancelAfter(IsAntigravityProvider(targetProv) ? TimeSpan.FromSeconds(110) : TimeSpan.FromSeconds(30));

            var res = await ExecutePromptAsync(
                prompt: "1+1=? Trả lời ngắn gọn số.",
                systemPrompt: null,
                overrideProvider: overrideProvider,
                overrideModel: overrideModel,
                overrideRawKeys: overrideRawKeys,
                imageBase64: null,
                imageMimeType: "image/png",
                allowFallback: false,
                ct: timeoutCts.Token).ConfigureAwait(false);

            return new MeaTestConnectionResult
            {
                Ok = res.Ok,
                Reply = res.Content.Trim(),
                LatencyMs = res.LatencyMs,
                Provider = res.Provider,
                Model = res.Model,
                Error = res.Error
            };
        }

        public async Task<MeaAiExecutionResult> GenerateMindmapMarkdownAsync(string topic, CancellationToken ct = default)
        {
            const string systemPrompt =
@"Bạn là chuyên gia sư phạm Toán học và đồ họa thông tin giáo dục THPT. Hãy tạo dàn ý sơ đồ tư duy (Mindmap) chuẩn khoa học, súc tích, trực quan và đầy đủ kiến thức trọng tâm cho bài học hoặc chủ đề được yêu cầu.

QUY TẮC CẤU TRÚC BẮT BUỘC:
1. Dòng đầu tiên là Tiêu đề gốc duy nhất, bắt đầu bằng '# ':
   # Tên chủ đề / Tên bài học
2. Các nhánh chính cấp 1 bắt đầu bằng '## ' (thường từ 3 đến 5 nhánh cốt lõi như: Khái niệm & Định nghĩa, Công thức & Tính chất, Các dạng toán trọng tâm, Phương pháp giải & Ví dụ, Lưu ý & Sai lầm thường gặp).
3. Các nhánh con cấp 2 và cấp 3 dùng gạch đầu dòng '- ' và thụt lề bằng 2 dấu cách:
   ## 1. Khái niệm & Định nghĩa
   - Định nghĩa cơ bản: $x \in \mathbb{R}$
     - Điều kiện tồn tại: $f(x) > 0$
4. CÔNG THỨC TOÁN HỌC: BẮT BUỘC kẹp trong dấu $...$ bằng cú pháp LaTeX chuẩn xác (ví dụ: $y = ax^3 + bx^2 + cx + d$, $\lim_{x \to x_0}$, $\int_a^b f(x)\,dx$, $\vec{u} = (x; y; z)$).
5. KHÔNG viết lời chào hay giải thích trước/sau. KHÔNG bọc nội dung trong thẻ ```markdown ... ```. Chỉ trả về trực tiếp nội dung Markdown từ dòng '# '.";

            string userPrompt = $"Hãy lập sơ đồ tư duy toán học cho chủ đề:\n{topic}";
            var res = await ExecutePromptAsync(userPrompt, systemPrompt, ct: ct).ConfigureAwait(false);
            if (res.Ok)
            {
                res.Content = CleanAiMindmapMarkdown(res.Content);
                if (string.IsNullOrWhiteSpace(res.Content))
                {
                    res.Ok = false;
                    res.Error = "AI không trả về dàn ý sơ đồ tư duy hợp lệ.";
                }
            }
            return res;
        }

        public static string CleanAiMindmapMarkdown(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
            string text = raw.Trim();
            if (text.StartsWith("```markdown", StringComparison.OrdinalIgnoreCase))
                text = text.Substring(11).TrimStart();
            else if (text.StartsWith("```md", StringComparison.OrdinalIgnoreCase))
                text = text.Substring(5).TrimStart();
            else if (text.StartsWith("```", StringComparison.OrdinalIgnoreCase))
                text = text.Substring(3).TrimStart();

            if (text.EndsWith("```", StringComparison.Ordinal))
                text = text.Substring(0, text.Length - 3).TrimEnd();

            int firstHash = text.IndexOf("# ", StringComparison.Ordinal);
            if (firstHash > 0) text = text.Substring(firstHash).Trim();
            return text;
        }

        public Task<MeaAiExecutionResult> ExecutePromptAsync(
            string prompt,
            string? systemPrompt = null,
            string? overrideProvider = null,
            string? overrideModel = null,
            string? overrideRawKeys = null,
            string? imageBase64 = null,
            string imageMimeType = "image/png",
            CancellationToken ct = default) =>
            ExecutePromptAsync(prompt, systemPrompt, overrideProvider, overrideModel, overrideRawKeys, imageBase64, imageMimeType, allowFallback: true, ct);

        private async Task<MeaAiExecutionResult> ExecutePromptAsync(
            string prompt,
            string? systemPrompt,
            string? overrideProvider,
            string? overrideModel,
            string? overrideRawKeys,
            string? imageBase64,
            string imageMimeType,
            bool allowFallback,
            CancellationToken ct)
        {
            var sw = Stopwatch.StartNew();
            var cfg = ReadInternalConfig();

            string provider = string.IsNullOrWhiteSpace(overrideProvider)
                ? cfg.Provider
                : NormalizeProviderName(overrideProvider);

            string model = !string.IsNullOrWhiteSpace(overrideModel)
                ? overrideModel.Trim()
                : (string.Equals(provider, cfg.Provider, StringComparison.OrdinalIgnoreCase)
                    ? cfg.Model
                    : (cfg.SavedModelsByProvider.TryGetValue(provider, out var sm) && !string.IsNullOrWhiteSpace(sm)
                        ? sm
                        : GetDefaultModelForProvider(provider)));

            string rawKey;
            if (!string.IsNullOrWhiteSpace(overrideRawKeys) && !overrideRawKeys.Contains("••••", StringComparison.Ordinal))
            {
                rawKey = overrideRawKeys.Trim();
            }
            else
            {
                rawKey = cfg.KeysByProvider.TryGetValue(provider, out var stored) ? stored : string.Empty;
            }

            // Environment variable fallback if no key configured
            if (string.IsNullOrWhiteSpace(rawKey) && !IsAntigravityProvider(provider))
            {
                rawKey = provider switch
                {
                    "Google Gemini" => Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY") ?? string.Empty,
                    "9Router" => Environment.GetEnvironmentVariable("NINEROUTER_API_KEY") ?? Environment.GetEnvironmentVariable("NINEROUTER_KEY") ?? TryRead9RouterLocalKey(),
                    "OpenAI GPT" => Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? string.Empty,
                    "Anthropic Claude" => Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY") ?? string.Empty,
                    "DeepSeek" => Environment.GetEnvironmentVariable("DEEPSEEK_API_KEY") ?? string.Empty,
                    _ => string.Empty
                };
            }

            string cleanBase64 = StripDataUriPrefix(imageBase64);
            string cleanMime = string.IsNullOrWhiteSpace(imageMimeType) ? "image/png" : imageMimeType.Trim();

            // 1. Antigravity CLI (no API key needed)
            if (IsAntigravityProvider(provider))
            {
                return await ExecuteAntigravityAsync(prompt, systemPrompt, model, cleanBase64, cleanMime, sw, ct).ConfigureAwait(false);
            }

            var keys = SplitKeys(rawKey);
            if (!cfg.KeyRotation && keys.Count > 1)
            {
                keys = new List<string> { keys[0] };
            }

            if (keys.Count == 0)
            {
                if (string.Equals(provider, "9Router", StringComparison.OrdinalIgnoreCase))
                {
                    keys.Add("dummy_key_for_local");
                }
                else
                {
                    sw.Stop();
                    return new MeaAiExecutionResult
                    {
                        Ok = false,
                        Provider = provider,
                        Model = model,
                        LatencyMs = sw.ElapsedMilliseconds,
                        Error = $"Chưa cấu hình API Key cho {provider}. Vui lòng mở Cài đặt → 🔑 API Key & MEA để nhập khóa."
                    };
                }
            }

            string lastError = string.Empty;
            bool nineRouterOffline = false;

            foreach (var key in keys)
            {
                ct.ThrowIfCancellationRequested();

                if (string.Equals(provider, "Google Gemini", StringComparison.OrdinalIgnoreCase))
                {
                    var (ok, text, err, shouldRotate) = await CallGeminiOnceAsync(key, model, prompt, systemPrompt, cleanBase64, cleanMime, ct).ConfigureAwait(false);
                    if (ok)
                    {
                        sw.Stop();
                        return new MeaAiExecutionResult { Ok = true, Content = text, Provider = "Google Gemini", Model = model, LatencyMs = sw.ElapsedMilliseconds };
                    }
                    lastError = err;
                    if (shouldRotate) continue;
                    break;
                }
                else if (string.Equals(provider, "Anthropic Claude", StringComparison.OrdinalIgnoreCase))
                {
                    var (ok, text, err, shouldRotate) = await CallClaudeOnceAsync(key, model, prompt, systemPrompt, cleanBase64, cleanMime, ct).ConfigureAwait(false);
                    if (ok)
                    {
                        sw.Stop();
                        return new MeaAiExecutionResult { Ok = true, Content = text, Provider = "Anthropic Claude", Model = model, LatencyMs = sw.ElapsedMilliseconds };
                    }
                    lastError = err;
                    if (shouldRotate) continue;
                    break;
                }
                else
                {
                    string endpoint = provider switch
                    {
                        "DeepSeek" => "https://api.deepseek.com/v1/chat/completions",
                        "OpenAI GPT" => "https://api.openai.com/v1/chat/completions",
                        _ => "http://localhost:20128/v1/chat/completions"
                    };

                    var candidateModels = BuildOpenAiCandidateModels(provider, model);
                    bool rotated = false;

                    foreach (var modelAttempt in candidateModels)
                    {
                        var (ok, text, err, shouldRotate, tryNextModel, isOffline) = await CallOpenAiCompatibleOnceAsync(
                            provider, endpoint, key, modelAttempt, prompt, systemPrompt, cleanBase64, cleanMime, ct).ConfigureAwait(false);

                        if (ok)
                        {
                            sw.Stop();
                            return new MeaAiExecutionResult { Ok = true, Content = text, Provider = provider, Model = modelAttempt, LatencyMs = sw.ElapsedMilliseconds };
                        }

                        lastError = err;
                        if (isOffline && string.Equals(provider, "9Router", StringComparison.OrdinalIgnoreCase))
                        {
                            nineRouterOffline = true;
                            break;
                        }
                        if (shouldRotate)
                        {
                            rotated = true;
                            break;
                        }
                        if (!tryNextModel)
                        {
                            break;
                        }
                    }

                    if (nineRouterOffline) break;
                    if (rotated) continue;
                    break;
                }
            }

            // Fallback cleanly: 9Router -> Google Gemini (and optional Antigravity CLI if no Gemini key)
            if (allowFallback && string.Equals(provider, "9Router", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(overrideProvider))
            {
                if (cfg.KeysByProvider.TryGetValue("Google Gemini", out var geminiKeys) && SplitKeys(geminiKeys).Count > 0)
                {
                    string fallbackModel = cfg.SavedModelsByProvider.TryGetValue("Google Gemini", out var savedGemModel) && !string.IsNullOrWhiteSpace(savedGemModel)
                        ? savedGemModel
                        : "gemini-2.5-flash";
                    var fallbackRes = await ExecutePromptAsync(
                        prompt, systemPrompt, "Google Gemini", fallbackModel, geminiKeys, imageBase64, imageMimeType, allowFallback: false, ct).ConfigureAwait(false);
                    if (fallbackRes.Ok) return fallbackRes;
                    lastError = $"{lastError} | Fallback Gemini: {fallbackRes.Error}";
                }
                else if (FindAntigravityExecutable() != null)
                {
                    var agyRes = await ExecuteAntigravityAsync(prompt, systemPrompt, model, cleanBase64, cleanMime, sw, ct).ConfigureAwait(false);
                    if (agyRes.Ok) return agyRes;
                }
            }

            sw.Stop();
            return new MeaAiExecutionResult
            {
                Ok = false,
                Provider = provider,
                Model = model,
                LatencyMs = sw.ElapsedMilliseconds,
                Error = string.IsNullOrWhiteSpace(lastError) ? $"Không nhận được phản hồi hợp lệ từ {provider}." : lastError
            };
        }

        private static List<string> BuildOpenAiCandidateModels(string provider, string model)
        {
            var list = new List<string>();
            if (string.Equals(provider, "9Router", StringComparison.OrdinalIgnoreCase))
            {
                if (model.StartsWith("ag/", StringComparison.OrdinalIgnoreCase))
                {
                    list.Add(model);
                    list.Add(model.Substring(3));
                    if (model.EndsWith("-high", StringComparison.OrdinalIgnoreCase))
                    {
                        string fast = model[..^5];
                        list.Add(fast);
                        list.Add(fast.Substring(3));
                    }
                }
                else
                {
                    list.Add("ag/" + model);
                    list.Add(model);
                    if (model.EndsWith("-high", StringComparison.OrdinalIgnoreCase))
                    {
                        string fast = model[..^5];
                        list.Add("ag/" + fast);
                        list.Add(fast);
                    }
                }
            }
            else
            {
                list.Add(model);
            }
            return list.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }

        private static async Task<(bool Ok, string Text, string Error, bool ShouldRotate)> CallGeminiOnceAsync(
            string apiKey, string model, string prompt, string? systemPrompt, string imageBase64, string imageMimeType, CancellationToken ct)
        {
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(apiKey)}";
            var parts = new List<object> { new { text = prompt } };
            if (!string.IsNullOrEmpty(imageBase64))
            {
                parts.Add(new
                {
                    inline_data = new
                    {
                        mime_type = imageMimeType,
                        data = imageBase64
                    }
                });
            }

            var payloadDict = new Dictionary<string, object>
            {
                ["contents"] = new[] { new { role = "user", parts = parts.ToArray() } },
                ["generationConfig"] = new { temperature = 0.2, maxOutputTokens = 16384 }
            };
            if (!string.IsNullOrWhiteSpace(systemPrompt))
            {
                payloadDict["systemInstruction"] = new { parts = new[] { new { text = systemPrompt } } };
            }

            try
            {
                using var httpContent = new StringContent(JsonSerializer.Serialize(payloadDict, CompactJsonOptions), Encoding.UTF8, "application/json");
                using var response = await SharedHttp.PostAsync(url, httpContent, ct).ConfigureAwait(false);
                string body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(body);
                    if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0 &&
                        candidates[0].TryGetProperty("content", out var cObj) &&
                        cObj.TryGetProperty("parts", out var pArr) && pArr.GetArrayLength() > 0)
                    {
                        var sb = new StringBuilder();
                        foreach (var p in pArr.EnumerateArray())
                        {
                            if (p.TryGetProperty("thought", out var thEl) && thEl.ValueKind == JsonValueKind.True)
                            {
                                continue;
                            }
                            if (p.TryGetProperty("text", out var tEl) && tEl.ValueKind == JsonValueKind.String)
                            {
                                sb.Append(tEl.GetString());
                            }
                        }
                        if (sb.Length > 0) return (true, sb.ToString(), string.Empty, false);
                    }
                    return (false, string.Empty, "Google Gemini trả về nội dung trống.", false);
                }

                int code = (int)response.StatusCode;
                bool rotate = code == 429 ||
                              body.Contains("RESOURCE_EXHAUSTED", StringComparison.OrdinalIgnoreCase) ||
                              body.Contains("quota", StringComparison.OrdinalIgnoreCase);
                return (false, string.Empty, $"[Gemini HTTP {code}] {Shorten(body, 280)}", rotate);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                return (false, string.Empty, ex.Message, false);
            }
        }

        private static async Task<(bool Ok, string Text, string Error, bool ShouldRotate)> CallClaudeOnceAsync(
            string apiKey, string model, string prompt, string? systemPrompt, string imageBase64, string imageMimeType, CancellationToken ct)
        {
            object userContent;
            if (string.IsNullOrEmpty(imageBase64))
            {
                userContent = prompt;
            }
            else
            {
                userContent = new object[]
                {
                    new
                    {
                        type = "image",
                        source = new { type = "base64", media_type = imageMimeType, data = imageBase64 }
                    },
                    new { type = "text", text = prompt }
                };
            }

            var payloadDict = new Dictionary<string, object>
            {
                ["model"] = model,
                ["max_tokens"] = 8192,
                ["messages"] = new object[] { new { role = "user", content = userContent } }
            };
            if (!string.IsNullOrWhiteSpace(systemPrompt))
            {
                payloadDict["system"] = systemPrompt;
            }

            try
            {
                using var reqMsg = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
                reqMsg.Headers.Add("x-api-key", apiKey);
                reqMsg.Headers.Add("anthropic-version", "2023-06-01");
                reqMsg.Content = new StringContent(JsonSerializer.Serialize(payloadDict, CompactJsonOptions), Encoding.UTF8, "application/json");

                using var response = await SharedHttp.SendAsync(reqMsg, ct).ConfigureAwait(false);
                string body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(body);
                    if (doc.RootElement.TryGetProperty("content", out var cArr) && cArr.GetArrayLength() > 0)
                    {
                        var sb = new StringBuilder();
                        foreach (var block in cArr.EnumerateArray())
                        {
                            if (block.TryGetProperty("text", out var tEl) && tEl.ValueKind == JsonValueKind.String)
                            {
                                sb.Append(tEl.GetString());
                            }
                        }
                        if (sb.Length > 0) return (true, sb.ToString(), string.Empty, false);
                    }
                    return (false, string.Empty, "Anthropic Claude trả về nội dung trống.", false);
                }

                int code = (int)response.StatusCode;
                bool rotate = code == 429 || body.Contains("rate_limit", StringComparison.OrdinalIgnoreCase);
                return (false, string.Empty, $"[Claude HTTP {code}] {Shorten(body, 280)}", rotate);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                return (false, string.Empty, ex.Message, false);
            }
        }

        private static async Task<(bool Ok, string Text, string Error, bool ShouldRotate, bool TryNextModel, bool IsOffline)> CallOpenAiCompatibleOnceAsync(
            string provider, string endpoint, string apiKey, string model, string prompt, string? systemPrompt, string imageBase64, string imageMimeType, CancellationToken ct)
        {
            if (string.Equals(provider, "DeepSeek", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(imageBase64))
            {
                return (false, string.Empty, "DeepSeek API hiện chỉ hỗ trợ văn bản, chưa hỗ trợ đọc ảnh trực tiếp. Hãy chọn Antigravity, Google Gemini, OpenAI GPT, Anthropic Claude hoặc 9Router để dựng hình từ ảnh.", false, false, false);
            }

            object userContent = string.IsNullOrEmpty(imageBase64)
                ? prompt
                : new object[]
                {
                    new { type = "text", text = prompt },
                    new { type = "image_url", image_url = new { url = $"data:{imageMimeType};base64,{imageBase64}" } }
                };

            var messages = new List<object>();
            if (!string.IsNullOrWhiteSpace(systemPrompt))
            {
                messages.Add(new { role = "system", content = systemPrompt });
            }
            messages.Add(new { role = "user", content = userContent });

            bool isOpenAiReasoningOrGpt5 = string.Equals(provider, "OpenAI GPT", StringComparison.OrdinalIgnoreCase) &&
                (model.StartsWith("o1", StringComparison.OrdinalIgnoreCase) ||
                 model.StartsWith("o3", StringComparison.OrdinalIgnoreCase) ||
                 model.StartsWith("o4", StringComparison.OrdinalIgnoreCase) ||
                 model.StartsWith("gpt-5", StringComparison.OrdinalIgnoreCase));

            var reqBody = new Dictionary<string, object>
            {
                ["model"] = model,
                ["stream"] = false,
                ["messages"] = messages.ToArray()
            };
            if (isOpenAiReasoningOrGpt5)
            {
                reqBody["max_completion_tokens"] = 16384;
            }
            else
            {
                reqBody["temperature"] = 0.2;
                reqBody["max_tokens"] = 8192;
            }

            try
            {
                using var reqMsg = new HttpRequestMessage(HttpMethod.Post, endpoint);
                reqMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                reqMsg.Content = new StringContent(JsonSerializer.Serialize(reqBody, CompactJsonOptions), Encoding.UTF8, "application/json");

                using var response = await SharedHttp.SendAsync(reqMsg, ct).ConfigureAwait(false);
                string body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);

                if (response.IsSuccessStatusCode)
                {
                    // Handle SSE chunks if server ignores stream=false
                    if (body.Contains("data:", StringComparison.Ordinal) && !body.TrimStart().StartsWith("{", StringComparison.Ordinal))
                    {
                        var sb = new StringBuilder();
                        foreach (var line in body.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                        {
                            string t = line.Trim();
                            if (!t.StartsWith("data:", StringComparison.Ordinal) || t.Length <= 5) continue;
                            string chunkJson = t.Substring(5).Trim();
                            if (chunkJson == "[DONE]") continue;
                            try
                            {
                                using var cdoc = JsonDocument.Parse(chunkJson);
                                if (cdoc.RootElement.TryGetProperty("choices", out var ch) && ch.GetArrayLength() > 0 &&
                                    ch[0].TryGetProperty("delta", out var delta) &&
                                    delta.TryGetProperty("content", out var cVal) && cVal.ValueKind == JsonValueKind.String)
                                {
                                    sb.Append(cVal.GetString());
                                }
                            }
                            catch { }
                        }
                        if (sb.Length > 0) return (true, sb.ToString(), string.Empty, false, false, false);
                    }

                    try
                    {
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0 &&
                            choices[0].TryGetProperty("message", out var msg) &&
                            msg.TryGetProperty("content", out var cEl) && cEl.ValueKind == JsonValueKind.String)
                        {
                            return (true, cEl.GetString() ?? string.Empty, string.Empty, false, false, false);
                        }
                    }
                    catch (JsonException)
                    {
                        return (false, string.Empty, $"[{provider} phản hồi không hợp lệ] {Shorten(body, 220)}", false, false, false);
                    }
                }

                int code = (int)response.StatusCode;
                bool rotate = code == 429 || body.Contains("quota", StringComparison.OrdinalIgnoreCase) || body.Contains("rate_limit", StringComparison.OrdinalIgnoreCase);
                bool nextModel = code == 404 ||
                                 body.Contains("model_not_found", StringComparison.OrdinalIgnoreCase) ||
                                 body.Contains("No active credentials", StringComparison.OrdinalIgnoreCase);
                return (false, string.Empty, $"[{provider} HTTP {code}] {Shorten(body, 280)}", rotate, nextModel, false);
            }
            catch (HttpRequestException ex)
            {
                return (false, string.Empty, ex.Message, false, false, true);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                return (false, string.Empty, ex.Message, false, false, false);
            }
        }

        private static string TryRead9RouterLocalKey()
        {
            try
            {
                string local9RouterDb = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "9router", "db", "data.sqlite");
                if (!File.Exists(local9RouterDb)) return string.Empty;
                byte[] bytes = File.ReadAllBytes(local9RouterDb);
                string ascii = Encoding.ASCII.GetString(bytes);
                var match = NineRouterKeyRegex.Match(ascii);
                return match.Success ? match.Value : string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        public static string? FindAntigravityExecutable()
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (!string.IsNullOrWhiteSpace(localAppData))
            {
                string installed = Path.Combine(localAppData, "agy", "bin", "agy.exe");
                if (File.Exists(installed)) return installed;
            }

            string pathVar = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
            foreach (string raw in pathVar.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                string dir = raw.Trim().Trim('"');
                try
                {
                    if (!Path.IsPathFullyQualified(dir)) continue;
                    string candidate = Path.Combine(dir, "agy.exe");
                    if (File.Exists(candidate)) return candidate;
                }
                catch { }
            }
            return null;
        }

        private static async Task<MeaAiExecutionResult> ExecuteAntigravityAsync(
            string prompt, string? systemPrompt, string model, string imageBase64, string imageMimeType, Stopwatch sw, CancellationToken ct)
        {
            string? exe = FindAntigravityExecutable();
            if (exe == null)
            {
                sw.Stop();
                return new MeaAiExecutionResult
                {
                    Ok = false,
                    Provider = "Antigravity",
                    Model = model,
                    LatencyMs = sw.ElapsedMilliseconds,
                    Error = "Chưa tìm thấy Antigravity CLI (agy.exe) trên máy (%LocalAppData%\\agy\\bin\\agy.exe hoặc PATH)."
                };
            }

            string normalizedModel = (model ?? string.Empty).Trim();
            if (normalizedModel.StartsWith("ag/", StringComparison.OrdinalIgnoreCase))
                normalizedModel = normalizedModel.Substring(3);
            if (!SafeModelIdRegex.IsMatch(normalizedModel))
                normalizedModel = "gemini-3.8-flash-medium";

            string workDir = Path.Combine(Path.GetTempPath(), "MinNote", "agy", Guid.NewGuid().ToString("N"));
            try
            {
                Directory.CreateDirectory(workDir);
                var sb = new StringBuilder();
                sb.AppendLine("Bạn được ứng dụng MinNote gọi như một mô hình trả lời trực tiếp.")
                  .AppendLine("Chỉ viết kết quả súc tích ngay trong tin nhắn trả lời. Không lập kế hoạch, không tạo hay sửa tệp, không chạy lệnh terminal, không hỏi lại.");
                if (!string.IsNullOrWhiteSpace(systemPrompt))
                {
                    sb.AppendLine().AppendLine("Hướng dẫn hệ thống:").AppendLine(systemPrompt.Trim());
                }
                if (!string.IsNullOrEmpty(imageBase64))
                {
                    string mimeLow = (imageMimeType ?? string.Empty).ToLowerInvariant();
                    string ext = mimeLow.Contains("jpeg") || mimeLow.Contains("jpg") ? ".jpg"
                               : (mimeLow.Contains("webp") ? ".webp"
                               : (mimeLow.Contains("gif") ? ".gif" : ".png"));
                    string imgPath = Path.Combine(workDir, "image_1" + ext);
                    try
                    {
                        File.WriteAllBytes(imgPath, Convert.FromBase64String(imageBase64));
                    }
                    catch (FormatException)
                    {
                        sw.Stop();
                        return new MeaAiExecutionResult
                        {
                            Ok = false,
                            Provider = "Antigravity",
                            Model = normalizedModel,
                            LatencyMs = sw.ElapsedMilliseconds,
                            Error = "Dữ liệu ảnh gửi tới AI không hợp lệ."
                        };
                    }
                    sb.AppendLine().AppendLine("Ảnh đính kèm (BẮT BUỘC gọi công cụ read_file để đọc tệp ảnh này ngay trước khi trả lời):").AppendLine(imgPath);
                }
                sb.AppendLine().AppendLine("Yêu cầu:").Append(prompt);

                string stdinLine = JsonSerializer.Serialize(new
                {
                    @event = "user",
                    message = new { role = "user", content = sb.ToString() }
                }, CompactJsonOptions) + "\n";

                var args = new[]
                {
                    "-p", string.Empty,
                    "--input-format", "stream-json",
                    "--output-format", "stream-json",
                    "--dangerously-skip-permissions",
                    "--disable-slash-commands",
                    "--add-dir", workDir,
                    "--model", normalizedModel,
                    "--print-timeout", "240s"
                };

                var (stdout, stderr, exitCode, timedOut) = await RunAgyProcessAsync(exe, args, stdinLine, workDir, TimeSpan.FromSeconds(255), ct).ConfigureAwait(false);
                sw.Stop();

                if (timedOut)
                {
                    return new MeaAiExecutionResult
                    {
                        Ok = false,
                        Provider = "Antigravity",
                        Model = normalizedModel,
                        LatencyMs = sw.ElapsedMilliseconds,
                        Error = "Antigravity CLI hết thời gian chờ phản hồi (255s). Với ảnh phức tạp, hãy thử model nhanh hơn như gemini-3.8-flash-medium."
                    };
                }

                // Parse stream-json result event and streamed text fallback
                JsonElement? resultEl = null;
                var streamText = new StringBuilder();
                foreach (var line in stdout.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    if (!line.TrimStart().StartsWith("{", StringComparison.Ordinal)) continue;
                    try
                    {
                        using var doc = JsonDocument.Parse(line);
                        if (doc.RootElement.TryGetProperty("event", out var ev))
                        {
                            string evName = ev.GetString() ?? string.Empty;
                            if (string.Equals(evName, "step_update", StringComparison.OrdinalIgnoreCase) &&
                                doc.RootElement.TryGetProperty("step_update", out var suObj) &&
                                suObj.TryGetProperty("step_type", out var stType) &&
                                string.Equals(stType.GetString(), "agent_response", StringComparison.OrdinalIgnoreCase) &&
                                suObj.TryGetProperty("text_delta", out var tdEl) &&
                                tdEl.ValueKind == JsonValueKind.String)
                            {
                                streamText.Append(tdEl.GetString());
                            }
                            else if (string.Equals(evName, "result", StringComparison.OrdinalIgnoreCase) &&
                                     doc.RootElement.TryGetProperty("result", out var resObj) &&
                                     resObj.ValueKind == JsonValueKind.Object)
                            {
                                resultEl = resObj.Clone();
                            }
                        }
                    }
                    catch { }
                }

                if (resultEl is JsonElement res)
                {
                    string status = res.TryGetProperty("status", out var st) ? (st.GetString() ?? "") : "";
                    string responseText = res.TryGetProperty("response", out var rp) ? (rp.GetString() ?? "").Trim() : "";
                    if (string.IsNullOrEmpty(responseText) && streamText.Length > 0)
                    {
                        responseText = streamText.ToString().Trim();
                    }
                    if (string.Equals(status, "SUCCESS", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(responseText))
                    {
                        return new MeaAiExecutionResult
                        {
                            Ok = true,
                            Content = responseText,
                            Provider = "Antigravity",
                            Model = normalizedModel,
                            LatencyMs = sw.ElapsedMilliseconds
                        };
                    }
                    string errText = res.TryGetProperty("error", out var er) ? (er.GetString() ?? "") : "";
                    return new MeaAiExecutionResult
                    {
                        Ok = false,
                        Provider = "Antigravity",
                        Model = normalizedModel,
                        LatencyMs = sw.ElapsedMilliseconds,
                        Error = !string.IsNullOrWhiteSpace(errText) ? errText : (string.IsNullOrWhiteSpace(stderr) ? "Antigravity trả về kết quả rỗng." : Shorten(stderr, 300))
                    };
                }

                if (streamText.Length > 0)
                {
                    return new MeaAiExecutionResult
                    {
                        Ok = true,
                        Content = streamText.ToString().Trim(),
                        Provider = "Antigravity",
                        Model = normalizedModel,
                        LatencyMs = sw.ElapsedMilliseconds
                    };
                }

                return new MeaAiExecutionResult
                {
                    Ok = false,
                    Provider = "Antigravity",
                    Model = normalizedModel,
                    LatencyMs = sw.ElapsedMilliseconds,
                    Error = string.IsNullOrWhiteSpace(stderr) ? $"Antigravity kết thúc với mã {exitCode}." : Shorten(stderr, 300)
                };
            }
            catch (OperationCanceledException)
            {
                sw.Stop();
                return new MeaAiExecutionResult { Ok = false, Provider = "Antigravity", Model = normalizedModel, LatencyMs = sw.ElapsedMilliseconds, Error = "Đã hủy yêu cầu Antigravity." };
            }
            catch (Exception ex) when (ex is Win32Exception or IOException or FormatException)
            {
                sw.Stop();
                return new MeaAiExecutionResult { Ok = false, Provider = "Antigravity", Model = normalizedModel, LatencyMs = sw.ElapsedMilliseconds, Error = $"Lỗi gọi Antigravity CLI: {ex.Message}" };
            }
            finally
            {
                try { if (Directory.Exists(workDir)) Directory.Delete(workDir, recursive: true); } catch { }
            }
        }

        private static async Task<(string StdOut, string StdErr, int ExitCode, bool TimedOut)> RunAgyProcessAsync(
            string executable, IReadOnlyList<string> arguments, string stdin, string workingDirectory, TimeSpan timeout, CancellationToken ct)
        {
            var psi = new ProcessStartInfo(executable)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = workingDirectory,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardInputEncoding = Utf8NoBom,
                StandardOutputEncoding = Utf8NoBom,
                StandardErrorEncoding = Utf8NoBom
            };
            foreach (var arg in arguments) psi.ArgumentList.Add(arg);

            using var proc = new Process { StartInfo = psi };
            proc.Start();

            Task<string> outTask = proc.StandardOutput.ReadToEndAsync(CancellationToken.None);
            Task<string> errTask = proc.StandardError.ReadToEndAsync(CancellationToken.None);

            if (!string.IsNullOrEmpty(stdin))
            {
                await proc.StandardInput.WriteAsync(stdin).ConfigureAwait(false);
                await proc.StandardInput.FlushAsync().ConfigureAwait(false);
            }
            proc.StandardInput.Close();

            using var timeoutCts = new CancellationTokenSource(timeout);
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

            bool timedOut = false;
            try
            {
                await proc.WaitForExitAsync(linked.Token).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                timedOut = !ct.IsCancellationRequested;
                try { proc.Kill(entireProcessTree: true); } catch { }
                if (ct.IsCancellationRequested) throw;
            }

            string stdout = await outTask.ConfigureAwait(false);
            string stderr = await errTask.ConfigureAwait(false);
            int code = proc.HasExited ? proc.ExitCode : -1;
            return (stdout, stderr, code, timedOut);
        }

        #endregion

        #region Question Bank Two-Way SQLite Sync (C# + Python Dual Schema)

        public enum QuestionBankSchema { None, CSharp, Python }

        private sealed class ResolvedQuestionDbSource
        {
            public string Key { get; init; } = string.Empty;
            public string Label { get; init; } = string.Empty;
            public string Path { get; init; } = string.Empty;
            public bool IsPrimary { get; init; }
        }

        public string ResolveDatabasePath()
        {
            var cfg = ReadInternalConfig();
            string pyDbPath = Path.Combine(ExamGeneratorDir, DatabaseFileName);
            string csDbPath = Path.Combine(LocalAppDataMeaDir, DatabaseFileName);

            string customBankDir = cfg.QuestionBankDir;
            if (!string.IsNullOrWhiteSpace(customBankDir) && !SameDirectory(customBankDir, ExamGeneratorDir))
            {
                return Path.Combine(customBankDir.Replace('/', '\\'), DatabaseFileName);
            }

            if (File.Exists(pyDbPath)) return pyDbPath;
            if (File.Exists(csDbPath)) return csDbPath;
            return pyDbPath;
        }

        private List<ResolvedQuestionDbSource> ResolveAllDatabasePaths()
        {
            var list = new List<ResolvedQuestionDbSource>();
            var seenDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            void TryAdd(string path, bool isPrimary)
            {
                if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return;
                string dir = Path.GetDirectoryName(path) ?? string.Empty;
                string normDir;
                try { normDir = Path.GetFullPath(dir).TrimEnd('\\', '/'); }
                catch { normDir = dir.TrimEnd('\\', '/'); }
                if (string.IsNullOrEmpty(normDir) || !seenDirs.Add(normDir)) return;

                string key;
                string label;
                if (SameDirectory(normDir, LocalAppDataMeaDir))
                {
                    key = "local_appdata";
                    label = isPrimary ? "Kho chính (LocalAppData)" : "Kho MatrixExamAI (Local)";
                }
                else if (SameDirectory(normDir, ExamGeneratorDir))
                {
                    key = "legacy_py";
                    label = isPrimary ? "Kho chính (.exam_generator)" : "Kho Legacy (.exam_generator)";
                }
                else
                {
                    string folderName = Path.GetFileName(normDir);
                    key = "primary_custom";
                    label = string.IsNullOrWhiteSpace(folderName)
                        ? "Kho chính"
                        : (isPrimary ? $"Kho chính ({folderName})" : $"Kho {folderName}");
                }

                list.Add(new ResolvedQuestionDbSource
                {
                    Key = key,
                    Label = label,
                    Path = path,
                    IsPrimary = isPrimary
                });
            }

            string primaryPath = ResolveDatabasePath();
            TryAdd(primaryPath, isPrimary: true);

            string localCsPath = Path.Combine(LocalAppDataMeaDir, DatabaseFileName);
            TryAdd(localCsPath, isPrimary: false);

            string pyPath = Path.Combine(ExamGeneratorDir, DatabaseFileName);
            TryAdd(pyPath, isPrimary: false);

            return list;
        }

        private static bool SameDirectory(string a, string b)
        {
            try
            {
                string na = Path.GetFullPath(a).TrimEnd('\\', '/');
                string nb = Path.GetFullPath(b).TrimEnd('\\', '/');
                return string.Equals(na, nb, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
            }
        }

        private static async Task<SqliteConnection> OpenQuestionBankConnectionAsync(string dbPath, bool readOnly = true)
        {
            string mode = readOnly ? "ReadOnly" : "ReadWriteCreate";
            var conn = new SqliteConnection($"Data Source={dbPath};Mode={mode};Pooling=False;");
            await conn.OpenAsync().ConfigureAwait(false);
            using var pragma = conn.CreateCommand();
            pragma.CommandText = readOnly
                ? "PRAGMA busy_timeout=5000;"
                : "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;";
            try { await pragma.ExecuteNonQueryAsync().ConfigureAwait(false); } catch { }
            return conn;
        }

        private static async Task<(QuestionBankSchema Schema, HashSet<string> Columns)> DetectQuestionSchemaAsync(SqliteConnection conn)
        {
            using (var check = conn.CreateCommand())
            {
                check.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='questions';";
                long cnt = Convert.ToInt64(await check.ExecuteScalarAsync().ConfigureAwait(false));
                if (cnt == 0) return (QuestionBankSchema.None, new HashSet<string>(StringComparer.OrdinalIgnoreCase));
            }

            var cols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var info = conn.CreateCommand())
            {
                info.CommandText = "PRAGMA table_info(questions);";
                using var reader = await info.ExecuteReaderAsync().ConfigureAwait(false);
                while (await reader.ReadAsync().ConfigureAwait(false))
                {
                    cols.Add(reader.GetString(1));
                }
            }

            if (cols.Contains("cognitive_level") && cols.Contains("content"))
                return (QuestionBankSchema.CSharp, cols);
            if (cols.Contains("level") && cols.Contains("question"))
                return (QuestionBankSchema.Python, cols);
            return (QuestionBankSchema.None, cols);
        }

        public static string MapPythonLevelToVietnamese(string? level)
        {
            if (string.IsNullOrWhiteSpace(level)) return "Thông hiểu";
            return level.Trim().ToUpperInvariant() switch
            {
                "NB" or "NHẬN BIẾT" => "Nhận biết",
                "TH" or "THÔNG HIỂU" => "Thông hiểu",
                "VD" or "VẬN DỤNG" => "Vận dụng",
                "VDC" or "VẬN DỤNG CAO" => "Vận dụng cao",
                _ => level.Trim()
            };
        }

        public static string MapVietnameseLevelToPython(string? level)
        {
            if (string.IsNullOrWhiteSpace(level)) return "TH";
            string t = level.Trim();
            if (t.Equals("Nhận biết", StringComparison.OrdinalIgnoreCase) || t.Equals("NB", StringComparison.OrdinalIgnoreCase)) return "NB";
            if (t.Equals("Thông hiểu", StringComparison.OrdinalIgnoreCase) || t.Equals("TH", StringComparison.OrdinalIgnoreCase)) return "TH";
            if (t.Equals("Vận dụng", StringComparison.OrdinalIgnoreCase) || t.Equals("VD", StringComparison.OrdinalIgnoreCase)) return "VD";
            if (t.Equals("Vận dụng cao", StringComparison.OrdinalIgnoreCase) || t.Equals("VDC", StringComparison.OrdinalIgnoreCase)) return "VDC";
            return "TH";
        }

        public static string MapPythonQtypeToCSharp(string? qtype)
        {
            if (string.IsNullOrWhiteSpace(qtype)) return "MultipleChoice4";
            return qtype.Trim().ToUpperInvariant() switch
            {
                "TN" => "MultipleChoice4",
                "DS" => "TrueFalse4",
                "TLN" => "ShortAnswer",
                "TL" => "Essay",
                _ => qtype.Trim()
            };
        }

        public static string MapCSharpQtypeToPython(string? qtype)
        {
            if (string.IsNullOrWhiteSpace(qtype)) return "TN";
            string u = qtype.Trim().ToUpperInvariant();
            if (u.Contains("MULTIPLECHOICE") || u == "TN") return "TN";
            if (u.Contains("TRUEFALSE") || u == "DS") return "DS";
            if (u.Contains("SHORT") || u == "TLN") return "TLN";
            if (u.Contains("ESSAY") || u == "TL") return "TL";
            return "TN";
        }

        public Task<MeaQuestionListResult> ListQuestionsAsync(
            string? keyword = null,
            int? grade = null,
            string? topic = null,
            string? level = null,
            string? qtype = null,
            int limit = 100,
            int offset = 0,
            bool resolveImages = true,
            string? sourceDb = null)
        {
            return ListQuestionsInternalAsync(keyword, grade, topic, level, qtype, limit, offset, resolveImages, sourceDb);
        }

        private static long ParseQuestionTimestampTicks(MeaQuestionDto q)
        {
            if (!string.IsNullOrWhiteSpace(q.UpdatedAt) &&
                DateTimeOffset.TryParse(q.UpdatedAt, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal | DateTimeStyles.AllowWhiteSpaces, out var upd))
            {
                return upd.UtcTicks;
            }
            if (!string.IsNullOrWhiteSpace(q.CreatedAt) &&
                DateTimeOffset.TryParse(q.CreatedAt, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal | DateTimeStyles.AllowWhiteSpaces, out var cr))
            {
                return cr.UtcTicks;
            }
            return 0;
        }

        private static string ComputeQuestionDedupKey(MeaQuestionDto q)
        {
            string normContent = Regex.Replace((q.Content ?? string.Empty).Trim(), @"\s+", " ").ToLowerInvariant();
            if (!string.IsNullOrEmpty(normContent))
            {
                return normContent;
            }
            return $"code:{(q.Code ?? string.Empty).Trim().ToLowerInvariant()}|id:{q.Id}";
        }

        private static void MergeMissingFields(MeaQuestionDto winner, MeaQuestionDto loser)
        {
            if (string.IsNullOrWhiteSpace(winner.TikzCode) && !string.IsNullOrWhiteSpace(loser.TikzCode))
                winner.TikzCode = loser.TikzCode;
            if (string.IsNullOrWhiteSpace(winner.Explanation) && !string.IsNullOrWhiteSpace(loser.Explanation))
                winner.Explanation = loser.Explanation;
            if (string.IsNullOrWhiteSpace(winner.CorrectAnswer) && !string.IsNullOrWhiteSpace(loser.CorrectAnswer))
                winner.CorrectAnswer = loser.CorrectAnswer;
            if (string.IsNullOrWhiteSpace(winner.ChapterName) && !string.IsNullOrWhiteSpace(loser.ChapterName))
                winner.ChapterName = loser.ChapterName;
            if (string.IsNullOrWhiteSpace(winner.LessonName) && !string.IsNullOrWhiteSpace(loser.LessonName))
                winner.LessonName = loser.LessonName;
            if (string.IsNullOrWhiteSpace(winner.Topic) && !string.IsNullOrWhiteSpace(loser.Topic))
                winner.Topic = loser.Topic;
            if ((winner.Options == null || winner.Options.Count == 0) && loser.Options != null && loser.Options.Count > 0)
                winner.Options = new Dictionary<string, string>(loser.Options);
            if ((winner.Images == null || winner.Images.Count == 0) && loser.Images != null && loser.Images.Count > 0)
                winner.Images = new List<string>(loser.Images);
        }

        private sealed class LoadedQuestionBanksData
        {
            public string PrimaryPath { get; init; } = string.Empty;
            public string PrimarySchema { get; init; } = "None";
            public List<string> DbPaths { get; init; } = new();
            public List<MeaQuestionSourceInfo> Sources { get; init; } = new();
            public List<MeaQuestionDto> MergedQuestions { get; init; } = new();
            public Dictionary<string, List<MeaQuestionDto>> RawBySource { get; init; } = new(StringComparer.OrdinalIgnoreCase);
        }

        private async Task<LoadedQuestionBanksData> LoadMergedQuestionBanksAsync()
        {
            string defaultPrimary = ResolveDatabasePath();
            var dbSources = ResolveAllDatabasePaths();
            var sourceInfos = new List<MeaQuestionSourceInfo>();
            var dbPaths = new List<string>();
            var rawBySource = new Dictionary<string, List<MeaQuestionDto>>(StringComparer.OrdinalIgnoreCase);
            var dedupMap = new Dictionary<string, (MeaQuestionDto Item, long Ts, bool IsPrimary)>(StringComparer.Ordinal);
            var mergedOrder = new List<string>();
            string primarySchema = "None";
            string primaryPath = dbSources.FirstOrDefault()?.Path ?? defaultPrimary;

            foreach (var src in dbSources)
            {
                var rawList = new List<MeaQuestionDto>();
                string schemaStr = "None";
                try
                {
                    using var conn = await OpenQuestionBankConnectionAsync(src.Path, readOnly: true).ConfigureAwait(false);
                    var (schema, cols) = await DetectQuestionSchemaAsync(conn).ConfigureAwait(false);
                    schemaStr = schema.ToString();
                    if (src.IsPrimary || (primarySchema == "None" && schema != QuestionBankSchema.None))
                    {
                        primarySchema = schemaStr;
                    }

                    if (schema != QuestionBankSchema.None)
                    {
                        string sql = schema == QuestionBankSchema.CSharp
                            ? BuildCSharpSelectSql(cols)
                            : BuildPythonSelectSql(cols);

                        using var cmd = conn.CreateCommand();
                        cmd.CommandText = sql;
                        using var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false);
                        while (await reader.ReadAsync().ConfigureAwait(false))
                        {
                            var item = schema == QuestionBankSchema.CSharp
                                ? ReadCSharpQuestionRow(reader)
                                : ReadPythonQuestionRow(reader);
                            item.SourceDb = src.Key;
                            item.SourceLabel = src.Label;
                            rawList.Add(item);

                            string key = ComputeQuestionDedupKey(item);
                            long ts = ParseQuestionTimestampTicks(item);
                            if (dedupMap.TryGetValue(key, out var existing))
                            {
                                bool replace = ts > existing.Ts || (ts == existing.Ts && src.IsPrimary && !existing.IsPrimary);
                                if (replace)
                                {
                                    MergeMissingFields(item, existing.Item);
                                    dedupMap[key] = (item, ts, src.IsPrimary);
                                }
                                else
                                {
                                    MergeMissingFields(existing.Item, item);
                                }
                            }
                            else
                            {
                                dedupMap[key] = (item, ts, src.IsPrimary);
                                mergedOrder.Add(key);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[MatrixExamSyncService] Failed loading DB '{src.Path}': {ex.Message}");
                }

                if (rawList.Count == 0 && !src.IsPrimary)
                {
                    continue;
                }

                dbPaths.Add(src.Path);
                rawBySource[src.Key] = rawList;
                sourceInfos.Add(new MeaQuestionSourceInfo
                {
                    Key = src.Key,
                    Label = src.Label,
                    Path = src.Path,
                    Schema = schemaStr,
                    Count = rawList.Count,
                    IsPrimary = src.IsPrimary
                });
            }

            var merged = mergedOrder
                .Select(k => dedupMap[k])
                .OrderByDescending(entry => entry.Ts)
                .ThenByDescending(entry => entry.IsPrimary)
                .ThenByDescending(entry => entry.Item.Id)
                .Select(entry => entry.Item)
                .ToList();

            return new LoadedQuestionBanksData
            {
                PrimaryPath = primaryPath,
                PrimarySchema = primarySchema,
                DbPaths = dbPaths,
                Sources = sourceInfos,
                MergedQuestions = merged,
                RawBySource = rawBySource
            };
        }

        private static int LevelRank(string level)
        {
            return MapPythonLevelToVietnamese(level) switch
            {
                "Nhận biết" => 0,
                "Thông hiểu" => 1,
                "Vận dụng" => 2,
                "Vận dụng cao" => 3,
                _ => 4
            };
        }

        private static int QtypeRank(string qtype)
        {
            return MapPythonQtypeToCSharp(qtype) switch
            {
                "MultipleChoice4" => 0,
                "TrueFalse4" => 1,
                "ShortAnswer" => 2,
                "Essay" => 3,
                _ => 4
            };
        }

        private async Task<MeaQuestionListResult> ListQuestionsInternalAsync(
            string? keyword,
            int? grade,
            string? topic,
            string? level,
            string? qtype,
            int limit,
            int offset,
            bool resolveImages,
            string? sourceDb)
        {
            var loaded = await LoadMergedQuestionBanksAsync().ConfigureAwait(false);
            var result = new MeaQuestionListResult
            {
                DbPath = loaded.PrimaryPath,
                DbPaths = loaded.DbPaths,
                Sources = loaded.Sources,
                Schema = loaded.PrimarySchema,
                Total = loaded.MergedQuestions.Count,
                Limit = limit <= 0 ? 100 : Math.Min(limit, 5000),
                Offset = Math.Max(0, offset)
            };

            List<MeaQuestionDto> sourcePool = loaded.MergedQuestions;
            if (!string.IsNullOrWhiteSpace(sourceDb) &&
                !sourceDb.Equals("all", StringComparison.OrdinalIgnoreCase) &&
                loaded.RawBySource.TryGetValue(sourceDb.Trim(), out var selectedRaw))
            {
                sourcePool = selectedRaw;
            }

            result.Facets = new MeaQuestionFacets
            {
                Grades = sourcePool.Select(q => q.Grade).Where(g => g > 0).Distinct().OrderBy(g => g).ToList(),
                Topics = sourcePool.Select(q => q.Topic).Where(t => !string.IsNullOrWhiteSpace(t)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(t => t, StringComparer.CurrentCultureIgnoreCase).ToList(),
                Levels = sourcePool.Select(q => MapPythonLevelToVietnamese(q.Level)).Where(l => !string.IsNullOrWhiteSpace(l)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(LevelRank).ThenBy(l => l, StringComparer.CurrentCultureIgnoreCase).ToList(),
                Qtypes = sourcePool.Select(q => MapPythonQtypeToCSharp(q.Qtype)).Where(t => !string.IsNullOrWhiteSpace(t)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(QtypeRank).ThenBy(t => t, StringComparer.OrdinalIgnoreCase).ToList()
            };

            IEnumerable<MeaQuestionDto> filtered = sourcePool;

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                string kw = keyword.Trim();
                filtered = filtered.Where(q =>
                    q.Content.Contains(kw, StringComparison.OrdinalIgnoreCase) ||
                    q.Topic.Contains(kw, StringComparison.OrdinalIgnoreCase) ||
                    q.ChapterName.Contains(kw, StringComparison.OrdinalIgnoreCase) ||
                    q.LessonName.Contains(kw, StringComparison.OrdinalIgnoreCase) ||
                    q.Code.Contains(kw, StringComparison.OrdinalIgnoreCase) ||
                    q.Explanation.Contains(kw, StringComparison.OrdinalIgnoreCase) ||
                    q.SourceLabel.Contains(kw, StringComparison.OrdinalIgnoreCase) ||
                    (q.Options != null && q.Options.Values.Any(v => v.Contains(kw, StringComparison.OrdinalIgnoreCase))) ||
                    q.Id.ToString(CultureInfo.InvariantCulture).Contains(kw, StringComparison.OrdinalIgnoreCase));
            }

            if (grade.HasValue && grade.Value > 0)
            {
                filtered = filtered.Where(q => q.Grade == grade.Value);
            }

            if (!string.IsNullOrWhiteSpace(topic) && !topic.Equals("Tất cả", StringComparison.OrdinalIgnoreCase))
            {
                string tp = topic.Trim();
                filtered = filtered.Where(q => q.Topic.Equals(tp, StringComparison.OrdinalIgnoreCase) ||
                                               q.Topic.Contains(tp, StringComparison.OrdinalIgnoreCase) ||
                                               q.ChapterName.Contains(tp, StringComparison.OrdinalIgnoreCase) ||
                                               q.LessonName.Contains(tp, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(level) && !level.Equals("Tất cả", StringComparison.OrdinalIgnoreCase) && !level.Equals("Tất cả mức độ", StringComparison.OrdinalIgnoreCase))
            {
                string normLevel = MapPythonLevelToVietnamese(level);
                filtered = filtered.Where(q => MapPythonLevelToVietnamese(q.Level).Equals(normLevel, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(qtype) && !qtype.Equals("Tất cả", StringComparison.OrdinalIgnoreCase))
            {
                string normType = MapPythonQtypeToCSharp(qtype);
                filtered = filtered.Where(q => MapPythonQtypeToCSharp(q.Qtype).Equals(normType, StringComparison.OrdinalIgnoreCase));
            }

            var filteredList = filtered.ToList();
            result.FilteredTotal = filteredList.Count;

            var page = filteredList.Skip(result.Offset).Take(result.Limit).ToList();
            if (resolveImages && page.Count > 0)
            {
                var dbDirs = loaded.DbPaths
                    .Select(p => Path.GetDirectoryName(p) ?? string.Empty)
                    .Where(d => !string.IsNullOrWhiteSpace(d))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                foreach (var q in page)
                {
                    PopulateQuestionImages(q, dbDirs);
                }
            }

            result.Questions = page;
            return result;
        }

        public async Task<List<MeaQuestionDto>> LoadAllQuestionsForLegacyBankAsync(int maxQuestions = 2000)
        {
            var res = await ListQuestionsAsync(limit: maxQuestions, offset: 0, resolveImages: true).ConfigureAwait(false);
            return res.Questions;
        }

        public async Task<(long Id, string Code, bool Updated, string DbPath, string Schema)> SaveQuestionAsync(MeaQuestionDto q)
        {
            string dbPath = ResolveDatabasePath();
            string? dbDir = Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrEmpty(dbDir)) Directory.CreateDirectory(dbDir);

            MarkSelfWrite("question_bank_changed");

            using var conn = await OpenQuestionBankConnectionAsync(dbPath, readOnly: false).ConfigureAwait(false);
            var (schema, cols) = await DetectQuestionSchemaAsync(conn).ConfigureAwait(false);
            if (schema == QuestionBankSchema.None)
            {
                await CreateCSharpQuestionsTableAsync(conn).ConfigureAwait(false);
                (schema, cols) = await DetectQuestionSchemaAsync(conn).ConfigureAwait(false);
            }

            string code = string.IsNullOrWhiteSpace(q.Code) ? $"MN{DateTime.Now:HHmmss}" : q.Code.Trim();
            string now = DateTime.Now.ToString("o", CultureInfo.InvariantCulture);
            bool isUpdate = q.Id > 0;
            long savedId = q.Id;

            if (schema == QuestionBankSchema.CSharp)
            {
                string imagesJson = JsonSerializer.Serialize(q.Images ?? new List<string>(), CompactJsonOptions);
                string optionsJson = JsonSerializer.Serialize(q.Options ?? new Dictionary<string, string>(), CompactJsonOptions);
                bool hasImagesCol = cols.Contains("images");
                bool hasUpdatedAt = cols.Contains("updated_at");

                if (isUpdate)
                {
                    using var cmd = conn.CreateCommand();
                    var setClauses = new List<string>
                    {
                        "question_code = @code",
                        "subject = @subject",
                        "grade = @grade",
                        "topic = @topic",
                        "cognitive_level = @level",
                        "question_type = @qtype",
                        "content = @content",
                        "options_json = @options",
                        "correct_answer = @answer",
                        "explanation = @explanation",
                        "tikz_code = @tikz",
                        "source = @source"
                    };
                    if (hasImagesCol) setClauses.Add("images = @images");
                    if (hasUpdatedAt) setClauses.Add("updated_at = @updated");
                    cmd.CommandText = $"UPDATE questions SET {string.Join(", ", setClauses)} WHERE id = @id;";
                    cmd.Parameters.AddWithValue("@id", q.Id);
                    BindCSharpParams(cmd, q, code, optionsJson, imagesJson, now, hasImagesCol, hasUpdatedAt);
                    int affected = await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
                    if (affected == 0) isUpdate = false;
                }

                if (!isUpdate)
                {
                    using var cmd = conn.CreateCommand();
                    var colNames = new List<string>
                    {
                        "question_code", "subject", "grade", "topic", "cognitive_level",
                        "question_type", "content", "options_json", "correct_answer",
                        "explanation", "tikz_code", "source", "created_at"
                    };
                    var valNames = new List<string>
                    {
                        "@code", "@subject", "@grade", "@topic", "@level",
                        "@qtype", "@content", "@options", "@answer",
                        "@explanation", "@tikz", "@source", "@created"
                    };
                    if (hasImagesCol) { colNames.Add("images"); valNames.Add("@images"); }
                    if (hasUpdatedAt) { colNames.Add("updated_at"); valNames.Add("@updated"); }
                    cmd.CommandText = $"INSERT INTO questions ({string.Join(", ", colNames)}) VALUES ({string.Join(", ", valNames)}); SELECT last_insert_rowid();";
                    BindCSharpParams(cmd, q, code, optionsJson, imagesJson, now, hasImagesCol, hasUpdatedAt);
                    cmd.Parameters.AddWithValue("@created", now);
                    savedId = Convert.ToInt64(await cmd.ExecuteScalarAsync().ConfigureAwait(false));
                }
            }
            else
            {
                bool hasQuestionId = cols.Contains("question_id");
                string dataJson = BuildPythonDataJson(q);
                string pyLevel = MapVietnameseLevelToPython(q.Level);
                string pyQtype = MapCSharpQtypeToPython(q.Qtype);
                string gradeStr = (q.Grade > 0 ? q.Grade : 12).ToString(CultureInfo.InvariantCulture);

                if (isUpdate)
                {
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = hasQuestionId
                        ? "UPDATE questions SET question_id=@qid, subject=@subject, grade=@grade, topic=@topic, level=@level, qtype=@qtype, question=@question, data_json=@data, source=@source WHERE id=@id;"
                        : "UPDATE questions SET subject=@subject, grade=@grade, topic=@topic, level=@level, qtype=@qtype, question=@question, data_json=@data, source=@source WHERE id=@id;";
                    cmd.Parameters.AddWithValue("@id", q.Id);
                    if (hasQuestionId) cmd.Parameters.AddWithValue("@qid", code);
                    cmd.Parameters.AddWithValue("@subject", string.IsNullOrWhiteSpace(q.Subject) ? "Toán" : q.Subject);
                    cmd.Parameters.AddWithValue("@grade", gradeStr);
                    cmd.Parameters.AddWithValue("@topic", q.Topic ?? string.Empty);
                    cmd.Parameters.AddWithValue("@level", pyLevel);
                    cmd.Parameters.AddWithValue("@qtype", pyQtype);
                    cmd.Parameters.AddWithValue("@question", q.Content ?? string.Empty);
                    cmd.Parameters.AddWithValue("@data", dataJson);
                    cmd.Parameters.AddWithValue("@source", string.IsNullOrWhiteSpace(q.Source) ? "MinNote" : q.Source);
                    int affected = await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
                    if (affected == 0) isUpdate = false;
                }

                if (!isUpdate)
                {
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = hasQuestionId
                        ? "INSERT INTO questions (question_id, subject, grade, topic, level, qtype, question, data_json, created_at, source) VALUES (@qid, @subject, @grade, @topic, @level, @qtype, @question, @data, @created, @source); SELECT last_insert_rowid();"
                        : "INSERT INTO questions (subject, grade, topic, level, qtype, question, data_json, created_at, source) VALUES (@subject, @grade, @topic, @level, @qtype, @question, @data, @created, @source); SELECT last_insert_rowid();";
                    if (hasQuestionId) cmd.Parameters.AddWithValue("@qid", code);
                    cmd.Parameters.AddWithValue("@subject", string.IsNullOrWhiteSpace(q.Subject) ? "Toán" : q.Subject);
                    cmd.Parameters.AddWithValue("@grade", gradeStr);
                    cmd.Parameters.AddWithValue("@topic", q.Topic ?? string.Empty);
                    cmd.Parameters.AddWithValue("@level", pyLevel);
                    cmd.Parameters.AddWithValue("@qtype", pyQtype);
                    cmd.Parameters.AddWithValue("@question", q.Content ?? string.Empty);
                    cmd.Parameters.AddWithValue("@data", dataJson);
                    cmd.Parameters.AddWithValue("@created", now);
                    cmd.Parameters.AddWithValue("@source", string.IsNullOrWhiteSpace(q.Source) ? "MinNote" : q.Source);
                    savedId = Convert.ToInt64(await cmd.ExecuteScalarAsync().ConfigureAwait(false));
                }
            }

            return (savedId, code, isUpdate, dbPath, schema.ToString());
        }

        private static void BindCSharpParams(SqliteCommand cmd, MeaQuestionDto q, string code, string optionsJson, string imagesJson, string now, bool hasImagesCol, bool hasUpdatedAt)
        {
            cmd.Parameters.AddWithValue("@code", code);
            cmd.Parameters.AddWithValue("@subject", string.IsNullOrWhiteSpace(q.Subject) ? "Toán" : q.Subject);
            cmd.Parameters.AddWithValue("@grade", q.Grade > 0 ? q.Grade : 12);
            cmd.Parameters.AddWithValue("@topic", q.Topic ?? string.Empty);
            cmd.Parameters.AddWithValue("@level", MapPythonLevelToVietnamese(q.Level));
            cmd.Parameters.AddWithValue("@qtype", MapPythonQtypeToCSharp(q.Qtype));
            cmd.Parameters.AddWithValue("@content", q.Content ?? string.Empty);
            cmd.Parameters.AddWithValue("@options", optionsJson);
            cmd.Parameters.AddWithValue("@answer", q.CorrectAnswer ?? string.Empty);
            cmd.Parameters.AddWithValue("@explanation", q.Explanation ?? string.Empty);
            cmd.Parameters.AddWithValue("@tikz", q.TikzCode ?? string.Empty);
            cmd.Parameters.AddWithValue("@source", string.IsNullOrWhiteSpace(q.Source) ? "MinNote" : q.Source);
            if (hasImagesCol) cmd.Parameters.AddWithValue("@images", imagesJson);
            if (hasUpdatedAt) cmd.Parameters.AddWithValue("@updated", now);
        }

        private static async Task CreateCSharpQuestionsTableAsync(SqliteConnection conn)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    question_code TEXT,
                    subject TEXT,
                    grade INTEGER,
                    topic TEXT,
                    cognitive_level TEXT,
                    question_type TEXT,
                    content TEXT,
                    options_json TEXT,
                    correct_answer TEXT,
                    explanation TEXT,
                    tikz_code TEXT,
                    images TEXT,
                    source TEXT,
                    raw_data_json TEXT,
                    created_at TEXT,
                    updated_at TEXT
                );";
            await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
        }

        private static string BuildCSharpSelectSql(HashSet<string> cols)
        {
            string Col(string name, string fallback = "''") => cols.Contains(name) ? name : $"{fallback} AS {name}";
            return $"SELECT id, {Col("question_code")}, {Col("subject", "'Toán'")}, {Col("grade", "12")}, {Col("topic")}, " +
                   $"{Col("cognitive_level", "'Thông hiểu'")}, {Col("question_type", "'MultipleChoice4'")}, {Col("content")}, " +
                   $"{Col("options_json")}, {Col("correct_answer")}, {Col("explanation")}, {Col("tikz_code")}, " +
                   $"{Col("images")}, {Col("source")}, {Col("created_at")}, {Col("updated_at")}, " +
                   $"{Col("chapter_name")}, {Col("lesson_name")} FROM questions ORDER BY id DESC;";
        }

        private static string BuildPythonSelectSql(HashSet<string> cols)
        {
            string Col(string name, string fallback = "''") => cols.Contains(name) ? name : $"{fallback} AS {name}";
            return $"SELECT id, {Col("question_id")}, {Col("subject", "'Toán'")}, {Col("grade", "'12'")}, {Col("topic")}, " +
                   $"{Col("level", "'TH'")}, {Col("qtype", "'TN'")}, {Col("question")}, {Col("data_json")}, " +
                   $"{Col("source")}, {Col("created_at")} FROM questions ORDER BY id DESC;";
        }

        private static string ReadStr(SqliteDataReader reader, string col, string fallback = "")
        {
            int ord = reader.GetOrdinal(col);
            if (reader.IsDBNull(ord)) return fallback;
            return Convert.ToString(reader.GetValue(ord), CultureInfo.InvariantCulture) ?? fallback;
        }

        private static MeaQuestionDto ReadCSharpQuestionRow(SqliteDataReader reader)
        {
            long id = reader.GetInt64(reader.GetOrdinal("id"));
            int grade = 12;
            string gradeRaw = ReadStr(reader, "grade", "12");
            if (int.TryParse(Regex.Replace(gradeRaw, @"\D", ""), out int gParsed) && gParsed > 0) grade = gParsed;

            string topic = ReadStr(reader, "topic");
            string chapterName = ReadStr(reader, "chapter_name");
            string lessonName = ReadStr(reader, "lesson_name");
            if (string.IsNullOrWhiteSpace(topic))
            {
                topic = !string.IsNullOrWhiteSpace(lessonName) ? lessonName : chapterName;
            }

            var q = new MeaQuestionDto
            {
                Id = id,
                Code = ReadStr(reader, "question_code"),
                Subject = ReadStr(reader, "subject", "Toán"),
                Grade = grade,
                Topic = topic,
                ChapterName = chapterName,
                LessonName = lessonName,
                Level = MapPythonLevelToVietnamese(ReadStr(reader, "cognitive_level", "Thông hiểu")),
                Qtype = MapPythonQtypeToCSharp(ReadStr(reader, "question_type", "MultipleChoice4")),
                Content = ReadStr(reader, "content"),
                CorrectAnswer = ReadStr(reader, "correct_answer"),
                Explanation = ReadStr(reader, "explanation"),
                TikzCode = ReadStr(reader, "tikz_code"),
                Source = ReadStr(reader, "source"),
                CreatedAt = ReadStr(reader, "created_at"),
                UpdatedAt = ReadStr(reader, "updated_at")
            };
            if (string.IsNullOrWhiteSpace(q.Code)) q.Code = $"Q{id:D4}";

            string optJson = ReadStr(reader, "options_json");
            if (!string.IsNullOrWhiteSpace(optJson))
            {
                try { q.Options = JsonSerializer.Deserialize<Dictionary<string, string>>(optJson) ?? new(); } catch { }
            }

            string imgJson = ReadStr(reader, "images");
            if (!string.IsNullOrWhiteSpace(imgJson))
            {
                try
                {
                    q.Images = JsonSerializer.Deserialize<List<string>>(imgJson) ?? new();
                }
                catch (JsonException)
                {
                    q.Images = new List<string> { imgJson };
                }
            }
            return q;
        }

        private static MeaQuestionDto ReadPythonQuestionRow(SqliteDataReader reader)
        {
            long id = reader.GetInt64(reader.GetOrdinal("id"));
            string gradeStr = ReadStr(reader, "grade", "12");
            int.TryParse(Regex.Replace(gradeStr, @"\D", ""), out int grade);
            if (grade <= 0) grade = 12;

            string qid = ReadStr(reader, "question_id");
            string dataJson = ReadStr(reader, "data_json");

            var q = new MeaQuestionDto
            {
                Id = id,
                Code = !string.IsNullOrWhiteSpace(qid) ? qid : $"Q{id:D4}",
                Subject = ReadStr(reader, "subject", "Toán"),
                Grade = grade,
                Topic = ReadStr(reader, "topic"),
                Level = MapPythonLevelToVietnamese(ReadStr(reader, "level", "TH")),
                Qtype = MapPythonQtypeToCSharp(ReadStr(reader, "qtype", "TN")),
                Content = ReadStr(reader, "question"),
                Source = ReadStr(reader, "source"),
                CreatedAt = ReadStr(reader, "created_at")
            };

            if (!string.IsNullOrWhiteSpace(dataJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(dataJson);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("question", out var qEl) && qEl.ValueKind == JsonValueKind.String)
                    {
                        string full = qEl.GetString() ?? string.Empty;
                        if (full.Length > q.Content.Length) q.Content = full;
                    }

                    if (root.TryGetProperty("options", out var optsEl) && optsEl.ValueKind == JsonValueKind.Object)
                    {
                        var dict = new Dictionary<string, string>();
                        foreach (var prop in optsEl.EnumerateObject())
                        {
                            dict[prop.Name] = prop.Value.ValueKind == JsonValueKind.String ? (prop.Value.GetString() ?? "") : prop.Value.ToString();
                        }
                        if (dict.Count > 0) q.Options = dict;
                    }

                    // True/False (DS) statements in "items" and booleans in "answers"
                    if (q.Qtype == "TrueFalse4" && root.TryGetProperty("items", out var itemsEl) && itemsEl.ValueKind == JsonValueKind.Object)
                    {
                        var stmts = new Dictionary<string, string>();
                        foreach (var prop in itemsEl.EnumerateObject())
                        {
                            stmts[prop.Name.ToLowerInvariant()] = prop.Value.ValueKind == JsonValueKind.String ? (prop.Value.GetString() ?? "") : prop.Value.ToString();
                        }
                        if (stmts.Count > 0) q.Options = stmts;

                        if (root.TryGetProperty("answers", out var ansMap) && ansMap.ValueKind == JsonValueKind.Object)
                        {
                            var marks = new Dictionary<string, bool>();
                            foreach (var prop in ansMap.EnumerateObject())
                            {
                                if (prop.Value.ValueKind is JsonValueKind.True or JsonValueKind.False)
                                {
                                    marks[prop.Name.ToLowerInvariant()] = prop.Value.GetBoolean();
                                }
                            }
                            if (marks.Count > 0 && stmts.Keys.All(marks.ContainsKey))
                            {
                                q.CorrectAnswer = string.Join("-", stmts.Keys.OrderBy(k => k, StringComparer.Ordinal).Select(k => marks[k] ? "Đ" : "S"));
                            }
                        }
                    }

                    if (root.TryGetProperty("question_image", out var qiEl) && qiEl.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(qiEl.GetString()))
                    {
                        q.Images.Add(qiEl.GetString()!.Trim());
                    }

                    AppendPythonOptionImages(root, "option_images", q);
                    AppendPythonOptionImages(root, "item_images", q);

                    if (string.IsNullOrEmpty(q.CorrectAnswer))
                    {
                        if (root.TryGetProperty("answer", out var aEl) && aEl.ValueKind == JsonValueKind.String)
                            q.CorrectAnswer = aEl.GetString() ?? string.Empty;
                        else if (root.TryGetProperty("correct_answer", out var caEl) && caEl.ValueKind == JsonValueKind.String)
                            q.CorrectAnswer = caEl.GetString() ?? string.Empty;
                    }

                    if (root.TryGetProperty("solution", out var solEl) && solEl.ValueKind == JsonValueKind.String)
                    {
                        q.Explanation = solEl.GetString() ?? string.Empty;
                    }

                    if (root.TryGetProperty("tikz_code", out var tzEl) && tzEl.ValueKind == JsonValueKind.String)
                    {
                        q.TikzCode = tzEl.GetString() ?? string.Empty;
                    }
                }
                catch { }
            }

            return q;
        }

        private static void AppendPythonOptionImages(JsonElement root, string propName, MeaQuestionDto q)
        {
            if (!root.TryGetProperty(propName, out var imgs) || imgs.ValueKind != JsonValueKind.Object) return;
            foreach (var prop in imgs.EnumerateObject())
            {
                string? path = prop.Value.ValueKind == JsonValueKind.String ? prop.Value.GetString() : null;
                if (string.IsNullOrWhiteSpace(path)) continue;
                string? matchedKey = q.Options.Keys.FirstOrDefault(k => k.Equals(prop.Name, StringComparison.OrdinalIgnoreCase));
                if (matchedKey != null)
                {
                    q.Options[matchedKey] = $"{q.Options[matchedKey]} [HINH_ANH: {path}]".Trim();
                }
            }
        }

        private static string BuildPythonDataJson(MeaQuestionDto q)
        {
            string pyQtype = MapCSharpQtypeToPython(q.Qtype);
            var options = q.Options ?? new Dictionary<string, string>();
            var answers = new Dictionary<string, bool>();
            if (pyQtype == "DS" && !string.IsNullOrWhiteSpace(q.CorrectAnswer))
            {
                var boolMatches = Regex.Matches(q.CorrectAnswer, @"(?i)[đstf10]");
                var keys = options.Keys.Select(k => k.ToLowerInvariant()).OrderBy(k => k, StringComparer.Ordinal).ToList();
                if (keys.Count == 0) keys = new List<string> { "a", "b", "c", "d" };
                for (int i = 0; i < Math.Min(keys.Count, boolMatches.Count); i++)
                {
                    string ch = boolMatches[i].Value.ToUpperInvariant();
                    answers[keys[i]] = ch is "Đ" or "T" or "1";
                }
            }

            var data = new Dictionary<string, object?>
            {
                ["qtype"] = pyQtype,
                ["level"] = MapVietnameseLevelToPython(q.Level),
                ["topic"] = q.Topic ?? string.Empty,
                ["question"] = q.Content ?? string.Empty,
                ["solution"] = q.Explanation ?? string.Empty,
                ["options"] = pyQtype == "DS" ? new Dictionary<string, string>() : options,
                ["answer"] = q.CorrectAnswer ?? string.Empty,
                ["items"] = pyQtype == "DS" ? options.ToDictionary(kv => kv.Key.ToLowerInvariant(), kv => kv.Value) : new Dictionary<string, string>(),
                ["answers"] = answers,
                ["item_solutions"] = new Dictionary<string, string>(),
                ["points"] = 1.0,
                ["tikz_code"] = q.TikzCode ?? string.Empty,
                ["question_image"] = q.Images?.FirstOrDefault() ?? string.Empty
            };
            return JsonSerializer.Serialize(data, CompactJsonOptions);
        }

        private void PopulateQuestionImages(MeaQuestionDto q, IEnumerable<string> dbDirs)
        {
            var refs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var img in q.Images)
            {
                if (!string.IsNullOrWhiteSpace(img)) refs.Add(img.Trim());
            }

            void CollectFromText(string? txt)
            {
                if (string.IsNullOrEmpty(txt)) return;
                foreach (Match m in InlineImageRegex.Matches(txt))
                {
                    string name = m.Groups[1].Value.Trim();
                    if (!string.IsNullOrEmpty(name)) refs.Add(name);
                }
            }

            CollectFromText(q.Content);
            CollectFromText(q.Explanation);
            foreach (var optVal in q.Options.Values) CollectFromText(optVal);

            if (refs.Count == 0) return;

            var dirList = new List<string>();
            var seenDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            void AddSearchDir(string? dir)
            {
                if (string.IsNullOrWhiteSpace(dir)) return;
                if (seenDirs.Add(dir.TrimEnd('\\', '/'))) dirList.Add(dir);
            }

            AddSearchDir(Path.Combine(LocalAppDataMeaDir, "question_images"));
            AddSearchDir(Path.Combine(ExamGeneratorDir, "question_images"));
            if (dbDirs != null)
            {
                foreach (var dbDir in dbDirs)
                {
                    if (string.IsNullOrWhiteSpace(dbDir)) continue;
                    AddSearchDir(Path.Combine(dbDir, "question_images"));
                    AddSearchDir(dbDir);
                }
            }

            string[] searchDirs = dirList.ToArray();
            foreach (string rawRef in refs)
            {
                string? resolvedPath = ResolveQuestionImageFile(rawRef, searchDirs);
                if (resolvedPath == null) continue;
                string? dataUrl = ReadQuestionImageAsDataUrl(resolvedPath, maxBytes: 4 * 1024 * 1024);
                if (string.IsNullOrEmpty(dataUrl)) continue;

                q.InlineImages[rawRef] = dataUrl;
                q.ResolvedImages.Add(new MeaResolvedImage { Name = rawRef, DataUrl = dataUrl });
            }
        }

        private static string? ResolveQuestionImageFile(string rawRef, string[] searchDirs)
        {
            if (string.IsNullOrWhiteSpace(rawRef)) return null;
            string cleaned = rawRef.Trim().Trim('"', '\'');

            // Absolute path check (only allowed image extensions)
            if (Path.IsPathRooted(cleaned) && IsAllowedImageExt(cleaned) && File.Exists(cleaned))
            {
                return cleaned;
            }

            string safeName = Path.GetFileName(cleaned);
            if (string.IsNullOrWhiteSpace(safeName) || !IsAllowedImageExt(safeName)) return null;

            foreach (var dir in searchDirs)
            {
                if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir)) continue;
                string candidate = Path.Combine(dir, safeName);
                if (File.Exists(candidate)) return candidate;
            }
            return null;
        }

        private static bool IsAllowedImageExt(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            return ext is ".png" or ".jpg" or ".jpeg" or ".gif" or ".webp" or ".svg" or ".bmp" or ".emf";
        }

        private string? ReadQuestionImageAsDataUrl(string filePath, int maxBytes)
        {
            string ext = Path.GetExtension(filePath).ToLowerInvariant();
            if (ext == ".emf")
            {
                string siblingPng = Path.ChangeExtension(filePath, ".png");
                if (File.Exists(siblingPng))
                {
                    return ReadImageAsDataUrl(siblingPng, maxBytes);
                }
                return RenderEmfToPngDataUrl(filePath, maxBytes);
            }
            return ReadImageAsDataUrl(filePath, maxBytes);
        }

        private string? RenderEmfToPngDataUrl(string emfPath, int maxBytes)
        {
            try
            {
                var fi = new FileInfo(emfPath);
                if (!fi.Exists || fi.Length == 0 || fi.Length > maxBytes) return null;

                string cacheKey = $"{emfPath}|{fi.Length}|{fi.LastWriteTimeUtc.Ticks}";
                if (_emfPngCache.TryGetValue(cacheKey, out string? cached))
                {
                    return cached;
                }

                IntPtr hEmf = NativeGdi.GetEnhMetaFile(emfPath);
                if (hEmf == IntPtr.Zero) return null;

                IntPtr hDc = IntPtr.Zero;
                IntPtr hBmp = IntPtr.Zero;
                IntPtr oldBmp = IntPtr.Zero;
                try
                {
                    var hdr = new GdiEnhMetaHeader { CbSize = (uint)Marshal.SizeOf<GdiEnhMetaHeader>() };
                    if (NativeGdi.GetEnhMetaFileHeader(hEmf, hdr.CbSize, out hdr) == 0)
                    {
                        return null;
                    }

                    long frameW = Math.Max(0, hdr.RclFrame.Right - hdr.RclFrame.Left);
                    long frameH = Math.Max(0, hdr.RclFrame.Bottom - hdr.RclFrame.Top);
                    double rawW;
                    double rawH;
                    if (frameW > 0 && frameH > 0)
                    {
                        // rclFrame is in 0.01 mm; render at ~192 DPI for sharp math formulas/lines
                        const double pxPer01Mm = 192.0 / 2540.0;
                        rawW = frameW * pxPer01Mm;
                        rawH = frameH * pxPer01Mm;
                    }
                    else
                    {
                        rawW = Math.Max(1, hdr.RclBounds.Right - hdr.RclBounds.Left) * 2.0;
                        rawH = Math.Max(1, hdr.RclBounds.Bottom - hdr.RclBounds.Top) * 2.0;
                    }

                    if (rawW <= 0 || rawH <= 0) return null;
                    double maxSide = Math.Max(rawW, rawH);
                    double scale = 1.0;
                    if (maxSide > 1080.0) scale = 1080.0 / maxSide;
                    else if (maxSide < 220.0) scale = 220.0 / maxSide;

                    int w = Math.Clamp((int)Math.Round(rawW * scale), 32, 1080);
                    int h = Math.Clamp((int)Math.Round(rawH * scale), 32, 1080);

                    hDc = NativeGdi.CreateCompatibleDC(IntPtr.Zero);
                    if (hDc == IntPtr.Zero) return null;

                    var bmi = new GdiBitmapInfo
                    {
                        Header = new GdiBitmapInfoHeader
                        {
                            BiSize = (uint)Marshal.SizeOf<GdiBitmapInfoHeader>(),
                            BiWidth = w,
                            BiHeight = -h, // top-down DIB
                            BiPlanes = 1,
                            BiBitCount = 32,
                            BiCompression = 0 // BI_RGB
                        }
                    };

                    hBmp = NativeGdi.CreateDIBSection(hDc, ref bmi, 0, out IntPtr pBits, IntPtr.Zero, 0);
                    if (hBmp == IntPtr.Zero || pBits == IntPtr.Zero) return null;

                    oldBmp = NativeGdi.SelectObject(hDc, hBmp);
                    NativeGdi.PatBlt(hDc, 0, 0, w, h, 0x00FF0062); // WHITENESS

                    var rect = new GdiRect { Left = 0, Top = 0, Right = w, Bottom = h };
                    NativeGdi.PlayEnhMetaFile(hDc, hEmf, ref rect);
                    NativeGdi.GdiFlush();

                    int stride = w * 4;
                    byte[] pixels = new byte[stride * h];
                    Marshal.Copy(pBits, pixels, 0, pixels.Length);

                    // Use Bgr32 (opaque RGB) because GDI vector calls leave alpha byte at 0 on 32bpp DIBs
                    var bmpSource = System.Windows.Media.Imaging.BitmapSource.Create(
                        w, h, 96, 96,
                        System.Windows.Media.PixelFormats.Bgr32,
                        null, pixels, stride);
                    bmpSource.Freeze();

                    var encoder = new System.Windows.Media.Imaging.PngBitmapEncoder();
                    encoder.Frames.Add(System.Windows.Media.Imaging.BitmapFrame.Create(bmpSource));
                    using var ms = new MemoryStream();
                    encoder.Save(ms);
                    string dataUrl = $"data:image/png;base64,{Convert.ToBase64String(ms.ToArray())}";

                    if (_emfPngCache.Count >= 400) _emfPngCache.Clear();
                    _emfPngCache[cacheKey] = dataUrl;
                    return dataUrl;
                }
                finally
                {
                    if (hDc != IntPtr.Zero && oldBmp != IntPtr.Zero) NativeGdi.SelectObject(hDc, oldBmp);
                    if (hBmp != IntPtr.Zero) NativeGdi.DeleteObject(hBmp);
                    if (hDc != IntPtr.Zero) NativeGdi.DeleteDC(hDc);
                    NativeGdi.DeleteEnhMetaFile(hEmf);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[MatrixExamSyncService] EMF rasterize error '{emfPath}': {ex.Message}");
                return null;
            }
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GdiRect
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GdiSize
        {
            public int Cx;
            public int Cy;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GdiEnhMetaHeader
        {
            public uint IType;
            public uint CbSize;
            public GdiRect RclBounds;
            public GdiRect RclFrame;
            public uint DSignature;
            public uint NVersion;
            public uint NBytes;
            public uint NRecords;
            public ushort NHandles;
            public ushort SReserved;
            public uint NDescription;
            public uint OffDescription;
            public uint NPalEntries;
            public GdiSize SzlDevice;
            public GdiSize SzlMillimeters;
            public uint CbPixelFormat;
            public uint OffPixelFormat;
            public uint BOpenGL;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GdiBitmapInfoHeader
        {
            public uint BiSize;
            public int BiWidth;
            public int BiHeight;
            public ushort BiPlanes;
            public ushort BiBitCount;
            public uint BiCompression;
            public uint BiSizeImage;
            public int BiXPelsPerMeter;
            public int BiYPelsPerMeter;
            public uint BiClrUsed;
            public uint BiClrImportant;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GdiBitmapInfo
        {
            public GdiBitmapInfoHeader Header;
            public uint Colors;
        }

        private static class NativeGdi
        {
            [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
            public static extern IntPtr GetEnhMetaFile(string lpszMetaFile);

            [DllImport("gdi32.dll")]
            public static extern bool DeleteEnhMetaFile(IntPtr hemf);

            [DllImport("gdi32.dll")]
            public static extern uint GetEnhMetaFileHeader(IntPtr hemf, uint cbBuffer, out GdiEnhMetaHeader lpemh);

            [DllImport("gdi32.dll")]
            public static extern bool PlayEnhMetaFile(IntPtr hdc, IntPtr hemf, ref GdiRect lpRect);

            [DllImport("gdi32.dll")]
            public static extern IntPtr CreateCompatibleDC(IntPtr hdc);

            [DllImport("gdi32.dll")]
            public static extern bool DeleteDC(IntPtr hdc);

            [DllImport("gdi32.dll")]
            public static extern IntPtr CreateDIBSection(IntPtr hdc, ref GdiBitmapInfo pbmi, uint iUsage, out IntPtr ppvBits, IntPtr hSection, uint dwOffset);

            [DllImport("gdi32.dll")]
            public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

            [DllImport("gdi32.dll")]
            public static extern bool DeleteObject(IntPtr hObject);

            [DllImport("gdi32.dll")]
            public static extern bool PatBlt(IntPtr hdc, int x, int y, int w, int h, uint rop);

            [DllImport("gdi32.dll")]
            public static extern bool GdiFlush();
        }

        private static string? ReadImageAsDataUrl(string filePath, int maxBytes)
        {
            try
            {
                var fi = new FileInfo(filePath);
                if (!fi.Exists || fi.Length == 0 || fi.Length > maxBytes) return null;
                byte[] bytes = File.ReadAllBytes(filePath);
                string mime = Path.GetExtension(filePath).ToLowerInvariant() switch
                {
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".gif" => "image/gif",
                    ".webp" => "image/webp",
                    ".svg" => "image/svg+xml",
                    ".bmp" => "image/bmp",
                    _ => "image/png"
                };
                return $"data:{mime};base64,{Convert.ToBase64String(bytes)}";
            }
            catch
            {
                return null;
            }
        }

        #endregion

        #region Figure Bank Parallel Two-Way Sync (100% Compatible with FigureBankService)

        public static string GetFiguresDirectory(bool createIfMissing = false)
        {
            string legacyDir = Path.Combine(ExamGeneratorDir, "figures");
            if (Directory.Exists(legacyDir))
            {
                return legacyDir;
            }

            string defDir = Path.Combine(LocalAppDataMeaDir, "figures");
            if (createIfMissing && !Directory.Exists(defDir))
            {
                Directory.CreateDirectory(defDir);
            }
            return defDir;
        }

        private List<MeaFigureIndexEntry> LoadFigureIndex(bool allowRewriteIndex = true)
        {
            lock (_figureLock)
            {
                string dir = GetFiguresDirectory(createIfMissing: false);
                string indexPath = Path.Combine(dir, "index.json");
                var entries = new List<MeaFigureIndexEntry>();

                if (File.Exists(indexPath))
                {
                    try
                    {
                        string json = File.ReadAllText(indexPath, Encoding.UTF8);
                        entries = JsonSerializer.Deserialize<List<MeaFigureIndexEntry>>(json) ?? new List<MeaFigureIndexEntry>();
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[MatrixExamSyncService] Load figure index.json error: {ex.Message}");
                    }
                }

                // Auto-discover any unindexed figure_*.tex matching FigureBankService.LoadIndex()
                if (Directory.Exists(dir))
                {
                    try
                    {
                        var texFiles = Directory.GetFiles(dir, "figure_*.tex");
                        var indexedTex = new HashSet<string>(entries.Select(e => e.TexFilename), StringComparer.OrdinalIgnoreCase);
                        bool updated = false;

                        foreach (var tf in texFiles)
                        {
                            string fileName = Path.GetFileName(tf);
                            if (indexedTex.Contains(fileName)) continue;

                            string idPart = Path.GetFileNameWithoutExtension(fileName).Replace("figure_", "", StringComparison.OrdinalIgnoreCase);
                            string pngName = Path.ChangeExtension(fileName, ".png");
                            string code = File.ReadAllText(tf, Encoding.UTF8);

                            entries.Add(new MeaFigureIndexEntry
                            {
                                Id = idPart,
                                Title = InferFigureTitle(code, idPart),
                                Description = string.Empty,
                                Tags = InferFigureTags(code),
                                CreatedAt = File.GetCreationTime(tf).ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
                                Source = "manual",
                                TexFilename = fileName,
                                PngFilename = File.Exists(Path.Combine(dir, pngName)) ? pngName : string.Empty,
                                CharCount = code.Length,
                                TikzHash = ComputeTikzHash(code)
                            });
                            indexedTex.Add(fileName);
                            updated = true;
                        }

                        if (updated && allowRewriteIndex)
                        {
                            entries = entries.OrderByDescending(e => int.TryParse(e.Id, out int n) ? n : 0).ToList();
                            SaveFigureIndexLocked(dir, entries);
                        }
                    }
                    catch { }
                }

                return entries;
            }
        }

        private void SaveFigureIndexLocked(string dir, List<MeaFigureIndexEntry> entries)
        {
            MarkSelfWrite("figures_changed");
            string indexPath = Path.Combine(dir, "index.json");
            WriteAllTextAtomic(indexPath, JsonSerializer.Serialize(entries, PrettyJsonOptions));
        }

        private static string InferFigureTitle(string code, string idPart)
        {
            if (code.Contains("\\tkzTabInit", StringComparison.Ordinal)) return $"Bảng biến thiên #{idPart}";
            if (code.Contains("x={(1cm", StringComparison.Ordinal) || code.Contains("z={(0cm", StringComparison.Ordinal) || code.Contains("3D", StringComparison.Ordinal))
                return $"Hình không gian #{idPart}";
            if (code.Contains("begin{axis}", StringComparison.Ordinal)) return $"Đồ thị hàm số #{idPart}";
            return $"Hình vẽ #{idPart}";
        }

        private static List<string> InferFigureTags(string code)
        {
            var tags = new List<string>();
            if (code.Contains("\\tkzTabInit", StringComparison.Ordinal)) tags.Add("BBT");
            if (code.Contains("x={(1cm", StringComparison.Ordinal) || code.Contains("z={(0cm", StringComparison.Ordinal)) tags.Add("3D");
            if (code.Contains("begin{axis}", StringComparison.Ordinal)) tags.Add("Đồ thị");
            if (tags.Count == 0) tags.Add("Hình học");
            return tags;
        }

        public static string ComputeTikzHash(string tikzCode)
        {
            byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes((tikzCode ?? string.Empty).Trim()));
            return Convert.ToHexStringLower(hash)[..16];
        }

        private static string NextFigureId(List<MeaFigureIndexEntry> existing)
        {
            var used = new HashSet<int>();
            foreach (var item in existing)
            {
                if (int.TryParse(item.Id, out int n) && n > 0) used.Add(n);
            }
            int id = 1;
            while (used.Contains(id)) id++;
            return $"{id:D3}";
        }

        public Task<(string FiguresDir, int Total, List<MeaFigureDto> Figures)> ListFiguresAsync(
            string? keyword = null,
            string? source = "all",
            int limit = 120,
            bool includePreview = true)
        {
            return Task.Run(() =>
            {
                string dir = GetFiguresDirectory(createIfMissing: false);
                var entries = LoadFigureIndex(allowRewriteIndex: true);
                int total = entries.Count;

                IEnumerable<MeaFigureIndexEntry> filtered = entries;
                if (!string.IsNullOrWhiteSpace(source) && !source.Equals("all", StringComparison.OrdinalIgnoreCase))
                {
                    filtered = filtered.Where(e => string.Equals(e.Source, source.Trim(), StringComparison.OrdinalIgnoreCase));
                }

                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    string q = keyword.Trim();
                    filtered = filtered.Where(e =>
                        e.Title.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                        e.Description.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                        e.Id.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                        e.Tags.Any(t => t.Contains(q, StringComparison.OrdinalIgnoreCase)));
                }

                int cap = limit <= 0 ? 120 : Math.Min(limit, 500);
                var list = new List<MeaFigureDto>();
                foreach (var entry in filtered.Take(cap))
                {
                    list.Add(BuildFigureDto(dir, entry, includePreview, includeCode: true, includeMnoteJson: false));
                }
                return (dir, total, list);
            });
        }

        public Task<(MeaFigureDto Figure, bool Updated, string FiguresDir)> PushFigureAsync(
            string? figureId,
            string? title,
            string? description,
            List<string>? tags,
            string tikzCode,
            string? pngDataUrl = null,
            string? mnoteJson = null,
            string source = "minnote")
        {
            if (string.IsNullOrWhiteSpace(tikzCode))
                throw new ArgumentException("Mã TikZ không được để trống.", nameof(tikzCode));

            return Task.Run(() =>
            {
                lock (_figureLock)
                {
                    string dir = GetFiguresDirectory(createIfMissing: true);
                    var entries = LoadFigureIndex(allowRewriteIndex: false);

                    MeaFigureIndexEntry? existing = null;
                    string cleanId = SanitizeFigureId(figureId);
                    if (!string.IsNullOrEmpty(cleanId))
                    {
                        existing = entries.FirstOrDefault(e => string.Equals(e.Id, cleanId, StringComparison.OrdinalIgnoreCase));
                    }

                    bool updated = existing != null;
                    string fid = existing != null ? existing.Id : NextFigureId(entries);

                    string texName = $"figure_{fid}.tex";
                    string texPath = Path.Combine(dir, texName);
                    MarkSelfWrite("figures_changed");
                    WriteAllTextAtomic(texPath, tikzCode);

                    string pngName = existing?.PngFilename ?? string.Empty;
                    string cleanPngB64 = StripDataUriPrefix(pngDataUrl);
                    if (!string.IsNullOrWhiteSpace(cleanPngB64))
                    {
                        byte[] pngBytes = Convert.FromBase64String(cleanPngB64);
                        if (pngBytes.Length > 0)
                        {
                            pngName = $"figure_{fid}.png";
                            WriteAllBytesAtomic(Path.Combine(dir, pngName), pngBytes);
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(mnoteJson))
                    {
                        string mnotePath = Path.Combine(dir, $"figure_{fid}.mnote.json");
                        WriteAllTextAtomic(mnotePath, mnoteJson);
                    }

                    string finalTitle = string.IsNullOrWhiteSpace(title)
                        ? (existing?.Title ?? $"Hình MinNote {DateTime.Now:yyyy-MM-dd HH:mm}")
                        : title.Trim();
                    string finalDesc = description != null ? description.Trim() : (existing?.Description ?? string.Empty);
                    var finalTags = tags ?? existing?.Tags ?? new List<string> { "MinNote" };
                    string finalSource = string.IsNullOrWhiteSpace(source) ? "minnote" : source.Trim();

                    if (existing != null)
                    {
                        existing.Title = finalTitle;
                        existing.Description = finalDesc;
                        existing.Tags = finalTags;
                        existing.TexFilename = texName;
                        existing.PngFilename = pngName;
                        existing.CharCount = tikzCode.Length;
                        existing.TikzHash = ComputeTikzHash(tikzCode);
                        if (!string.IsNullOrWhiteSpace(source)) existing.Source = finalSource;
                        SaveFigureIndexLocked(dir, entries);
                        EnsureWatchersStarted();
                        return (BuildFigureDto(dir, existing, includePreview: true, includeCode: true, includeMnoteJson: true), true, dir);
                    }
                    else
                    {
                        var newEntry = new MeaFigureIndexEntry
                        {
                            Id = fid,
                            Title = finalTitle,
                            Description = finalDesc,
                            Tags = finalTags,
                            CreatedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
                            Source = finalSource,
                            TexFilename = texName,
                            PngFilename = pngName,
                            CharCount = tikzCode.Length,
                            TikzHash = ComputeTikzHash(tikzCode)
                        };
                        entries.Insert(0, newEntry);
                        SaveFigureIndexLocked(dir, entries);
                        EnsureWatchersStarted();
                        return (BuildFigureDto(dir, newEntry, includePreview: true, includeCode: true, includeMnoteJson: true), false, dir);
                    }
                }
            });
        }

        public Task<MeaFigureDto?> LoadFigureAsync(string figureId)
        {
            return Task.Run(() =>
            {
                string cleanId = SanitizeFigureId(figureId);
                if (string.IsNullOrEmpty(cleanId)) return null;
                string dir = GetFiguresDirectory(createIfMissing: false);
                var entries = LoadFigureIndex(allowRewriteIndex: false);
                var entry = entries.FirstOrDefault(e => string.Equals(e.Id, cleanId, StringComparison.OrdinalIgnoreCase));
                if (entry == null) return null;
                return BuildFigureDto(dir, entry, includePreview: true, includeCode: true, includeMnoteJson: true);
            });
        }

        public Task<bool> DeleteFigureAsync(string figureId)
        {
            return Task.Run(() =>
            {
                lock (_figureLock)
                {
                    string cleanId = SanitizeFigureId(figureId);
                    if (string.IsNullOrEmpty(cleanId)) return false;

                    string dir = GetFiguresDirectory(createIfMissing: false);
                    var entries = LoadFigureIndex(allowRewriteIndex: false);
                    var target = entries.FirstOrDefault(e => string.Equals(e.Id, cleanId, StringComparison.OrdinalIgnoreCase));
                    if (target == null) return false;

                    MarkSelfWrite("figures_changed");
                    TryDeleteFile(Path.Combine(dir, target.TexFilename));
                    if (!string.IsNullOrWhiteSpace(target.PngFilename))
                        TryDeleteFile(Path.Combine(dir, target.PngFilename));
                    TryDeleteFile(Path.Combine(dir, $"figure_{target.Id}.mnote.json"));

                    entries.Remove(target);
                    SaveFigureIndexLocked(dir, entries);
                    return true;
                }
            });
        }

        private static MeaFigureDto BuildFigureDto(string dir, MeaFigureIndexEntry entry, bool includePreview, bool includeCode, bool includeMnoteJson)
        {
            string texPath = Path.Combine(dir, entry.TexFilename);
            string pngPath = string.IsNullOrWhiteSpace(entry.PngFilename) ? string.Empty : Path.Combine(dir, entry.PngFilename);
            string mnotePath = Path.Combine(dir, $"figure_{entry.Id}.mnote.json");

            bool hasPng = !string.IsNullOrEmpty(pngPath) && File.Exists(pngPath);
            bool hasMnote = File.Exists(mnotePath);

            string? pngDataUrl = includePreview && hasPng ? ReadImageAsDataUrl(pngPath, maxBytes: 4 * 1024 * 1024) : null;
            string? tikzCode = includeCode && File.Exists(texPath) ? SafeReadAllText(texPath) : null;
            string? mnoteJson = includeMnoteJson && hasMnote ? SafeReadAllText(mnotePath) : null;

            return new MeaFigureDto
            {
                Id = entry.Id,
                Title = entry.Title,
                Description = entry.Description,
                Tags = entry.Tags ?? new List<string>(),
                CreatedAt = entry.CreatedAt,
                Source = entry.Source,
                TexFilename = entry.TexFilename,
                PngFilename = entry.PngFilename,
                CharCount = entry.CharCount,
                TikzHash = entry.TikzHash,
                HasPng = hasPng,
                HasMnoteJson = hasMnote,
                PngDataUrl = pngDataUrl,
                TikzCode = tikzCode,
                MnoteJson = mnoteJson
            };
        }

        private static string SanitizeFigureId(string? id)
        {
            if (string.IsNullOrWhiteSpace(id)) return string.Empty;
            var cleaned = new string(id.Trim().Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '-').ToArray());
            return cleaned;
        }

        #endregion

        #region Status & Debounced FileSystemWatcher (450ms)

        public async Task<MeaSyncStatusInfo> GetSyncStatusAsync()
        {
            string dbPath = ResolveDatabasePath();
            string figDir = GetFiguresDirectory(createIfMissing: false);

            var info = new MeaSyncStatusInfo
            {
                ConfigPath = ConfigFilePath,
                ConfigExists = File.Exists(ConfigFilePath),
                PySettingsPath = PySettingsFilePath,
                PySettingsExists = File.Exists(PySettingsFilePath),
                QuestionBankPath = dbPath,
                QuestionBankExists = File.Exists(dbPath),
                FiguresDir = figDir,
                FiguresExists = Directory.Exists(figDir)
            };

            try
            {
                var loaded = await LoadMergedQuestionBanksAsync().ConfigureAwait(false);
                info.QuestionBankPath = loaded.PrimaryPath;
                info.QuestionBankPaths = loaded.DbPaths;
                info.QuestionBankSources = loaded.Sources;
                info.QuestionBankExists = loaded.DbPaths.Count > 0 || File.Exists(dbPath);
                info.QuestionBankSchema = loaded.PrimarySchema;
                info.QuestionCount = loaded.MergedQuestions.Count;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[MatrixExamSyncService] Question count status notice: {ex.Message}");
            }

            if (info.FiguresExists)
            {
                try
                {
                    info.FigureCount = LoadFigureIndex(allowRewriteIndex: false).Count;
                }
                catch { }
            }

            return info;
        }

        private List<string> GetWatchableQuestionBankDirs()
        {
            var dirs = new List<string>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            void AddDir(string? dir)
            {
                if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir)) return;
                string norm;
                try { norm = Path.GetFullPath(dir).TrimEnd('\\', '/'); }
                catch { norm = dir.TrimEnd('\\', '/'); }
                if (seen.Add(norm)) dirs.Add(norm);
            }

            AddDir(Path.GetDirectoryName(ResolveDatabasePath()));
            AddDir(LocalAppDataMeaDir);
            AddDir(ExamGeneratorDir);
            foreach (var src in ResolveAllDatabasePaths())
            {
                AddDir(Path.GetDirectoryName(src.Path));
            }
            return dirs;
        }

        private string ComputeAllQuestionBanksFingerprint()
        {
            var paths = ResolveAllDatabasePaths().Select(s => s.Path).ToList();
            if (paths.Count == 0)
            {
                return ComputeQuestionBankFileFingerprint(ResolveDatabasePath());
            }
            return string.Join(";", paths.Select(p => $"{p}={ComputeQuestionBankFileFingerprint(p)}"));
        }

        private void DisposeAllQbWatchers()
        {
            foreach (var w in _qbWatchers)
            {
                var refW = (FileSystemWatcher?)w;
                DisposeWatcher(ref refW);
            }
            _qbWatchers.Clear();
            _watchedQbDirs.Clear();
        }

        public void EnsureWatchersStarted()
        {
            lock (_watcherLock)
            {
                if (_disposed) return;

                // 1. Watch %LocalAppData%\MatrixExamAI\config.json
                if (_configWatcher == null && Directory.Exists(LocalAppDataMeaDir))
                {
                    try
                    {
                        _configWatcher = new FileSystemWatcher(LocalAppDataMeaDir, "config.json")
                        {
                            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size | NotifyFilters.FileName | NotifyFilters.CreationTime,
                            EnableRaisingEvents = true
                        };
                        _configWatcher.Changed += (_, _) => ScheduleDebouncedEvent("config_changed");
                        _configWatcher.Created += (_, _) => ScheduleDebouncedEvent("config_changed");
                        _configWatcher.Renamed += (_, _) => ScheduleDebouncedEvent("config_changed");
                    }
                    catch { }
                }

                // 2. Watch all active question_bank.db directories (+ -wal only; NEVER -shm/-journal!)
                var targetQbDirs = GetWatchableQuestionBankDirs();
                bool qbDirsChanged = targetQbDirs.Count != _watchedQbDirs.Count ||
                                     targetQbDirs.Any(d => !_watchedQbDirs.Contains(d));
                if (qbDirsChanged)
                {
                    DisposeAllQbWatchers();
                    FileSystemEventHandler onQbChange = (_, args) =>
                    {
                        string name = args.Name ?? string.Empty;
                        if (name.EndsWith("-shm", StringComparison.OrdinalIgnoreCase) ||
                            name.EndsWith("-journal", StringComparison.OrdinalIgnoreCase) ||
                            name.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase))
                        {
                            return;
                        }
                        if (name.Equals(DatabaseFileName, StringComparison.OrdinalIgnoreCase) ||
                            name.Equals(DatabaseFileName + "-wal", StringComparison.OrdinalIgnoreCase))
                        {
                            ScheduleDebouncedEvent("question_bank_changed");
                        }
                    };

                    foreach (var qbDir in targetQbDirs)
                    {
                        try
                        {
                            var watcher = new FileSystemWatcher(qbDir, "question_bank.db*")
                            {
                                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size | NotifyFilters.FileName | NotifyFilters.CreationTime,
                                EnableRaisingEvents = true
                            };
                            watcher.Changed += onQbChange;
                            watcher.Created += onQbChange;
                            _qbWatchers.Add(watcher);
                            _watchedQbDirs.Add(qbDir);
                        }
                        catch { }
                    }
                    _lastQbFingerprint = ComputeAllQuestionBanksFingerprint();
                }

                // 3. Watch active figures directory
                string figDir = GetFiguresDirectory(createIfMissing: false);
                if (!string.IsNullOrEmpty(figDir) && Directory.Exists(figDir) && !SameDirectory(figDir, _watchedFiguresDir))
                {
                    DisposeWatcher(ref _figuresWatcher);
                    try
                    {
                        _figuresWatcher = new FileSystemWatcher(figDir)
                        {
                            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size | NotifyFilters.FileName | NotifyFilters.CreationTime,
                            EnableRaisingEvents = true
                        };
                        FileSystemEventHandler onFigChange = (_, args) =>
                        {
                            string name = args.Name ?? string.Empty;
                            if (name.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase)) return;
                            if (name.Equals("index.json", StringComparison.OrdinalIgnoreCase) ||
                                name.StartsWith("figure_", StringComparison.OrdinalIgnoreCase))
                            {
                                ScheduleDebouncedEvent("figures_changed");
                            }
                        };
                        _figuresWatcher.Changed += onFigChange;
                        _figuresWatcher.Created += onFigChange;
                        _figuresWatcher.Deleted += onFigChange;
                        _figuresWatcher.Renamed += (_, args) =>
                        {
                            string name = args.Name ?? string.Empty;
                            if (name.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase)) return;
                            ScheduleDebouncedEvent("figures_changed");
                        };
                        _watchedFiguresDir = figDir;
                    }
                    catch { }
                }
            }
        }

        private void MarkSelfWrite(string eventType)
        {
            _lastSelfWriteTicks[eventType] = Environment.TickCount64;
        }

        private bool IsRecentSelfWrite(string eventType)
        {
            return _lastSelfWriteTicks.TryGetValue(eventType, out long ticks) &&
                   (Environment.TickCount64 - ticks) < SelfWriteSuppressMs;
        }

        private static string ComputeQuestionBankFileFingerprint(string dbPath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dbPath) || !File.Exists(dbPath)) return "missing";
                var fi = new FileInfo(dbPath);
                string walPath = dbPath + "-wal";
                long walLen = 0;
                long walTicks = 0;
                if (File.Exists(walPath))
                {
                    var wfi = new FileInfo(walPath);
                    walLen = wfi.Length;
                    walTicks = wfi.LastWriteTimeUtc.Ticks;
                }
                return $"{fi.Length}|{fi.LastWriteTimeUtc.Ticks}|{walLen}|{walTicks}";
            }
            catch
            {
                return string.Empty;
            }
        }

        private static string ComputeFileFingerprint(string filePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath)) return "missing";
                var fi = new FileInfo(filePath);
                return $"{fi.Length}|{fi.LastWriteTimeUtc.Ticks}";
            }
            catch
            {
                return string.Empty;
            }
        }

        private void ScheduleDebouncedEvent(string eventType)
        {
            if (_disposed || IsRecentSelfWrite(eventType)) return;
            if ((Environment.TickCount64 - _serviceStartTicks) < StartupWatcherWarmupMs) return;

            _debounceTimers.AddOrUpdate(
                eventType,
                key => new Timer(_ => _ = EmitDebouncedSyncEventAsync(key), null, WatcherDebounceMs, Timeout.Infinite),
                (_, existing) =>
                {
                    try { existing.Change(WatcherDebounceMs, Timeout.Infinite); } catch { }
                    return existing;
                });
        }

        private async Task EmitDebouncedSyncEventAsync(string eventType)
        {
            if (_disposed) return;
            try
            {
                if (eventType == "config_changed")
                {
                    string cfgFp = ComputeFileFingerprint(ConfigFilePath);
                    if (!string.IsNullOrEmpty(cfgFp) && cfgFp == _lastCfgFingerprint) return;
                    _lastCfgFingerprint = cfgFp;
                    EnsureWatchersStarted();
                }
                else if (eventType == "question_bank_changed")
                {
                    string qbFp = ComputeAllQuestionBanksFingerprint();
                    if (!string.IsNullOrEmpty(qbFp) && qbFp == _lastQbFingerprint) return;
                    _lastQbFingerprint = qbFp;
                    EnsureWatchersStarted();
                }
                else if (eventType == "figures_changed")
                {
                    string figDir = GetFiguresDirectory(createIfMissing: false);
                    string figFp = ComputeFileFingerprint(Path.Combine(figDir, "index.json"));
                    if (!string.IsNullOrEmpty(figFp) && figFp == _lastFigFingerprint) return;
                    _lastFigFingerprint = figFp;
                }

                var status = await GetSyncStatusAsync().ConfigureAwait(false);
                object summary = eventType switch
                {
                    "config_changed" => new
                    {
                        provider = ReadInternalConfig().Provider,
                        model = ReadInternalConfig().Model,
                        syncStatus = status
                    },
                    "question_bank_changed" => new
                    {
                        questionBankPath = status.QuestionBankPath,
                        questionCount = status.QuestionCount,
                        schema = status.QuestionBankSchema
                    },
                    "figures_changed" => new
                    {
                        figuresDir = status.FiguresDir,
                        figureCount = status.FigureCount
                    },
                    _ => status
                };

                SyncChanged?.Invoke(eventType, summary);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[MatrixExamSyncService] EmitDebouncedSyncEventAsync({eventType}) error: {ex.Message}");
            }
        }

        private static void DisposeWatcher(ref FileSystemWatcher? watcher)
        {
            if (watcher == null) return;
            try
            {
                watcher.EnableRaisingEvents = false;
                watcher.Dispose();
            }
            catch { }
            watcher = null;
        }

        public void Dispose()
        {
            lock (_watcherLock)
            {
                if (_disposed) return;
                _disposed = true;
                DisposeWatcher(ref _configWatcher);
                DisposeAllQbWatchers();
                DisposeWatcher(ref _figuresWatcher);
                foreach (var timer in _debounceTimers.Values)
                {
                    try { timer.Dispose(); } catch { }
                }
                _debounceTimers.Clear();
            }
        }

        #endregion

        #region Atomic File & Utility Helpers

        private static void WriteAllTextAtomic(string path, string content)
        {
            string? dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            string tmpPath = $"{path}.{Guid.NewGuid():N}.tmp";
            try
            {
                File.WriteAllText(tmpPath, content, Utf8NoBom);
                File.Move(tmpPath, path, overwrite: true);
            }
            catch
            {
                TryDeleteFile(tmpPath);
                throw;
            }
        }

        private static void WriteAllBytesAtomic(string path, byte[] data)
        {
            string? dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            string tmpPath = $"{path}.{Guid.NewGuid():N}.tmp";
            try
            {
                File.WriteAllBytes(tmpPath, data);
                File.Move(tmpPath, path, overwrite: true);
            }
            catch
            {
                TryDeleteFile(tmpPath);
                throw;
            }
        }

        private static void TryDeleteFile(string path)
        {
            try { if (File.Exists(path)) File.Delete(path); } catch { }
        }

        private static string SafeReadAllText(string path)
        {
            try { return File.ReadAllText(path, Encoding.UTF8); } catch { return string.Empty; }
        }

        public static string StripDataUriPrefix(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            string s = input.Trim();
            int commaIdx = s.IndexOf(',');
            if (s.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && commaIdx >= 0)
            {
                return s.Substring(commaIdx + 1).Trim();
            }
            return s;
        }

        private static string Shorten(string text, int maxLen)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            string clean = text.Trim().Replace("\r", " ").Replace("\n", " ");
            return clean.Length <= maxLen ? clean : clean[..maxLen] + "...";
        }

        #endregion
    }
}
