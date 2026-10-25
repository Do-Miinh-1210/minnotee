; Inno Setup Script — MinNote Digital Whiteboard (.NET 10 WPF + Whiteboard Canvas)
#define MyAppName "MinNote"
#define MyAppVersion "1.0.1"
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
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs restartreplace

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\Assets\app.ico"
Name: "{group}\Gỡ cài đặt {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\Assets\app.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Khởi chạy MinNote"; Flags: nowait postinstall skipifsilent

[Code]
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
begin
  sUnInstallString := GetUninstallString(AppIdStr);
  if sUnInstallString <> '' then begin
    sUnInstallString := RemoveQuotes(sUnInstallString);
    Exec(sUnInstallString, '/VERYSILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, iResultCode);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssInstall) then begin
    // Tự động gỡ bỏ sạch sẽ các phiên bản MinNote trước đó trên ổ C
    UnInstallOldVersion('{#MyAppId}');
    UnInstallOldVersion('MinNote');
    UnInstallOldVersion('NoteRenderer');
  end;
end;
