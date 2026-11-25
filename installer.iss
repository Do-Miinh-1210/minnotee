; Inno Setup Script — MinNote Digital Whiteboard (.NET 10 WPF + Whiteboard Canvas)
#define MyAppName "MinNote"
#define MyAppVersion "0.0.9.8"
#define MyAppPublisher "Do Minh Math"
#define MyAppURL "https://github.com/Do-Miinh-1210/minnotee"
#define MyAppExeName "MinNote.exe"
#define MyAppId "{{B5A9D214-7E3C-4F9A-81D2-9F1C5E3B8D44}}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
; Cài đặt mặc định vào ổ C: C:\Program Files\MinNote
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=dist\installer
OutputBaseFilename=MinNote_Setup
SetupIconFile=Assets\app.ico
UninstallDisplayIcon={app}\Assets\app.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
SetupLogging=yes
AlwaysShowDirOnReadyPage=yes

[Languages]
Name: "vietnamese"; MessagesFile: "compiler:Default.isl"

[Messages]
vietnamese.ButtonNext=Tiếp tục >
vietnamese.ButtonBack=< Quay lại
vietnamese.ButtonInstall=Cài đặt
vietnamese.ButtonCancel=Hủy bỏ
vietnamese.ButtonFinish=Hoàn tất
vietnamese.WelcomeLabel1=Chào mừng bạn đến với MinNote!
vietnamese.WelcomeLabel2=Trình cài đặt sẽ cài đặt MinNote v{#MyAppVersion} (Bảng viết kỹ thuật số & Sơ đồ tư duy) chính thức vào ổ C hệ thống máy tính.%n%nNhấn "Tiếp tục" để bắt đầu cài đặt.
vietnamese.FinishedHeadingLabel=Hoàn tất cài đặt MinNote!
vietnamese.FinishedLabel=Cài đặt MinNote v{#MyAppVersion} vào ổ C thành công!%n%nBiểu tượng đã được tạo trên Màn hình chính (Desktop) và Start Menu.

[Tasks]
Name: "cleanold"; Description: "Tự động gỡ bỏ phiên bản cũ trước khi cài đặt mới"; GroupDescription: "Nâng cấp hệ thống:"
Name: "desktopicon"; Description: "Tạo biểu tượng MinNote trên Màn hình chính (Desktop)"; GroupDescription: "Biểu tượng lối tắt:"

[Files]
Source: "publish_selfcontained\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs restartreplace

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\Assets\app.ico"
Name: "{group}\Gỡ cài đặt {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\Assets\app.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Khởi chạy MinNote"; Flags: nowait postinstall skipifsilent runasoriginaluser
Filename: "{app}\{#MyAppExeName}"; Flags: nowait skipifnotsilent runasoriginaluser; Check: ShouldAutoLaunchSilent

[Code]
function HasSwitch(const SwitchName: String): Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := 1 to ParamCount do begin
    if CompareText(ParamStr(I), SwitchName) = 0 then begin
      Result := True;
      Exit;
    end;
  end;
end;

function ShouldAutoLaunchSilent(): Boolean;
begin
  Result := (WizardSilent() and (not HasSwitch('/VERYSILENT'))) or HasSwitch('/AUTORELAUNCH');
end;

procedure EnsureMinNoteClosed();
var
  iResultCode: Integer;
begin
  // Yêu cầu MinNote đóng nhẹ nhàng trước để kịp lưu bảng viết & các sheet rồi mới đóng cưỡng bức nếu còn kẹt
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/IM {#MyAppExeName}', '', SW_HIDE, ewWaitUntilTerminated, iResultCode);
  Sleep(1200);
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM {#MyAppExeName}', '', SW_HIDE, ewWaitUntilTerminated, iResultCode);
  Sleep(600);
end;

function GetUninstallString(AppIdStr: String): String;
var
  sUnInstPath: String;
  sUnInstallString: String;
begin
  sUnInstallString := '';
  sUnInstPath := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + AppIdStr + '_is1';
  if not RegQueryStringValue(HKLM, sUnInstPath, 'UninstallString', sUnInstallString) then
    if not RegQueryStringValue(HKCU, sUnInstPath, 'UninstallString', sUnInstallString) then
      if not RegQueryStringValue(HKLM64, sUnInstPath, 'UninstallString', sUnInstallString) then
        RegQueryStringValue(HKCU64, sUnInstPath, 'UninstallString', sUnInstallString);
  Result := sUnInstallString;
end;

procedure UnInstallOldVersion(AppIdStr: String);
var
  sUnInstallString: String;
  iResultCode: Integer;
  Retries: Integer;
begin
  sUnInstallString := GetUninstallString(AppIdStr);
  if sUnInstallString <> '' then begin
    sUnInstallString := RemoveQuotes(sUnInstallString);
    if FileExists(sUnInstallString) then begin
      Exec(sUnInstallString, '/VERYSILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, iResultCode);
      // Trình gỡ Inno tự nhân bản ra %TEMP% và thoát ngay; đợi tiến trình gỡ bỏ xóa xong hẳn rồi mới cài mới để tránh xung đột ghi file
      Retries := 0;
      while FileExists(sUnInstallString) and (Retries < 40) do begin
        Sleep(250);
        Retries := Retries + 1;
      end;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssInstall) then begin
    EnsureMinNoteClosed();
    // Chỉ gỡ các AppId cũ khác mã định danh; cùng AppId {#MyAppId} được Inno Setup nâng cấp ghi đè trực tiếp an toàn không race condition
    UnInstallOldVersion('MinNote');
    UnInstallOldVersion('NoteRenderer');
  end;
end;
