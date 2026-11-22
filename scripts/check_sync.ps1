# MinNote - compare a local folder with the files on GitHub (branch main by default).
#
# Run inside the project folder (for example M:\IT\Minnote), no download needed:
#   irm https://raw.githubusercontent.com/Do-Miinh-1210/minnotee/main/scripts/check_sync.ps1 | iex
# Optional, before running:  $Root = 'M:\IT\Minnote';  $Ref = 'main'
#
# Each local file is hashed the way git does (blob SHA-1) and compared with the GitHub tree.
# Text files that differ only in line endings (CRLF vs LF) count as the same.
& {
  $ErrorActionPreference = 'Stop'
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  $repo = 'Do-Miinh-1210/minnotee'
  $dir = if ($Root) { $Root } else { (Get-Location).Path }
  $branch = if ($Ref) { $Ref } else { 'main' }
  $dir = (Resolve-Path -LiteralPath $dir).Path.TrimEnd('\')
  $headers = @{ 'User-Agent' = 'MinNote-check-sync' }

  Write-Host "Dang lay danh sach file tren GitHub ($repo, $branch)..." -ForegroundColor Cyan
  $commit = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/commits/$branch" -Headers $headers
  $tree = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/git/trees/$($commit.sha)?recursive=1" -Headers $headers
  if ($tree.truncated) { Write-Host 'Canh bao: GitHub tra ve danh sach bi cat bot.' -ForegroundColor Yellow }
  $blobs = @($tree.tree | Where-Object { $_.type -eq 'blob' })

  $latin1 = [Text.Encoding]::GetEncoding(28591)
  $sha1 = [Security.Cryptography.SHA1]::Create()
  function BlobSha([byte[]]$b) {
    $hdr = [Text.Encoding]::ASCII.GetBytes("blob $($b.Length)`0")
    [void]$sha1.TransformBlock($hdr, 0, $hdr.Length, $null, 0)
    [void]$sha1.TransformFinalBlock($b, 0, $b.Length)
    ($sha1.Hash | ForEach-Object { $_.ToString('x2') }) -join ''
  }
  # Latin-1 keeps every byte, so CRLF -> LF on the string and back is lossless
  function ToLF([byte[]]$b) { ,$latin1.GetBytes($latin1.GetString($b).Replace("`r`n", "`n")) }

  $same = 0; $diff = @(); $missing = @(); $known = @{}
  $i = 0
  foreach ($item in $blobs) {
    $i++
    Write-Progress -Activity 'So sanh file' -Status $item.path -PercentComplete ([int](100 * $i / $blobs.Count))
    $rel = $item.path.Replace('/', '\')
    $known[$rel.ToLower()] = $true
    $path = Join-Path $dir $rel
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $missing += $item.path; continue }
    $bytes = [IO.File]::ReadAllBytes($path)
    if ((BlobSha $bytes) -eq $item.sha) { $same++; continue }
    if ((BlobSha (ToLF $bytes)) -eq $item.sha) { $same++; continue }
    $diff += $item.path
  }
  Write-Progress -Activity 'So sanh file' -Completed

  $skip = '\\(\.git|bin|obj|publish|publish_selfcontained|dist|node_modules|\.vs)\\'
  $extra = @(Get-ChildItem -LiteralPath $dir -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($dir.Length + 1)
    if (("\" + $rel) -notmatch $skip -and -not $known.ContainsKey($rel.ToLower())) { $rel }
  })

  Write-Host ''
  Write-Host ("Thu muc: {0}" -f $dir)
  Write-Host ("So voi GitHub {0} (commit {1}), tong {2} file:" -f $branch, $commit.sha.Substring(0, 7), $blobs.Count) -ForegroundColor Cyan
  Write-Host ("  Giong nhau : {0}" -f $same) -ForegroundColor Green
  Write-Host ("  Khac nhau  : {0}" -f $diff.Count) -ForegroundColor $(if ($diff.Count) { 'Yellow' } else { 'Green' })
  $diff | ForEach-Object { Write-Host "     ~ $_" -ForegroundColor Yellow }
  Write-Host ("  Thieu      : {0}" -f $missing.Count) -ForegroundColor $(if ($missing.Count) { 'Red' } else { 'Green' })
  $missing | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
  Write-Host ("  Chi co tren may (khong co tren GitHub): {0}" -f $extra.Count) -ForegroundColor Gray
  $extra | Select-Object -First 30 | ForEach-Object { Write-Host "     + $_" -ForegroundColor Gray }
  if ($extra.Count -gt 30) { Write-Host ("     ... va {0} file khac" -f ($extra.Count - 30)) -ForegroundColor Gray }
  Write-Host ''
  if (-not $diff.Count -and -not $missing.Count) { Write-Host 'KET QUA: Thu muc tren may GIONG het GitHub.' -ForegroundColor Green }
  else { Write-Host 'KET QUA: Thu muc tren may CHUA giong GitHub (xem danh sach o tren).' -ForegroundColor Yellow }
}
