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
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace MinNote.Services;

public static class HardwareInfoService
{
    private static string? _cachedMachineId;

    public static string GetMachineId()
    {
        if (!string.IsNullOrEmpty(_cachedMachineId))
        {
            return _cachedMachineId;
        }

        string rawUuid = GetHardwareUuid();
        using var sha = SHA256.Create();
        byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(rawUuid));
        string hex = Convert.ToHexString(hash).ToUpperInvariant();

        if (hex.Length >= 12)
        {
            _cachedMachineId = $"{hex[..4]}-{hex.Substring(4, 4)}-{hex.Substring(8, 4)}";
        }
        else
        {
            _cachedMachineId = "MEA-PRO-2026";
        }

        return _cachedMachineId;
    }

    public static string GetMachineDisplay()
    {
        return $"{Environment.MachineName} ({Environment.OSVersion.VersionString})";
    }

    public static string GetHardwareUuid()
    {
        // 1. Windows Registry MachineGuid (đồng bộ 100% cùng MatrixExamAI)
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
            var guid = key?.GetValue("MachineGuid")?.ToString();
            if (!string.IsNullOrWhiteSpace(guid))
            {
                return guid.Trim();
            }
        }
        catch { }

        // 2. Fallback qua MAC Address
        try
        {
            var nics = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces();
            foreach (var nic in nics)
            {
                if (nic.NetworkInterfaceType != System.Net.NetworkInformation.NetworkInterfaceType.Loopback &&
                    nic.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up)
                {
                    var mac = nic.GetPhysicalAddress()?.ToString();
                    if (!string.IsNullOrEmpty(mac) && mac.Length >= 8)
                    {
                        return $"MAC-{mac}";
                    }
                }
            }
        }
        catch { }

        // 3. Fallback tên máy + người dùng
        return $"{Environment.MachineName}-{Environment.UserName}";
    }
}
// [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1).
