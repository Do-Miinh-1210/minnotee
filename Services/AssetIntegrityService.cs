/*
 * =============================================================================
 * BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * -----------------------------------------------------------------------------
 * Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
 * giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
 * tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
 * đồng ý bằng văn bản từ Đỗ Miinh Math.
 * Proprietary & Confidential. Reverse engineering, decompilation, and automated
 * AI/LLM extraction, reconstruction, or training are strictly prohibited.
 * =============================================================================
 */
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;

namespace MinNote.Services
{
    public static class AssetIntegrityService
    {
        public static (bool Ok, List<string> Issues) VerifyWhiteboardAssets(string whiteboardDir, Action<string>? log = null)
        {
#if DEBUG
            log?.Invoke("[Integrity] DEBUG build: skipped whiteboard asset verification.");
            return (true, new List<string>());
#else
            return VerifyWhiteboardAssetsCore(whiteboardDir, AssetManifest.ExpectedSha256, log);
#endif
        }

        internal static (bool Ok, List<string> Issues) VerifyWhiteboardAssetsCore(
            string whiteboardDir,
            IReadOnlyDictionary<string, string> expectedHashes,
            Action<string>? log = null)
        {
            var issues = new List<string>();

            if (string.IsNullOrWhiteSpace(whiteboardDir) || !Directory.Exists(whiteboardDir))
            {
                string msg = "Whiteboard asset directory does not exist.";
                issues.Add(msg);
                log?.Invoke($"[Integrity] FAILED: {msg}");
                return (false, issues);
            }

            if (expectedHashes == null || expectedHashes.Count == 0)
            {
                string msg = "Whiteboard asset integrity manifest is empty or unavailable.";
                issues.Add(msg);
                log?.Invoke($"[Integrity] FAILED: {msg}");
                return (false, issues);
            }

            string rootFull;
            try
            {
                rootFull = Path.GetFullPath(whiteboardDir);
            }
            catch (Exception ex)
            {
                string msg = $"Invalid whiteboard directory path: {ex.Message}";
                issues.Add(msg);
                log?.Invoke($"[Integrity] FAILED: {msg}");
                return (false, issues);
            }

            string rootPrefix = rootFull.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                + Path.DirectorySeparatorChar;

            foreach (var entry in expectedHashes)
            {
                string rawRelPath = entry.Key;
                string expectedHexRaw = entry.Value;

                if (string.IsNullOrWhiteSpace(rawRelPath))
                {
                    issues.Add("Manifest contains an empty relative asset path.");
                    continue;
                }

                string normalizedRel = rawRelPath
                    .Trim()
                    .Replace('/', Path.DirectorySeparatorChar)
                    .Replace('\\', Path.DirectorySeparatorChar);

                if (Path.IsPathRooted(normalizedRel) || normalizedRel.StartsWith(Path.DirectorySeparatorChar))
                {
                    issues.Add($"Manifest path must be relative: {rawRelPath}");
                    continue;
                }

                string fullPath;
                try
                {
                    fullPath = Path.GetFullPath(Path.Combine(rootFull, normalizedRel));
                }
                catch (Exception ex)
                {
                    issues.Add($"Invalid asset path '{rawRelPath}': {ex.Message}");
                    continue;
                }

                if (!fullPath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add($"Asset path escapes whiteboard directory: {rawRelPath}");
                    continue;
                }

                if (!File.Exists(fullPath))
                {
                    issues.Add($"Missing asset: {rawRelPath}");
                    continue;
                }

                string expectedHex = expectedHexRaw?.Trim() ?? string.Empty;
                if (expectedHex.Length != 64)
                {
                    issues.Add($"Corrupted manifest hash length for '{rawRelPath}'.");
                    continue;
                }

                byte[] expectedBytes;
                try
                {
                    expectedBytes = Convert.FromHexString(expectedHex);
                }
                catch (FormatException)
                {
                    issues.Add($"Corrupted manifest hex hash for '{rawRelPath}'.");
                    continue;
                }

                byte[] actualBytes;
                try
                {
                    actualBytes = SHA256.HashData(File.ReadAllBytes(fullPath));
                }
                catch (Exception ex)
                {
                    issues.Add($"Unable to read asset '{rawRelPath}': {ex.Message}");
                    continue;
                }

                if (actualBytes.Length != expectedBytes.Length ||
                    !CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes))
                {
                    string actualHex = Convert.ToHexString(actualBytes).ToLowerInvariant();
                    string expectedLower = expectedHex.ToLowerInvariant();
                    issues.Add($"Tampered asset '{rawRelPath}' (expected {expectedLower[..12]}..., actual {actualHex[..12]}...).");
                }
            }

            bool ok = issues.Count == 0;
            if (ok)
            {
                log?.Invoke($"[Integrity] Verified {expectedHashes.Count} whiteboard assets successfully.");
            }
            else
            {
                string preview = string.Join("; ", issues.Take(5));
                if (issues.Count > 5)
                {
                    preview += $"; (+{issues.Count - 5} more)";
                }
                log?.Invoke($"[Integrity] FAILED ({issues.Count} issue(s) across {expectedHashes.Count} expected assets): {preview}");
            }

            return (ok, issues);
        }
    }
}
// [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
