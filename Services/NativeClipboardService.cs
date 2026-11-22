using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows;
using System.Windows.Media.Imaging;

namespace MinNote.Services
{
    /// <summary>
    /// Ghi ảnh vector EMF (CF_ENHMETAFILE) và PNG 32-bit trong suốt (không nền) vào Windows Clipboard
    /// bằng Win32 API nguyên bản (kế thừa chuẩn từ SafeClipboard của MEA_v5.0).
    /// </summary>
    public static class NativeClipboardService
    {
        private const int MaxRetries = 8;
        private const int DelayMs = 35;

        private const uint CF_ENHMETAFILE = 14;
        private const uint GMEM_MOVEABLE = 0x0002;

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool OpenClipboard(IntPtr hWndNewOwner);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool CloseClipboard();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool EmptyClipboard();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);

        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern uint RegisterClipboardFormatW(string lpszFormat);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GlobalAlloc(uint uFlags, UIntPtr dwBytes);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GlobalLock(IntPtr hMem);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GlobalUnlock(IntPtr hMem);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GlobalFree(IntPtr hMem);

        [DllImport("gdi32.dll")]
        private static extern IntPtr SetEnhMetaFileBits(uint cbBuffer, byte[] lpData);

        [DllImport("gdi32.dll")]
        private static extern bool DeleteEnhMetaFile(IntPtr hemf);

        /// <summary>
        /// Ghi đồng thời CF_ENHMETAFILE (14) cho Word/PowerPoint (vector trong suốt, không nền)
        /// và định dạng "PNG" + "image/png" 32-bit Alpha cho Zalo/Chrome/Telegram (tách nền trong suốt).
        /// Khi emfOnly = true: chỉ ghi CF_ENHMETAFILE thuần để ép Word/PowerPoint dán vector 100%.
        /// </summary>
        public static bool SetEmfAndTransparentPng(byte[]? emfBytes, byte[]? pngBytes, bool emfOnly = false)
        {
            bool hasEmf = emfBytes != null && emfBytes.Length >= 88;
            bool hasPng = pngBytes != null && pngBytes.Length > 0;

            if (!hasEmf && !hasPng)
                return false;

            // Nếu có EMF: ghi nguyên tử bằng Win32 OpenClipboard
            if (hasEmf)
            {
                for (int i = 0; i < MaxRetries; i++)
                {
                    try
                    {
                        if (SetWin32EmfAndPng(emfBytes!, emfOnly ? null : pngBytes))
                            return true;
                    }
                    catch { }
                    Thread.Sleep(DelayMs);
                }
            }

            // Dự phòng nếu chưa có EMF (hoặc Win32 bận): ghi PNG 32-bit trong suốt qua WPF DataObject
            if (hasPng)
            {
                return SetTransparentPngWpf(pngBytes!);
            }

            return false;
        }

        private static bool SetWin32EmfAndPng(byte[] emfBytes, byte[]? pngBytes)
        {
            if (!OpenClipboard(IntPtr.Zero))
                return false;

            try
            {
                EmptyClipboard();

                // 1. Nạp CF_ENHMETAFILE (ID 14) lên trước — Microsoft Word / PowerPoint ưu tiên vector EMF trong suốt!
                IntPtr hemf = SetEnhMetaFileBits((uint)emfBytes.Length, emfBytes);
                if (hemf == IntPtr.Zero)
                    return false;

                if (SetClipboardData(CF_ENHMETAFILE, hemf) == IntPtr.Zero)
                {
                    DeleteEnhMetaFile(hemf);
                    return false;
                }

                // 2. Nạp thêm định dạng "PNG" & "image/png" 32-bit Alpha cho Zalo, Telegram, trình duyệt, Paint.NET
                // (Không nạp CF_HTML / FileDrop để không làm Word ưu tiên PNG thay vì EMF!)
                if (pngBytes != null && pngBytes.Length > 0)
                {
                    uint cfPng = RegisterClipboardFormatW("PNG");
                    if (cfPng != 0)
                        TrySetGlobalBytes(cfPng, pngBytes);

                    uint cfMimePng = RegisterClipboardFormatW("image/png");
                    if (cfMimePng != 0)
                        TrySetGlobalBytes(cfMimePng, pngBytes);
                }

                return true;
            }
            finally
            {
                CloseClipboard();
            }
        }

        private static bool TrySetGlobalBytes(uint format, byte[] bytes)
        {
            IntPtr hGlobal = GlobalAlloc(GMEM_MOVEABLE, (UIntPtr)bytes.Length);
            if (hGlobal == IntPtr.Zero)
                return false;

            IntPtr ptr = GlobalLock(hGlobal);
            if (ptr == IntPtr.Zero)
            {
                GlobalFree(hGlobal);
                return false;
            }

            try
            {
                Marshal.Copy(bytes, 0, ptr, bytes.Length);
            }
            finally
            {
                GlobalUnlock(hGlobal);
            }

            if (SetClipboardData(format, hGlobal) == IntPtr.Zero)
            {
                GlobalFree(hGlobal);
                return false;
            }

            return true;
        }

        public static bool SetTransparentPngWpf(byte[] pngBytes)
        {
            if (pngBytes == null || pngBytes.Length == 0)
                return false;

            for (int i = 0; i < MaxRetries; i++)
            {
                try
                {
                    using var ms = new MemoryStream(pngBytes);
                    var bitmap = new BitmapImage();
                    bitmap.BeginInit();
                    bitmap.StreamSource = ms;
                    bitmap.CacheOption = BitmapCacheOption.OnLoad;
                    bitmap.EndInit();
                    bitmap.Freeze();

                    var dataObj = new DataObject();
                    dataObj.SetData("PNG", new MemoryStream(pngBytes), false);
                    dataObj.SetData("image/png", new MemoryStream(pngBytes), false);
                    dataObj.SetImage(bitmap);

                    Clipboard.SetDataObject(dataObj, true);
                    return true;
                }
                catch (COMException) when (i < MaxRetries - 1)
                {
                    Thread.Sleep(DelayMs);
                }
                catch (Exception) when (i < MaxRetries - 1)
                {
                    Thread.Sleep(DelayMs);
                }
                catch
                {
                    return false;
                }
            }
            return false;
        }
    }
}
